// 이력 관리 관련 로직
export function useExperienceLogic() {
    // 이력 저장
    async function saveExperience(e, form, selectedImages, editingIndex, experiences, spreadsheetId, sheetsService, driveService, authService, setExperiences, setIsExperienceLoading, closeModal, existingImageUrls = []) {
        e.preventDefault();
        if (form.title && form.startDate && form.endDate && form.description) {
            // 날짜 유효성 검사
            if (!validateDates(form.startDate, form.endDate)) {
                return;
            }

            try {
                setIsExperienceLoading(true);

                let newImageUrls = [];
                // 1. 새 이미지가 있다면 드라이브에 병렬 업로드 (성능 최적화)
                if (selectedImages.length > 0) {
                    newImageUrls = await uploadMultipleImagesToDrive(selectedImages, form.title, driveService, authService);
                }

                const period = formatPeriod(form.startDate, form.endDate);
                let experienceToSave;

                if (editingIndex !== null) {
   
                    // 삭제되지 않은 기존 이미지 URL들만 사용
                    const remainingExistingUrls = existingImageUrls || [];
                    
                    // 삭제된 이미지 파일들을 드라이브에서도 삭제
                    const originalImageUrls = experiences[editingIndex].imageUrls || [];
                    const deletedImageUrls = originalImageUrls.filter(url => !remainingExistingUrls.includes(url));
                    
                    if (deletedImageUrls.length > 0) {
                        await deleteImageFiles(deletedImageUrls, driveService);
                    }

                    experienceToSave = {
                        ...form,
                        period,
                        // 삭제되지 않은 기존 이미지 URL과 새로 업로드한 이미지 URL을 합칩니다.
                        imageUrls: remainingExistingUrls.concat(newImageUrls)
                    };

                    const rowNumber = editingIndex + 2;
                    if (spreadsheetId && sheetsService.current) {
                        const sheetData = sheetsService.current.formatExperienceForSheet(experienceToSave);
                        await sheetsService.current.updateData(spreadsheetId, `A${rowNumber}:E${rowNumber}`, [sheetData]);
                    }
                    setExperiences(prev => prev.map((exp, i) => i === editingIndex ? experienceToSave : exp));

                } else {
                    // ⭐ 등록 모드 (Creation Mode)
                    experienceToSave = {
                        ...form,
                        period,
                        imageUrls: newImageUrls // 새 이력은 새로 업로드한 이미지 URL만 가집니다.
                    };

                    // 1. 구글 시트 추가
                    if (spreadsheetId && sheetsService.current) {
                        const sheetData = sheetsService.current.formatExperienceForSheet(experienceToSave);
                        await sheetsService.current.appendData(spreadsheetId, 'A:E', [sheetData]);
                    }

                    // 2. ⭐ 로컬 상태에 새 이력 추가 (정확히 새 이력 객체만 추가) ⭐
                    // 이 코드가 이력을 성공적으로 추가하고 화면에 남아있도록 보장합니다.
                    setExperiences(prev => [...prev, experienceToSave]);
                }

                closeModal();
            } catch (error) {
                console.error('이력 저장/수정 오류:', error);
                const errorMessage = sheetsService.current?.formatErrorMessage(error) || '이력 저장/수정에 실패했습니다.';
                alert(errorMessage);
            } finally {
                setIsExperienceLoading(false);
            }
        }
    }

    // 기간 포맷팅 함수
    function formatPeriod(startDate, endDate) {
        if (!startDate || !endDate) return '';

        const start = new Date(startDate);
        const end = new Date(endDate);

        // 시작일과 종료일이 같은 경우 (하루짜리)
        if (start.toDateString() === end.toDateString()) {
            const year = start.getFullYear();
            const month = String(start.getMonth() + 1).padStart(2, '0');
            const day = String(start.getDate()).padStart(2, '0');
            return `${year}.${month}.${day}`;
        }

        // 여러 기간인 경우
        const startYear = start.getFullYear();
        const startMonth = String(start.getMonth() + 1).padStart(2, '0');
        const startDay = String(start.getDate()).padStart(2, '0');
        const endYear = end.getFullYear();
        const endMonth = String(end.getMonth() + 1).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');

        return `${startYear}.${startMonth}.${startDay} - ${endYear}.${endMonth}.${endDay}`;
    }

    // 날짜 유효성 검사 함수
    function validateDates(startDate, endDate) {
        if (!startDate || !endDate) return false;

        const start = new Date(startDate);
        const end = new Date(endDate);

        // 시작일이 종료일보다 늦으면 안됨
        if (start > end) {
            alert('시작일은 종료일보다 이전이어야 합니다.');
            return false;
        }

        return true;
    }

    // 이미지를 구글 드라이브에 업로드하고 공개 링크 생성 (초고속 버전)
    async function uploadImageToDrive(imageFile, experienceTitle, driveService, authService, folderCache = null) {
        if (!driveService.current) {
            throw new Error('구글 드라이브 서비스가 초기화되지 않았습니다.');
        }

        try {
            let portfolioFolder, imageFolder, experienceFolder;
            
            // 폴더 캐시가 있으면 사용, 없으면 새로 생성
            if (folderCache) {
                ({ portfolioFolder, imageFolder, experienceFolder } = folderCache);
            } else {
                // 포트폴리오 이력 폴더와 이미지 폴더 확인/생성
                portfolioFolder = await driveService.current.ensurePortfolioFolder();
                imageFolder = await driveService.current.ensureImageFolder(portfolioFolder.id);
                // 이력별 이미지 폴더 생성 또는 찾기
                experienceFolder = await driveService.current.ensureExperienceImageFolder(experienceTitle, imageFolder.id);
            }

            // 해당 이력 폴더의 기존 파일 목록 가져오기
            const existingFiles = await driveService.current.getFilesInFolder(experienceFolder.id);
            
            // 순차적 번호가 포함된 파일명 생성
            const finalFileName = driveService.current.generateSequentialFileName(imageFile.name, existingFiles);

            // 이미지 파일을 해당 이력 폴더에 업로드
            const uploadResult = await driveService.current.uploadFile(
                finalFileName,
                imageFile,
                imageFile.type,
                experienceFolder.id
            );

            if (!uploadResult.id) {
                throw new Error('이미지 업로드에 실패했습니다.');
            }

            // 파일을 공개로 설정 (비동기로 처리하여 대기 시간 제거)
            const gapiClient = authService.current.getAuthenticatedGapiClient();
            gapiClient.drive.permissions.create({
                fileId: uploadResult.id,
                resource: {
                    role: 'reader',
                    type: 'anyone'
                }
            }).then(() => {
            }).catch(error => {
                console.warn('공개 권한 설정 실패 (무시됨):', error);
            });

            // 대기 시간 완전 제거 - 즉시 URL 반환
            const directUrl = `https://drive.google.com/uc?export=view&id=${uploadResult.id}`;
            return directUrl;
        } catch (error) {
            console.error('이미지 업로드 오류:', error);
            throw new Error('이미지를 구글 드라이브에 업로드하는데 실패했습니다.');
        }
    }

    // 이미지 압축 함수 (업로드 속도 향상을 위해)
    async function compressImage(file, maxWidth = 1920, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // 원본 비율 유지하면서 크기 조정
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                const newWidth = img.width * ratio;
                const newHeight = img.height * ratio;
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                // 이미지 그리기
                ctx.drawImage(img, 0, 0, newWidth, newHeight);
                
                // 압축된 이미지를 Blob으로 변환
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, file.type, quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    // 폴더 구조 캐시 (전역 캐시)
    let folderCache = null;
    let cacheTimestamp = 0;
    const CACHE_DURATION = 30 * 60 * 1000; // 30분으로 연장
    let isPreloading = false; // 프리로딩 중인지 확인

    // 폴더 구조를 미리 프리로딩하는 함수
    async function preloadFolderStructure(driveService) {
        // driveService가 유효한지 확인
        if (!driveService || !driveService.current) {
            console.warn('driveService가 초기화되지 않았습니다. 프리로딩을 건너뜁니다.');
            return null;
        }

        if (isPreloading || folderCache) {
            return folderCache;
        }

        isPreloading = true;
        const startTime = Date.now();

        try {
            // 기본 폴더 구조만 미리 생성
            const portfolioFolder = await driveService.current.ensurePortfolioFolder();
            const imageFolder = await driveService.current.ensureImageFolder(portfolioFolder.id);
            
            folderCache = { 
                portfolioFolder, 
                imageFolder, 
                experienceFolder: null // 이력별 폴더는 필요할 때 생성
            };
            cacheTimestamp = Date.now();
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
        } catch (error) {
            console.error('폴더 구조 프리로딩 실패:', error);
        } finally {
            isPreloading = false;
        }

        return folderCache;
    }

    // 폴더 구조를 미리 캐싱하는 함수
    async function ensureFolderCache(experienceTitle, driveService) {
        const now = Date.now();
        
        // 캐시가 유효한지 확인 (30분 이내)
        if (folderCache && (now - cacheTimestamp) < CACHE_DURATION) {
            
            // 이력별 폴더가 없으면 생성
            if (!folderCache.experienceFolder) {
                folderCache.experienceFolder = await driveService.current.ensureExperienceImageFolder(
                    experienceTitle, 
                    folderCache.imageFolder.id
                );
            }
            
            return folderCache;
        }

        const startTime = Date.now();
        
        // 포트폴리오와 이미지 폴더는 병렬로 처리
        const [portfolioFolder, imageFolder] = await Promise.all([
            driveService.current.ensurePortfolioFolder(),
            driveService.current.ensureImageFolder(null).then(async (folder) => {
                if (!folder) {
                    const portfolio = await driveService.current.ensurePortfolioFolder();
                    return await driveService.current.ensureImageFolder(portfolio.id);
                }
                return folder;
            })
        ]);
        
        // 이력별 폴더는 별도로 생성
        const experienceFolder = await driveService.current.ensureExperienceImageFolder(
            experienceTitle, 
            imageFolder.id
        );
        
        folderCache = { portfolioFolder, imageFolder, experienceFolder };
        cacheTimestamp = now;
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        return folderCache;
    }

    // 단일 이미지 업로드 함수
    async function uploadSingleImageFast(imageFile, experienceTitle, driveService, authService) {
        if (!driveService.current) {
            throw new Error('구글 드라이브 서비스가 초기화되지 않았습니다.');
        }

        try {
            const startTime = Date.now();
            
            // 폴더 구조를 최적화된 방식으로 생성
            let experienceFolder;
            
            // 캐시된 폴더가 있으면 즉시 사용
            if (folderCache && folderCache.experienceFolder && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
                experienceFolder = folderCache.experienceFolder;
            } else {
                // 병렬로 폴더 구조 생성
                const [portfolioFolder, imageFolder] = await Promise.all([
                    driveService.current.ensurePortfolioFolder(),
                    driveService.current.ensureImageFolder()
                ]);
                
                let finalImageFolder = imageFolder;
                
                // 이미지 폴더가 없으면 포트폴리오 폴더 하위에 생성
                if (!imageFolder) {
                    finalImageFolder = await driveService.current.ensureImageFolder(portfolioFolder.id);
                }
                
                experienceFolder = await driveService.current.ensureExperienceImageFolder(experienceTitle, finalImageFolder.id);
                
                // 캐시 업데이트
                folderCache = { portfolioFolder, imageFolder: finalImageFolder, experienceFolder };
                cacheTimestamp = Date.now();
            }
            
            // 파일명을 타임스탬프 기반으로 단순화
            const timestamp = Date.now();
            const fileExtension = imageFile.name.split('.').pop() || 'jpg';
            const finalFileName = `${experienceTitle}_${timestamp}.${fileExtension}`;

            // 이미지 압축 (500KB 이상인 경우 압축)
            let processedFile = imageFile;
            if (imageFile.size > 500 * 1024) {
                processedFile = await compressImage(imageFile, 1200, 0.6); // 더 작은 크기, 더 낮은 품질
            }

            // 파일 업로드
            const uploadResult = await driveService.current.uploadFile(
                finalFileName,
                processedFile,
                processedFile.type,
                experienceFolder.id
            );

            if (!uploadResult.id) {
                throw new Error('이미지 업로드에 실패했습니다.');
            }

            const directUrl = `https://drive.google.com/uc?export=view&id=${uploadResult.id}`;
            return directUrl;
        } catch (error) {
            console.error('단일 이미지 업로드 오류:', error);
            throw new Error('이미지를 구글 드라이브에 업로드하는데 실패했습니다.');
        }
    }

    // 여러 이미지를 병렬로 업로드하는 함수
    async function uploadMultipleImagesToDrive(imageFiles, experienceTitle, driveService, authService) {
        if (!driveService.current) {
            throw new Error('구글 드라이브 서비스가 초기화되지 않았습니다.');
        }

        if (!imageFiles || imageFiles.length === 0) {
            return [];
        }

        // 단일 이미지인 경우 최적화된 단일 업로드 사용
        if (imageFiles.length === 1) {
            return [await uploadSingleImageFast(imageFiles[0], experienceTitle, driveService, authService)];
        }

        try {
            const startTime = Date.now();
            
            // 폴더 구조 캐시 사용
            const folderCache = await ensureFolderCache(experienceTitle, driveService);
            const { experienceFolder } = folderCache;
            
            // 해당 이력 폴더의 기존 파일 목록을 한 번만 가져오기
            const existingFiles = await driveService.current.getFilesInFolder(experienceFolder.id);
            
            // 이미지 압축을 병렬로 처리 (대용량 이미지의 경우)
            const compressionPromises = imageFiles.map(async (imageFile) => {
                // 2MB 이상의 이미지만 압축
                if (imageFile.size > 2 * 1024 * 1024) {
                    return await compressImage(imageFile);
                }
                return imageFile;
            });
            
            const compressedFiles = await Promise.all(compressionPromises);
            
            // 파일명을 미리 생성하여 중복 확인 최적화
            const filesWithNames = compressedFiles.map(imageFile => {
                const finalFileName = driveService.current.generateSequentialFileName(imageFile.name, existingFiles);
                return {
                    name: finalFileName,
                    file: imageFile,
                    mimeType: imageFile.type
                };
            });
            
            // 구글 드라이브 서비스의 다중 파일 업로드 사용
            const uploadResults = await driveService.current.uploadMultipleFiles(filesWithNames, experienceFolder.id);
            
            // 업로드된 파일들의 공개 URL 생성
            const imageUrls = uploadResults
                .filter(result => result.id)
                .map(result => `https://drive.google.com/uc?export=view&id=${result.id}`);
            
            return imageUrls;
        } catch (error) {
            console.error('다중 이미지 업로드 오류:', error);
            throw new Error('이미지들을 구글 드라이브에 업로드하는데 실패했습니다.');
        }
    }

    // 이미지 URL에서 파일 ID 추출하는 헬퍼 함수
    function extractFileIdFromImageUrl(imageUrl) {
        // Base64 데이터 URL인 경우 null 반환 (로컬 파일)
        if (imageUrl.startsWith('data:')) {
            return null;
        }
        
        // Google Drive 직접 링크 URL에서 파일 ID 추출
        // 예: https://drive.google.com/uc?export=view&id=FILE_ID
        const ucMatch = imageUrl.match(/[?&]id=([^&]+)/);
        if (ucMatch) {
            return ucMatch[1];
        }
        
        // Google Drive 썸네일 URL에서 파일 ID 추출
        // 예: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
        const thumbnailMatch = imageUrl.match(/thumbnail\?id=([^&]+)/);
        if (thumbnailMatch) {
            return thumbnailMatch[1];
        }
        
        // Google Drive 파일 URL에서 파일 ID 추출
        // 예: https://drive.google.com/file/d/FILE_ID/view
        const fileMatch = imageUrl.match(/\/file\/d\/([^\/]+)/);
        if (fileMatch) {
            return fileMatch[1];
        }
        
        // Google Drive 공유 링크에서 파일 ID 추출
        // 예: https://drive.google.com/open?id=FILE_ID
        const openMatch = imageUrl.match(/open\?id=([^&]+)/);
        if (openMatch) {
            return openMatch[1];
        }
        
        // 일반적인 파일 ID 패턴 (25자 이상의 영숫자와 하이픈)
        const generalMatch = imageUrl.match(/[-\w]{25,}/);
        if (generalMatch) {
            return generalMatch[0];
        }
        
        return null;
    }

    // 이미지 파일들을 삭제하는 헬퍼 함수
    async function deleteImageFiles(imageUrls, driveService) {
        if (!imageUrls || imageUrls.length === 0 || !driveService.current) {
            return;
        }
        
        
        const deletePromises = imageUrls.map(async (imageUrl) => {
            try {
                const fileId = extractFileIdFromImageUrl(imageUrl);
                if (fileId) {
                    await driveService.current.deleteFile(fileId);
                    return { success: true, fileId, url: imageUrl };
                } else {
                    console.warn('파일 ID를 추출할 수 없습니다:', imageUrl);
                    return { success: false, fileId: null, url: imageUrl, error: '파일 ID 추출 실패' };
                }
            } catch (error) {
                console.error('이미지 파일 삭제 실패:', imageUrl, error);
                return { success: false, fileId: null, url: imageUrl, error: error.message };
            }
        });
        
        const results = await Promise.allSettled(deletePromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;
        
        
        if (failed > 0) {
            console.warn('일부 이미지 파일 삭제에 실패했습니다. 실패한 파일들:', 
                results.filter(r => r.status === 'fulfilled' && !r.value.success).map(r => r.value.url));
        }
    }

    // 이력 폴더를 삭제하는 헬퍼 함수
    async function deleteExperienceFolder(experienceTitle, driveService, portfolioFolderId) {
        if (!experienceTitle || !driveService.current || !portfolioFolderId) {
            return;
        }
        
        try {
            
            // 포트폴리오 이력 폴더 내에서 image 폴더 찾기
            const files = await driveService.current.getFilesInFolder(portfolioFolderId);
            
            const imageFolder = files.find(file => 
                file.name === 'image' && 
                file.mimeType === 'application/vnd.google-apps.folder'
            );
            
            if (!imageFolder) {
                return;
            }
            
            
            // image 폴더 내에서 해당 이력 폴더 찾기
            const imageFiles = await driveService.current.getFilesInFolder(imageFolder.id);
            
            // 정확한 이름으로 먼저 찾기
            let experienceFolder = imageFiles.find(file => 
                file.name === experienceTitle && 
                file.mimeType === 'application/vnd.google-apps.folder'
            );
            
            // 정확한 이름으로 찾지 못했다면 부분 일치로 찾기
            if (!experienceFolder) {
                experienceFolder = imageFiles.find(file => 
                    file.name.includes(experienceTitle) && 
                    file.mimeType === 'application/vnd.google-apps.folder'
                );
            }
            
            // 여전히 찾지 못했다면 대소문자 무시하고 찾기
            if (!experienceFolder) {
                experienceFolder = imageFiles.find(file => 
                    file.name.toLowerCase() === experienceTitle.toLowerCase() && 
                    file.mimeType === 'application/vnd.google-apps.folder'
                );
            }
            
            if (experienceFolder) {
                await driveService.current.deleteFile(experienceFolder.id);
            } else {
            }
        } catch (error) {
            console.error('이력 폴더 삭제 실패:', experienceTitle, error);
            // 폴더 삭제 실패해도 전체 프로세스는 계속 진행
        }
    }

    // 선택된 이력 삭제
    async function deleteSelectedExperiences(selected, experiences, sheetsService, spreadsheetId, isSheetsInitialized, driveService, portfolioFolderId, setExperiences, setSelected, setIsExperienceLoading) {
        if (selected.length === 0 || !sheetsService.current) return;

        if (!window.confirm('선택된 이력을 삭제하시겠습니까?')) return;

        try {
            setIsExperienceLoading(true);

            // 삭제할 이력들의 이미지 URL과 제목 수집
            const imagesToDelete = [];
            const foldersToDelete = [];
            for (const index of selected) {
                const exp = experiences[index];
                if (exp.imageUrls && exp.imageUrls.length > 0) {
                    imagesToDelete.push(...exp.imageUrls);
                }
                if (exp.title) {
                    foldersToDelete.push(exp.title);
                }
            }

            // 선택된 이력들을 구글 시트에서 삭제
            if (spreadsheetId && isSheetsInitialized) {
                // 선택된 행들을 역순으로 정렬하여 삭제 (인덱스가 변경되지 않도록)
                const sortedSelected = [...selected].sort((a, b) => b - a);

                for (const index of sortedSelected) {
                    // 헤더 + 선택된 인덱스 + 1 (시트는 1부터 시작)
                    const rowNumber = index + 2;
                    await sheetsService.current.deleteData(spreadsheetId, `A${rowNumber}:E${rowNumber}`);
                }
            }

            // 이미지 파일들 삭제
            if (imagesToDelete.length > 0) {
                await deleteImageFiles(imagesToDelete, driveService);
            }

            // 이력 폴더들 삭제
            if (foldersToDelete.length > 0) {
                const folderDeletePromises = foldersToDelete.map(folderName => 
                    deleteExperienceFolder(folderName, driveService, portfolioFolderId)
                );
                await Promise.allSettled(folderDeletePromises);
            }

            // 로컬 상태에서도 삭제
            const newExperiences = experiences.filter((_, idx) => !selected.includes(idx));
            setExperiences(newExperiences);
            setSelected([]);

        } catch (error) {
            console.error('이력 삭제 오류:', error);
            const errorMessage = sheetsService.current?.formatErrorMessage(error) || '이력 삭제에 실패했습니다.';
            alert(errorMessage);
        } finally {
            setIsExperienceLoading(false);
        }
    }

    // 개별 이력 삭제
    async function deleteIndividualExperience(indexToDelete, experiences, sheetsService, spreadsheetId, driveService, portfolioFolderId, setExperiences, setSelected, setIsExperienceLoading) {
        const expToDelete = experiences[indexToDelete];

        if (!window.confirm(`"${expToDelete.title}" 이력을 정말로 삭제하시겠습니까?`)) {
            return;
        }

        try {
            setIsExperienceLoading(true);

            // 삭제할 이력의 이미지 URL 수집
            const imagesToDelete = expToDelete.imageUrls || [];

            if (spreadsheetId && sheetsService.current) {
                // 헤더(1행) + 인덱스(0부터 시작) + 1 = 실제 시트 행 번호
                const rowNumber = indexToDelete + 2;

                // 시트에서 해당 행 삭제
                await sheetsService.current.deleteData(spreadsheetId, `A${rowNumber}:E${rowNumber}`);
            }

            // 이미지 파일들 삭제
            if (imagesToDelete.length > 0) {
                await deleteImageFiles(imagesToDelete, driveService);
            }

            // 이력 폴더 삭제
            if (expToDelete.title) {
                await deleteExperienceFolder(expToDelete.title, driveService, portfolioFolderId);
            } else {
            }

            // 로컬 상태에서도 삭제
            const newExperiences = experiences.filter((_, idx) => idx !== indexToDelete);
            setExperiences(newExperiences);

            // 선택된 목록도 갱신 (선택된 이력이 삭제되었을 경우를 대비)
            setSelected([]);

            alert('이력이 삭제되었습니다!');

        } catch (error) {
            console.error('개별 이력 삭제 오류:', error);
            const errorMessage = sheetsService.current?.formatErrorMessage(error) || '이력 삭제에 실패했습니다.';
            alert(errorMessage);
        } finally {
            setIsExperienceLoading(false);
        }
    }

    return {
        saveExperience,
        formatPeriod,
        validateDates,
        uploadImageToDrive,
        uploadMultipleImagesToDrive,
        uploadSingleImageFast,
        compressImage,
        ensureFolderCache,
        preloadFolderStructure,
        extractFileIdFromImageUrl,
        deleteImageFiles,
        deleteExperienceFolder,
        deleteSelectedExperiences,
        deleteIndividualExperience
    };
}
