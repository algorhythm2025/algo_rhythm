// UI 상태 관리 관련 로직
export function useUILogic() {
    // 섹션 전환
    function showSection(section, setActiveSection) {
        setActiveSection(section);
        localStorage.setItem('activeSection', section);
    }

    // 이력 편집 모달 표시
    function showEditExperienceModal(index, experiences, setForm, setImagePreviews, setEditingIndex, setShowModal, setOriginalPeriod) {
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

    // 이미지 제거
    function removeImage(index, setSelectedImages, setImagePreviews) {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
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

    // 이미지 프리로딩 함수 (백그라운드에서 미리 로딩)
    function preloadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = imageUrl;
        });
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
        setImageLoadingStates(prev => {
            const newMap = new Map(prev);
            newMap.set(imageKey, 'error');
            return newMap;
        });
    }

    // 이미지 로딩 재시도 함수 (최적화됨)
    async function retryImageLoad(imgElement, originalUrl, retryCount = 0, setImageLoadingState, setImageErrorState) {
        const maxRetries = 2; // 재시도 횟수 감소
        const imageKey = `${originalUrl}_${imgElement.alt}`;
        
        const fileId = originalUrl.match(/[-\w]{25,}/)?.[0];
        const alternativeUrls = [
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`, // 가장 빠른 썸네일
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`, // 더 작은 썸네일
            `https://drive.google.com/uc?export=view&id=${fileId}`
        ];
        
        if (retryCount >= maxRetries) {
            console.error('이미지 로딩 실패 - 모든 재시도 소진:', originalUrl);
            setImageErrorState(imageKey, setImageErrorState);
            imgElement.style.display = 'none';
            return;
        }
        
        const currentUrl = retryCount === 0 ? originalUrl : alternativeUrls[retryCount - 1];
        console.log(`이미지 로딩 재시도 ${retryCount + 1}/${maxRetries + 1}:`, currentUrl);
        
        // 로딩 상태 설정
        setImageLoadingState(imageKey, true, setImageLoadingState);
        
        // 새로운 이미지 객체로 테스트 (타임아웃 설정)
        const testImg = new Image();
        let timeoutId;
        
        const cleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
            setImageLoadingState(imageKey, false, setImageLoadingState);
        };
        
        // 3초 타임아웃 설정 (더 빠른 응답)
        timeoutId = setTimeout(() => {
            console.log('이미지 로딩 타임아웃:', currentUrl);
            cleanup();
            setTimeout(() => retryImageLoad(imgElement, originalUrl, retryCount + 1, setImageLoadingState, setImageErrorState), 300); // 더 빠른 재시도
        }, 3000);
        
        testImg.onload = () => {
            cleanup();
            imgElement.src = currentUrl;
            console.log('이미지 로딩 성공:', currentUrl);
        };
        
        testImg.onerror = () => {
            cleanup();
            setTimeout(() => retryImageLoad(imgElement, originalUrl, retryCount + 1, setImageLoadingState, setImageErrorState), 300); // 더 빠른 재시도
        };
        
        testImg.src = currentUrl;
    }

    // 기존 이미지 URL을 올바른 형식으로 변환
    async function convertImageUrl(imageUrl) {
        // 이미 Base64 데이터 URL이거나 직접 접근 URL인 경우 그대로 반환
        if (imageUrl.startsWith('data:') || imageUrl.includes('uc?export=view&id=')) {
            return imageUrl;
        }

        // 구글 드라이브 파일 ID 추출
        const fileIdMatch = imageUrl.match(/[-\w]{25,}/);
        if (!fileIdMatch) {
            console.warn('구글 드라이브 파일 ID를 찾을 수 없습니다:', imageUrl);
            return imageUrl;
        }

        const fileId = fileIdMatch[0];
        
        // 썸네일 크기로 최적화된 URL 우선 사용 (로딩 속도 향상)
        const possibleUrls = [
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`, // 썸네일 크기로 최적화
            `https://drive.google.com/uc?export=view&id=${fileId}`,
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
            `https://lh3.googleusercontent.com/d/${fileId}`,
            `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
        ];
        
        // 첫 번째 URL을 기본으로 사용 (썸네일 크기로 빠른 로딩)
        const directUrl = possibleUrls[0];
        console.log('이미지 URL 변환 (최적화):', imageUrl, '→', directUrl);
        
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
        grid: {
            name: '그리드 템플릿',
            description: '격자 형태로 이력사항을 배치하는 템플릿입니다. 여러 이력을 한눈에 볼 수 있어 비교하기 쉽고 시각적으로 정리된 느낌을 줍니다.',
            features: ['격자형 레이아웃', '한눈에 보기', '비교 용이', '시각적 정리'],
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
