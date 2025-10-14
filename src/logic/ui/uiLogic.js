// UI 상태 관리 관련 로직
export function useUILogic(driveService = null) {
    // 섹션 전환
    function showSection(section, setActiveSection) {
        setActiveSection(section);
        localStorage.setItem('activeSection', section);
    }

    // 이력 편집 모달 표시
    function showEditExperienceModal(index, experiences, setForm, setImagePreviews, setEditingIndex, setShowModal, setOriginalPeriod, setExistingImageUrls) {
        if (index === null || index < 0 || index >= experiences.length) {
            console.error('유효하지 않은 이력 인덱스:', index);
            alert('수정할 이력이 존재하지 않습니다.');
            return;
        }

        const expToEdit = experiences[index];

        // 1. period 필드에서 날짜를 파싱합니다
        let startDate = '';
        let endDate = '';
        
        // 디버깅을 위해 데이터 구조 확인
        console.log('수정할 이력 데이터:', expToEdit);
        
        if (expToEdit.period) {
            console.log('period 필드:', expToEdit.period);
            
            // 다양한 period 형식 지원
            // 1. "2025.06.30 - 2025.10.30" 형식
            let periodMatch = expToEdit.period.match(/(\d{4}\.\d{2}\.\d{2})\s*[-~]\s*(\d{4}\.\d{2}\.\d{2})/);
            
            if (periodMatch) {
                // "2025.06.30" 형식을 "2025-06-30" 형식으로 변환
                startDate = periodMatch[1].replace(/\./g, '-');
                endDate = periodMatch[2].replace(/\./g, '-');
                console.log('파싱된 날짜:', { startDate, endDate });
            } else {
                // 2. "2025-06-30 - 2025-10-30" 형식 (이미 하이픈 형식)
                periodMatch = expToEdit.period.match(/(\d{4}-\d{2}-\d{2})\s*[-~]\s*(\d{4}-\d{2}-\d{2})/);
                if (periodMatch) {
                    startDate = periodMatch[1];
                    endDate = periodMatch[2];
                    console.log('파싱된 날짜 (하이픈 형식):', { startDate, endDate });
                } else {
                    // 3. "2025/06/30 - 2025/10/30" 형식
                    periodMatch = expToEdit.period.match(/(\d{4}\/\d{2}\/\d{2})\s*[-~]\s*(\d{4}\/\d{2}\/\d{2})/);
                    if (periodMatch) {
                        startDate = periodMatch[1].replace(/\//g, '-');
                        endDate = periodMatch[2].replace(/\//g, '-');
                        console.log('파싱된 날짜 (슬래시 형식):', { startDate, endDate });
                    } else {
                        // 4. 단일 날짜 형식 "2025.09.24" (시작일만 있는 경우)
                        periodMatch = expToEdit.period.match(/(\d{4}\.\d{2}\.\d{2})/);
                        if (periodMatch) {
                            startDate = periodMatch[1].replace(/\./g, '-');
                            endDate = periodMatch[1].replace(/\./g, '-'); // 시작일과 동일하게 설정
                            console.log('파싱된 날짜 (단일 날짜):', { startDate, endDate });
                        } else {
                            // 5. 하이픈 형식 단일 날짜 "2025-09-24"
                            periodMatch = expToEdit.period.match(/(\d{4}-\d{2}-\d{2})/);
                            if (periodMatch) {
                                startDate = periodMatch[1];
                                endDate = periodMatch[1]; // 시작일과 동일하게 설정
                                console.log('파싱된 날짜 (하이픈 단일 날짜):', { startDate, endDate });
                            } else {
                                console.log('날짜 파싱 실패 - 지원되지 않는 형식:', expToEdit.period);
                            }
                        }
                    }
                }
            }
        } else {
            console.log('period 필드가 없습니다');
        }

        // 2. form 상태 초기화 (날짜 입력 필드의 value 역할)
        setForm({
            title: expToEdit.title || '',
            startDate: startDate, // ⭐ 기존 데이터를 사용하여 달력 필드에 표시
            endDate: endDate,     // ⭐ 기존 데이터를 사용하여 달력 필드에 표시
            description: expToEdit.description || ''
        });

        // ⭐ [핵심] 기존 설정 기간을 저장합니다. ⭐
        //    모달이 열리자마자 이 값이 '기존 설정 기간' 텍스트에 사용됩니다.
        setOriginalPeriod({
            start: startDate, // "2025.06.30"
            end: endDate      // "2025.10.30"
        });

        // 3. 이미지 및 모드 설정
        const existingUrls = expToEdit.imageUrls || [];
        setImagePreviews(existingUrls);
        
        // 기존 이미지 URL들을 별도로 저장 (삭제 추적용)
        if (setExistingImageUrls) {
            setExistingImageUrls([...existingUrls]);
        }

        setEditingIndex(index);
        setShowModal(true);
    }

    // 이력 추가 모달 표시
    function showAddExperienceModal(setForm, setSelectedImages, setImagePreviews, setEditingIndex, setShowModal) {
        console.log('showAddExperienceModal 호출됨');
        // 상태 초기화 (폼, 이미지, 편집 인덱스 등)
        setForm({ title: '', startDate: '', endDate: '', description: '' });
        setSelectedImages([]);
        setImagePreviews([]);
        setEditingIndex(null); // 수정 모드 아님을 확실히 지정

        setShowModal(true);
        console.log('showModal 상태를 true로 설정');
    }

    // 모달 닫기
    function closeModal(setShowModal, setForm, setSelectedImages, setImagePreviews, setEditingIndex, setOriginalPeriod) {
        setShowModal(false);
        setForm({ title: '', startDate: '', endDate: '', description: '' });
        setSelectedImages([]);
        setImagePreviews([]);
        setEditingIndex(null);

        setOriginalPeriod(null);
    }

    // 전체 선택/해제
    function selectAllExperiences(select, experiences, setSelected) {
        if (select) {
            setSelected(experiences.map((_, i) => i));
        } else {
            setSelected([]);
        }
    }

    // 체크박스 변경
    function toggleSelect(idx, selected, setSelected) {
        setSelected(selected.includes(idx)
            ? selected.filter(i => i !== idx)
            : [...selected, idx]
        );
    }

    // 이미지 선택 핸들러
    function handleImageSelect(event, setSelectedImages, setImagePreviews) {
        const files = Array.from(event.target.files);

        // 각 파일에 대해 검증 및 처리
        files.forEach(file => {
            // 파일 크기 체크 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                alert(`파일 ${file.name}의 크기는 5MB 이하여야 합니다.`);
                return;
            }

            // 이미지 파일 타입 체크
            if (!file.type.startsWith('image/')) {
                alert(`파일 ${file.name}은 이미지 파일이 아닙니다.`);
                return;
            }

            // 이미지 미리보기 URL 생성
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedImages(prev => [...prev, file]);
                setImagePreviews(prev => [...prev, e.target.result]);
            };
            reader.readAsDataURL(file);
        });

        // input 초기화 (같은 파일을 다시 선택할 수 있도록)
        event.target.value = '';
    }

    // 드롭된 파일 처리
    function handleDroppedFiles(files, setSelectedImages, setImagePreviews) {
        files.forEach(file => {
            // 파일 크기 체크 (5MB 제한)
            if (file.size > 5 * 1024 * 1024) {
                alert(`파일 ${file.name}의 크기는 5MB 이하여야 합니다.`);
                return;
            }

            // 이미지 파일 타입 체크
            if (!file.type.startsWith('image/')) {
                alert(`파일 ${file.name}은 이미지 파일이 아닙니다.`);
                return;
            }

            // 이미지 미리보기 URL 생성
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedImages(prev => [...prev, file]);
                setImagePreviews(prev => [...prev, e.target.result]);
            };
            reader.readAsDataURL(file);
        });
    }

    // 이미지 제거 (기존 이미지와 새 이미지 구분 처리)
    function removeImage(index, setSelectedImages, setImagePreviews, existingImageUrls = [], setExistingImageUrls = null, currentImagePreviews = []) {
        // 기존 이미지인지 새 이미지인지 구분
        const imageToRemove = currentImagePreviews[index];
        
        if (existingImageUrls.includes(imageToRemove)) {
            // 기존 이미지 삭제 - existingImageUrls에서 제거
            if (setExistingImageUrls) {
                setExistingImageUrls(prev => prev.filter(url => url !== imageToRemove));
            }
        } else {
            // 새 이미지 삭제 - selectedImages에서 제거
            setSelectedImages(prev => prev.filter((_, i) => i !== index));
        }
        
        // imagePreviews에서 제거
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }

    // 이미지 확대 모달 표시
    function openImageModal(imageUrl, title, setSelectedImageForModal, setShowImageModal) {
        setSelectedImageForModal({ url: imageUrl, title });
        setShowImageModal(true);
    }

    // 이력 상세 모달 열기
    function openExperienceModal(experience, setSelectedExperience, setShowExperienceModal) {
        setSelectedExperience(experience);
        setShowExperienceModal(true);
    }

    // 이력 상세 모달 닫기
    function closeExperienceModal(setSelectedExperience, setShowExperienceModal) {
        setSelectedExperience(null);
        setShowExperienceModal(false);
    }

    // 이미지 확대 모달 닫기
    function closeImageModal(setShowImageModal, setSelectedImageForModal) {
        setShowImageModal(false);
        setSelectedImageForModal(null);
    }

    // 이미지 프리로딩 함수 (사용하지 않음 - 필요할 때 로딩하는 것이 더 효율적)
    function preloadImage(imageUrl) {
        // 프리로딩 제거 - 이미지는 필요할 때 로딩됨
        return Promise.resolve();
    }

    // 이미지 로딩 상태 관리 함수들
    function setImageLoadingState(imageKey, isLoading, setImageLoadingStates) {
        setImageLoadingStates(prev => {
            const newMap = new Map(prev);
            if (isLoading) {
                newMap.set(imageKey, 'loading');
            } else {
                newMap.delete(imageKey);
            }
            return newMap;
        });
    }

    function setImageErrorState(imageKey, setImageLoadingStates) {
        if (setImageLoadingStates) {
            setImageLoadingStates(prev => {
                const newMap = new Map(prev);
                newMap.set(imageKey, 'error');
                return newMap;
            });
        }
    }

    // 이미지 로딩 재시도 함수 (API 기반으로 개선)
    async function retryImageLoad(imgElement, originalUrl, retryCount = 0, setImageLoadingState, setImageErrorState, driveService = null) {
        const maxRetries = 4;
        const imageKey = `${originalUrl}_${imgElement.alt}`;
        
        const fileId = originalUrl.match(/[-\w]{25,}/)?.[0];
        if (!fileId) {
            console.error('파일 ID를 찾을 수 없습니다:', originalUrl);
            imgElement.style.display = 'none';
            return;
        }
        
        if (retryCount >= maxRetries) {
            console.error('이미지 로딩 실패 - 모든 재시도 소진:', originalUrl);
            if (setImageErrorState) setImageErrorState(imageKey);
            imgElement.style.display = 'none';
            return;
        }
        
        // 로딩 상태 설정
        if (setImageLoadingState) {
            setImageLoadingState(imageKey, true);
        }
        
        try {
            let imageUrl;
            
            if (retryCount === 0 && driveService) {
                // 첫 번째 시도: API를 통한 Blob URL 생성
                imageUrl = await driveService.getImageAsBlobUrl(fileId);
            } else if (retryCount === 1 && driveService) {
                // 두 번째 시도: Base64 변환
                imageUrl = await driveService.getImageAsBase64(fileId);
            } else {
                // 나머지 시도: 기존 URL 방식
                const alternativeUrls = [
                    `https://drive.google.com/uc?export=view&id=${fileId}`,
                    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
                    `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
                ];
                imageUrl = alternativeUrls[retryCount - 2] || alternativeUrls[0];
            }
            
            // 이미지 로딩 테스트
            await new Promise((resolve, reject) => {
                const testImg = new Image();
                const timeoutId = setTimeout(() => {
                    reject(new Error('이미지 로딩 타임아웃'));
                }, 5000);
                
                testImg.onload = () => {
                    clearTimeout(timeoutId);
                    imgElement.src = imageUrl;
                    resolve();
                };
                
                testImg.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(new Error('이미지 로딩 실패'));
                };
                
                testImg.src = imageUrl;
            });
            
            // 로딩 상태 해제
            if (setImageLoadingState) {
                setImageLoadingState(imageKey, false);
            }
            
        } catch (error) {
            // 재시도 실패 시에만 로그 출력 (마지막 시도가 아닌 경우)
            if (retryCount + 1 < maxRetries) {
                console.log(`이미지 로딩 실패 (${retryCount + 1}/${maxRetries}):`, error.message);
            }
            
            // 로딩 상태 해제
            if (setImageLoadingState) {
                setImageLoadingState(imageKey, false);
            }
            
            // 재시도
            await retryImageLoad(imgElement, originalUrl, retryCount + 1, setImageLoadingState, setImageErrorState, driveService);
        }
    }

    // 기존 이미지 URL을 올바른 형식으로 변환 (API 기반)
    async function convertImageUrl(imageUrl, driveService = null) {
        // 이미 Base64 데이터 URL인 경우 그대로 반환
        if (imageUrl.startsWith('data:')) {
            return imageUrl;
        }

        // 구글 드라이브 파일 ID 추출
        const fileIdMatch = imageUrl.match(/[-\w]{25,}/);
        if (!fileIdMatch) {
            console.warn('구글 드라이브 파일 ID를 찾을 수 없습니다:', imageUrl);
            return imageUrl;
        }

        const fileId = fileIdMatch[0];
        
        // API를 통한 이미지 변환 시도
        if (driveService) {
            try {
                const blobUrl = await driveService.getImageAsBlobUrl(fileId);
                return blobUrl;
            } catch (error) {
                console.warn('API 이미지 변환 실패, 직접 링크 사용:', error.message);
            }
        }
        
        // 폴백: 직접 링크 URL 사용
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        return directUrl;
    }

    // 템플릿 모달 표시
    function openTemplateModal(templateName, setSelectedTemplateForModal, setShowTemplateModal) {
        setSelectedTemplateForModal(templateName);
        setShowTemplateModal(true);
    }

    // 템플릿 모달에서 취소 버튼 클릭
    function handleTemplateCancel(setShowTemplateModal, setSelectedTemplateForModal) {
        setShowTemplateModal(false);
        setSelectedTemplateForModal(null);
    }

    // 템플릿 설명 객체
    const templateDescriptions = {
        basic: {
            name: '기본 템플릿',
            description: '깔끔하고 전문적인 레이아웃으로 구성된 템플릿입니다. 각 이력사항을 개별 슬라이드로 구성하여 명확하고 간결하게 표현할 수 있습니다.',
            features: ['깔끔한 디자인', '이력별 개별 슬라이드', '전문적인 레이아웃', '이미지와 텍스트 조화'],
            previewImages: [
                `${process.env.PUBLIC_URL}/template/img/sample1.png`,
                `${process.env.PUBLIC_URL}/template/img/sample2.png`,
                `${process.env.PUBLIC_URL}/template/img/sample3.png`
            ]
        },
        timeline: {
            name: '타임라인 템플릿',
            description: '시간의 흐름에 따라 이력사항을 구성하는 템플릿입니다. 연도별로 정리된 타임라인과 함께 각 이력의 상세 내용을 보여줍니다.',
            features: ['시간순 구성', '타임라인 시각화', '연도별 정리', '발전 과정 표현'],
            previewImages: []
        },
        photo: {
            name: '사진강조 템플릿',
            description: '이미지와 사진을 중심으로 구성된 템플릿입니다. 시각적 임팩트가 강한 레이아웃으로 포트폴리오의 핵심 내용을 효과적으로 전달할 수 있습니다.',
            features: ['이미지 중심 구성', '시각적 임팩트', '사진 강조', '효과적 전달'],
            previewImages: []
        }
    };

    return {
        showSection,
        showEditExperienceModal,
        showAddExperienceModal,
        closeModal,
        selectAllExperiences,
        toggleSelect,
        handleImageSelect,
        handleDroppedFiles,
        removeImage,
        openImageModal,
        openExperienceModal,
        closeExperienceModal,
        closeImageModal,
        preloadImage,
        setImageLoadingState,
        setImageErrorState,
        retryImageLoad,
        convertImageUrl,
        openTemplateModal,
        handleTemplateCancel,
        templateDescriptions
    };
}
