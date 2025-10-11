// 이력 관리 관련 로직
export function useExperienceLogic() {
    // 이력 저장
    async function saveExperience(e, form, selectedImages, editingIndex, experiences, spreadsheetId, sheetsService, driveService, authService, setExperiences, setIsExperienceLoading, closeModal) {
        e.preventDefault();
        if (form.title && form.startDate && form.endDate && form.description) {
            // 날짜 유효성 검사
            if (!validateDates(form.startDate, form.endDate)) {
                return;
            }

            try {
                setIsExperienceLoading(true);

                let newImageUrls = [];
                // 1. 새 이미지가 있다면 드라이브에 업로드
                if (selectedImages.length > 0) {
                    for (const imageFile of selectedImages) {
                        const imageUrl = await uploadImageToDrive(imageFile, form.title, driveService, authService);
                        newImageUrls.push(imageUrl);
                    }
                }

                const period = formatPeriod(form.startDate, form.endDate);
                let experienceToSave;

                if (editingIndex !== null) {
                    // ⭐ 수정 모드 (Editing Mode)
                    const existingImageUrls = experiences[editingIndex].imageUrls || [];

                    experienceToSave = {
                        ...form,
                        period,
                        // 기존 이미지 URL에 새로 업로드한 이미지 URL을 합칩니다.
                        imageUrls: existingImageUrls.concat(newImageUrls)
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

    // 이미지를 구글 드라이브에 업로드하고 공개 링크 생성
    async function uploadImageToDrive(imageFile, experienceTitle, driveService, authService) {
        if (!driveService.current) {
            throw new Error('구글 드라이브 서비스가 초기화되지 않았습니다.');
        }

        try {
            // 포트폴리오 이력 폴더와 이미지 폴더 확인/생성
            const portfolioFolder = await driveService.current.ensurePortfolioFolder();
            const imageFolder = await driveService.current.ensureImageFolder(portfolioFolder.id);

            // 이력별 이미지 폴더 생성 또는 찾기
            const experienceFolder = await driveService.current.ensureExperienceImageFolder(experienceTitle, imageFolder.id);

            // 해당 이력 폴더의 기존 파일 목록 가져오기
            const existingFiles = await driveService.current.getFilesInFolder(experienceFolder.id);
            
            // 순차적 번호가 포함된 파일명 생성
            const finalFileName = driveService.current.generateSequentialFileName(imageFile.name, existingFiles);
            console.log(`원본 파일명: ${imageFile.name} → 최종 파일명: ${finalFileName}`);

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

            // 파일을 공개로 설정 (링크 공유 가능하게)
            const gapiClient = authService.current.getAuthenticatedGapiClient();
            await gapiClient.drive.permissions.create({
                fileId: uploadResult.id,
                resource: {
                    role: 'reader',
                    type: 'anyone'
                }
            });

            // 권한 설정 후 충분한 대기 시간 (권한 변경이 반영되도록)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 직접 링크 URL 반환 (공개 권한이 설정된 후 더 안정적)
            const directUrl = `https://drive.google.com/uc?export=view&id=${uploadResult.id}`;
            console.log('생성된 이미지 URL (직접 링크):', directUrl);
            return directUrl;
        } catch (error) {
            console.error('이미지 업로드 오류:', error);
            throw new Error('이미지를 구글 드라이브에 업로드하는데 실패했습니다.');
        }
    }

    // 이미지 URL에서 파일 ID 추출하는 헬퍼 함수
    function extractFileIdFromImageUrl(imageUrl) {
        try {
            // Google Drive 썸네일 URL에서 파일 ID 추출
            // 예: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
            const match = imageUrl.match(/[?&]id=([^&]+)/);
            if (match) {
                return match[1];
            }
            
            // 직접 파일 URL에서 파일 ID 추출
            // 예: https://drive.google.com/file/d/FILE_ID/view
            const directMatch = imageUrl.match(/\/file\/d\/([^\/]+)/);
            if (directMatch) {
                return directMatch[1];
            }
            
            return null;
        } catch (error) {
            console.error('파일 ID 추출 오류:', error);
            return null;
        }
    }

    // 이미지 파일들을 삭제하는 헬퍼 함수
    async function deleteImageFiles(imageUrls, driveService) {
        if (!imageUrls || imageUrls.length === 0 || !driveService.current) return;
        
        const deletePromises = imageUrls.map(async (imageUrl) => {
            try {
                const fileId = extractFileIdFromImageUrl(imageUrl);
                if (fileId) {
                    console.log('이미지 파일 삭제 시도:', fileId);
                    await driveService.current.deleteFile(fileId);
                    console.log('이미지 파일 삭제 완료:', fileId);
                }
            } catch (error) {
                console.error('이미지 파일 삭제 실패:', imageUrl, error);
                // 개별 이미지 삭제 실패해도 전체 프로세스는 계속 진행
            }
        });
        
        await Promise.allSettled(deletePromises);
    }

    // 이력 폴더를 삭제하는 헬퍼 함수
    async function deleteExperienceFolder(experienceTitle, driveService, portfolioFolderId) {
        if (!experienceTitle || !driveService.current || !portfolioFolderId) {
            console.log('폴더 삭제 조건 미충족:', { experienceTitle, hasDriveService: !!driveService.current, portfolioFolderId });
            return;
        }
        
        try {
            console.log('포트폴리오 폴더 ID:', portfolioFolderId);
            console.log('검색할 이력 제목:', experienceTitle);
            
            // 포트폴리오 이력 폴더 내에서 image 폴더 찾기
            const files = await driveService.current.getFilesInFolder(portfolioFolderId);
            console.log('포트폴리오 폴더 내 파일들:', files.map(f => ({ name: f.name, mimeType: f.mimeType, id: f.id })));
            
            const imageFolder = files.find(file => 
                file.name === 'image' && 
                file.mimeType === 'application/vnd.google-apps.folder'
            );
            
            if (!imageFolder) {
                console.log('image 폴더를 찾을 수 없습니다');
                return;
            }
            
            console.log('image 폴더 발견:', imageFolder.name, imageFolder.id);
            
            // image 폴더 내에서 해당 이력 폴더 찾기
            const imageFiles = await driveService.current.getFilesInFolder(imageFolder.id);
            console.log('image 폴더 내 파일들:', imageFiles.map(f => ({ name: f.name, mimeType: f.mimeType, id: f.id })));
            
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
                console.log('이력 폴더 발견:', experienceFolder.name, experienceFolder.id);
                console.log('이력 폴더 삭제 시도:', experienceFolder.name, experienceFolder.id);
                await driveService.current.deleteFile(experienceFolder.id);
                console.log('이력 폴더 삭제 완료:', experienceFolder.name);
            } else {
                console.log('삭제할 이력 폴더를 찾을 수 없습니다:', experienceTitle);
                console.log('image 폴더 내 사용 가능한 폴더들:', imageFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder').map(f => f.name));
                console.log('검색 조건:', { 
                    exactMatch: experienceTitle,
                    partialMatch: `contains ${experienceTitle}`,
                    caseInsensitive: experienceTitle.toLowerCase()
                });
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
                console.log('삭제할 이미지 파일들:', imagesToDelete);
                await deleteImageFiles(imagesToDelete, driveService);
            }

            // 이력 폴더들 삭제
            if (foldersToDelete.length > 0) {
                console.log('삭제할 이력 폴더들:', foldersToDelete);
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
                console.log('삭제할 이미지 파일들:', imagesToDelete);
                await deleteImageFiles(imagesToDelete, driveService);
            }

            // 이력 폴더 삭제
            if (expToDelete.title) {
                console.log('개별 이력 삭제 - 삭제할 이력 폴더:', expToDelete.title);
                console.log('개별 이력 삭제 - 이력 정보:', expToDelete);
                await deleteExperienceFolder(expToDelete.title, driveService, portfolioFolderId);
            } else {
                console.log('개별 이력 삭제 - 이력 제목이 없습니다:', expToDelete);
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
        extractFileIdFromImageUrl,
        deleteImageFiles,
        deleteExperienceFolder,
        deleteSelectedExperiences,
        deleteIndividualExperience
    };
}
