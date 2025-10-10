// PPT 생성 관련 로직
export function usePresentationLogic() {
    // 프레젠테이션 생성
    async function createPresentation(title, token) {
        const res = await fetch('https://slides.googleapis.com/v1/presentations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title })
        });

        const data = await res.json();
        console.log('Created presentation ID:', data.presentationId);
        return data.presentationId;
    }

    // 슬라이드 추가 (TITLE_AND_BODY)
    async function addSlide(presentationId, token) {
        await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: [
                    {
                        createSlide: {
                            slideLayoutReference: {
                                predefinedLayout: 'BLANK'  // 빈 슬라이드로 변경
                            }
                        }
                    }
                ]
            })
        });
    }

    // 첫 슬라이드에 제목/부제목 설정 (레이아웃 변경 없이)
    async function makeTitleAndBody(presId, slideId, token, title, subtitle) {
        try {
            // 슬라이드 데이터를 가져와서 텍스트 요소들을 찾기
            const slideData = await getPresentationData(presId, token);
            const slide = slideData.slides.find(s => s.objectId === slideId);
            
            if (!slide || !slide.pageElements) {
                console.error('슬라이드 또는 페이지 요소를 찾을 수 없습니다.');
                return;
            }

            console.log('슬라이드 요소들:', slide.pageElements);

            // 제목과 부제목 요소 찾기
            let titleElement = null;
            let subtitleElement = null;

            for (const element of slide.pageElements) {
                if (element.shape && element.shape.shapeType === 'TEXT_BOX') {
                    // 첫 번째 텍스트 박스를 제목으로, 두 번째를 부제목으로 사용
                    if (!titleElement) {
                        titleElement = element;
                    } else if (!subtitleElement) {
                        subtitleElement = element;
                    }
                }
            }

            const textRequests = [];

            // 제목 설정
            if (titleElement && title) {
                console.log('제목 설정:', title, '요소 ID:', titleElement.objectId);
                textRequests.push({
                    insertText: {
                        objectId: titleElement.objectId,
                        insertionIndex: 0,
                        text: title
                    }
                });
            }

            // 부제목 설정
            if (subtitleElement && subtitle) {
                console.log('부제목 설정:', subtitle, '요소 ID:', subtitleElement.objectId);
                textRequests.push({
                    insertText: {
                        objectId: subtitleElement.objectId,
                        insertionIndex: 0,
                        text: subtitle
                    }
                });
            }

            if (textRequests.length > 0) {
                await fetch(`https://slides.googleapis.com/v1/presentations/${presId}:batchUpdate`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ requests: textRequests })
                });
                console.log('제목과 부제목이 성공적으로 설정되었습니다.');
            } else {
                console.log('설정할 텍스트 요소를 찾을 수 없습니다.');
            }

        } catch (error) {
            console.error('makeTitleAndBody 오류:', error);
        }
    }

    async function getPresentationData(presentationId, token) {
        const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await res.json();
        console.log('Slides data:', data);
        return data;
    }

    async function updateElementText(presentationId, elementId, newText, token) {
        const requests = [
            {
                insertText: {
                    objectId: elementId,
                    insertionIndex: 0,
                    text: newText
                }
            },
            {
                deleteText: {
                    objectId: elementId,
                    textRange: { type: 'ALL' }
                }
            },
            {
                insertText: {
                    objectId: elementId,
                    insertionIndex: 0,
                    text: newText
                }
            }
        ];

        await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
        });
    }

    //스타일 변경을 위한 함수 추가
    async function updateElementStyle(presentationId, elementId, styleObj, token) {
        const requests = [
            {
                updateTextStyle: {
                    objectId: elementId,
                    style: styleObj,
                    fields: Object.keys(styleObj).join(','),
                    textRange: { type: 'ALL' }
                }
            }
        ];

        await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
        });
    }

    // 스타일이 적용된 텍스트박스를 슬라이드에 추가
    async function addStyledTextBoxToSlide(presentationId, slideId, text, token, position = { x: 0, y: 0, width: 300, height: 100 }, style = {}) {
        try {
            const objectId = `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [{
                        createShape: {
                            objectId: objectId,
                            shapeType: 'TEXT_BOX',
                            elementProperties: {
                                pageObjectId: slideId,
                                size: {
                                    width: { magnitude: position.width, unit: 'PT' },
                                    height: { magnitude: position.height, unit: 'PT' }
                                },
                                transform: {
                                    scaleX: 1,
                                    scaleY: 1,
                                    translateX: position.x,
                                    translateY: position.y,
                                    unit: 'PT'
                                }
                            }
                        }
                    }, {
                        insertText: {
                            objectId: objectId,
                            text: text
                        }
                    }, {
                        updateTextStyle: {
                            objectId: objectId,
                            style: {
                                bold: style.bold || false,
                                italic: style.italic || false,
                                fontSize: style.fontSize || { magnitude: 12, unit: 'PT' },
                                fontFamily: style.fontFamily || 'Arial',
                                foregroundColor: style.color || { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } }
                            },
                            fields: 'bold,italic,fontSize,fontFamily,foregroundColor'
                        }
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`스타일 텍스트박스 추가 실패: ${errorText}`);
            }

            const result = await response.json();
            console.log('스타일 텍스트박스가 슬라이드에 추가되었습니다:', result);
            return result;
        } catch (error) {
            console.error('스타일 텍스트박스 추가 오류:', error);
            throw error;
        }
    }

    // 텍스트박스를 슬라이드에 추가
    async function addTextBoxToSlide(presentationId, slideId, text, token, position = { x: 0, y: 0, width: 300, height: 100 }) {
        try {
            const objectId = `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [{
                        createShape: {
                            objectId: objectId,
                            shapeType: 'TEXT_BOX',
                            elementProperties: {
                                pageObjectId: slideId,
                                size: {
                                    width: { magnitude: position.width, unit: 'PT' },
                                    height: { magnitude: position.height, unit: 'PT' }
                                },
                                transform: {
                                    scaleX: 1,
                                    scaleY: 1,
                                    translateX: position.x,
                                    translateY: position.y,
                                    unit: 'PT'
                                }
                            }
                        }
                    }, {
                        insertText: {
                            objectId: objectId,
                            text: text
                        }
                    }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`텍스트박스 추가 실패: ${errorText}`);
            }

            const result = await response.json();
            console.log('텍스트박스가 슬라이드에 추가되었습니다:', result);
            return result;
        } catch (error) {
            console.error('텍스트박스 추가 오류:', error);
            throw error;
        }
    }

    // 이미지를 슬라이드에 추가
    async function addImageToSlide(presentationId, slideId, imageUrl, token, position = { x: 0, y: 0, width: 300, height: 200 }) {
        try {
            const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requests: [
                        {
                            createImage: {
                                objectId: `image_${Date.now()}`,
                                url: imageUrl,
                                elementProperties: {
                                    pageObjectId: slideId,
                                    size: {
                                        width: {
                                            magnitude: position.width,
                                            unit: 'PT'
                                        },
                                        height: {
                                            magnitude: position.height,
                                            unit: 'PT'
                                        }
                                    },
                                    transform: {
                                        scaleX: 1,
                                        scaleY: 1,
                                        translateX: position.x,
                                        translateY: position.y,
                                        unit: 'PT'
                                    }
                                }
                            }
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('이미지 추가 오류:', errorData);
                throw new Error(`이미지 추가 실패: ${errorData.error?.message || '알 수 없는 오류'}`);
            }

            const result = await response.json();
            console.log('이미지가 성공적으로 추가되었습니다:', result);
            return result;
        } catch (error) {
            console.error('이미지 추가 중 오류 발생:', error);
            throw error;
        }
    }

    // API로 텍스트 수정하고 성공하면 로컬 slides 상태도 안전히 갱신하는 헬퍼
    async function updateElementTextAndLocal(pId, elementId, newText, token, setSlides) {
        await updateElementText(pId, elementId, newText, token);

        setSlides(prevSlides => {
            return prevSlides.map(slide => {
                if (!slide.pageElements) return slide;
                const hasEl = slide.pageElements.some(pe => pe.objectId === elementId);
                if (!hasEl) return slide;

                const newPageElements = slide.pageElements.map(pe => {
                    if (pe.objectId !== elementId) return pe;
                    const newShape = {
                        ...pe.shape,
                        text: {
                            ...pe.shape?.text,
                            textElements: [{ textRun: { content: newText } }]
                        }
                    };
                    return { ...pe, shape: newShape };
                });

                return { ...slide, pageElements: newPageElements };
            });
        });
    }

    async function downloadPptxFromDrive(presentationId, token) {
        const mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}/export?mimeType=${encodeURIComponent(mime)}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        if (!res.ok) {
            const text = await res.text();
            throw new Error('Export 실패: ' + text);
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presentation_${presentationId}.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function findFirstPlaceholder(shapeList, type /* 'TITLE' | 'BODY' */) {
        for (const el of shapeList) {
            if (el.shape && el.shape.placeholder && el.shape.placeholder.type === type) {
                return el.objectId;
            }
        }
        return null;
    }

    function getTextFromElement(el) {
        if (
            el.shape &&
            el.shape.text &&
            el.shape.text.textElements
        ) {
            return el.shape.text.textElements
                .map(te => te.textRun?.content || '')
                .join('');
        }
        return '';
    }

    // PPT 기록 조회
    async function loadPptHistory(driveService, setPptHistory, setIsLoading) {
        if (!driveService.current) return;
        
        try {
            setIsLoading(true);
            
            // 포트폴리오 폴더 확인/생성
            const portfolioFolder = await driveService.current.ensurePortfolioFolder();
            
            // PPT 폴더 찾기
            const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
            
            if (!pptFolder) {
                console.log('PPT 폴더가 없습니다.');
                setPptHistory([]);
                return;
            }
            
            // PPT 폴더에서 PPT 파일들 조회
            const files = await driveService.current.getFilesInFolder(pptFolder.id);
            
            // PPT 파일만 필터링 (Google Slides 파일)
            const pptFiles = files.filter(file => 
                file.mimeType === 'application/vnd.google-apps.presentation'
            );
            
            // 생성일 기준으로 최신순 정렬
            const sortedPptFiles = pptFiles.sort((a, b) => 
                new Date(b.createdTime) - new Date(a.createdTime)
            );
            
            setPptHistory(sortedPptFiles);
            console.log('PPT 기록 로드됨:', sortedPptFiles);
            
        } catch (error) {
            console.error('PPT 기록 조회 오류:', error);
            alert('PPT 기록을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }

    // PPT 수정을 위한 슬라이드 데이터 로드
    async function loadPptForEdit(pptId, authService, getPresentationData, setSlides, setPresentationId, setActiveSection, setIsLoading) {
        try {
            setIsLoading(true);
            console.log('PPT 수정을 위한 데이터 로드 시작:', pptId);
            
            // 인증 서비스를 통해 토큰 확인 및 갱신
            if (!authService.current) {
                alert('인증 서비스가 초기화되지 않았습니다. 다시 로그인해주세요.');
                return;
            }
            
            // 인증 상태 확인
            const isAuthenticated = await authService.current.isAuthenticated();
            if (!isAuthenticated) {
                alert('인증이 필요합니다. 다시 로그인해주세요.');
                return;
            }
            
            // 액세스 토큰 가져오기
            const token = await authService.current.getAccessToken();
            if (!token) {
                alert('액세스 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
                return;
            }
            
            // 프레젠테이션 데이터 가져오기
            const data = await getPresentationData(pptId, token);
            console.log('프레젠테이션 데이터 로드됨:', data);
            
            // 슬라이드 데이터 설정
            setSlides(data.slides || []);
            setPresentationId(pptId);
            
            console.log('슬라이드 데이터 설정 완료:', data.slides);
            
            // 에디터 섹션으로 이동
            setActiveSection('editor');
            
        } catch (error) {
            console.error('PPT 수정 데이터 로드 오류:', error);
            if (error.message && error.message.includes('인증')) {
                alert('인증이 만료되었습니다. 다시 로그인해주세요.');
            } else {
                alert('PPT 데이터를 불러오는데 실패했습니다: ' + (error.message || error));
            }
        } finally {
            setIsLoading(false);
        }
    }

    // 슬라이드별 진행 상황 계산 함수
    function calculateSlideProgress(currentSlide, totalSlides, hasImages = false) {
        const baseProgress = 20; // PPT 파일 생성 + 표지 슬라이드 생성 완료 후 시작
        const slideProgress = 60; // 슬라이드 생성에 할당된 진행률
        const imageProgress = 20; // 이미지 처리에 할당된 진행률
        
        if (totalSlides === 0) return baseProgress;
        
        const slideRatio = currentSlide / totalSlides;
        const slideContribution = slideProgress * slideRatio;
        
        if (hasImages) {
            return baseProgress + slideContribution + imageProgress;
        }
        
        return baseProgress + slideContribution;
    }

    // 기본 템플릿 슬라이드 생성
    async function createBasicTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress) {
        let idx = 1; // 표지 다음부터 시작
        for (let i = 0; i < selectedExperiences.length; i++) {
            const exp = selectedExperiences[i];
            if (!slidesArr[idx]) break;
            const s = slidesArr[idx];
            
            // 슬라이드 생성 완료
            updatePptProgress(calculateSlideProgress(i, selectedExperiences.length), `슬라이드 ${i + 1} 생성중`, i + 1, selectedExperiences.length);
            
            // 슬라이드 내용 삽입 시작
            updatePptProgress(calculateSlideProgress(i, selectedExperiences.length) + 5, `슬라이드 ${i + 1} 내용 삽입중`, i + 1, selectedExperiences.length);

            // 제목, 기간, 설명을 위한 새로운 텍스트박스들을 생성
            try {
                // 1. 제목 텍스트박스 (제목 스타일 적용)
                await addStyledTextBoxToSlide(presId, s.objectId, exp.title, currentToken, {
                    x: 50,   // 왼쪽에서 50pt
                    y: 50,   // 상단에서 50pt
                    width: 400,
                    height: 60
                }, {
                    bold: true,
                    fontSize: { magnitude: 24, unit: 'PT' },
                    fontFamily: 'Arial',
                    color: { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } }
                });
                console.log(`제목 텍스트박스가 슬라이드 ${idx}에 추가되었습니다:`, exp.title);

                // 2. 기간 텍스트박스 (일반 스타일, 가로 길이 증가)
                await addTextBoxToSlide(presId, s.objectId, exp.period, currentToken, {
                    x: 50,   // 왼쪽에서 50pt
                    y: 100,  // 제목 아래 간격을 줄임 (120 → 100)
                    width: 350,  // 가로 길이를 늘림 (200 → 350)
                    height: 40
                });
                console.log(`기간 텍스트박스가 슬라이드 ${idx}에 추가되었습니다:`, exp.period);

                // 3. 설명 텍스트박스 (일반 스타일, 위치 조정)
                await addTextBoxToSlide(presId, s.objectId, exp.description, currentToken, {
                    x: 50,   // 왼쪽에서 50pt
                    y: 150,  // 기간 아래 간격을 줄임 (170 → 150)
                    width: 300,
                    height: 80
                });
                console.log(`설명 텍스트박스가 슬라이드 ${idx}에 추가되었습니다:`, exp.description);

            } catch (textBoxError) {
                console.error(`슬라이드 ${idx}에 텍스트박스 추가 실패:`, textBoxError);
                // 텍스트박스 추가 실패해도 PPT 생성은 계속 진행
            }
            
            // 이미지가 있는 경우 슬라이드에 추가
            if (exp.imageUrls && exp.imageUrls.length > 0) {
                updatePptProgress(calculateSlideProgress(i, selectedExperiences.length) + 10, `슬라이드 ${i + 1} 이미지 삽입중`, i + 1, selectedExperiences.length, 0, exp.imageUrls.length);
                try {
                    // 모든 이미지를 추가 (세로로 일렬 배치)
                    const imageCount = exp.imageUrls.length;
                    const imageWidth = 250;
                    const imageHeight = 150;
                    const imageSpacing = 20;
                    const startX = 400; // 텍스트 영역 오른쪽
                    const startY = 100; // 상단에서 100pt
                    
                    for (let j = 0; j < imageCount; j++) {
                        const imageUrl = exp.imageUrls[j];
                        
                        // 이미지 위치 계산 (세로로 일렬 배치)
                        const imagePosition = {
                            x: startX,
                            y: startY + j * (imageHeight + imageSpacing),
                            width: imageWidth,
                            height: imageHeight
                        };
                        
                        await addImageToSlide(presId, s.objectId, imageUrl, currentToken, imagePosition);
                        updatePptProgress(calculateSlideProgress(i, selectedExperiences.length) + 10 + (j + 1) * 2, `이미지 ${j + 1} 삽입중`, i + 1, selectedExperiences.length, j + 1, imageCount);
                        console.log(`이미지 ${j + 1}/${imageCount}가 슬라이드 ${i + 1}에 추가되었습니다:`, imageUrl);
                    }
                } catch (imageError) {
                    console.error(`슬라이드 ${idx}에 이미지 추가 실패:`, imageError);
                    // 이미지 추가 실패해도 PPT 생성은 계속 진행
                }
            }
            
            idx++;
        }
    }

    // 타임라인 템플릿 슬라이드 생성
    async function createTimelineTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress) {
        // 이력을 시작일 기준으로 정렬 (오름차순 - 더 오래된 이력부터)
        const sortedExperiences = [...selectedExperiences].sort((a, b) => {
            const dateA = new Date(a.period.split(' - ')[0] || a.period.split('~')[0] || a.period);
            const dateB = new Date(b.period.split(' - ')[0] || b.period.split('~')[0] || b.period);
            return dateA - dateB;
        });

        let idx = 1; // 표지 다음부터 시작

        // 1. 타임라인 개요 슬라이드 생성
        if (slidesArr[idx]) {
            const overviewSlide = slidesArr[idx];
            updatePptProgress(10, '타임라인 개요 슬라이드 생성중');
            
            try {
                // 타임라인 제목
                await addStyledTextBoxToSlide(presId, overviewSlide.objectId, '타임라인', currentToken, {
                    x: 50,
                    y: 50,
                    width: 500,
                    height: 60
                }, {
                    bold: true,
                    fontSize: { magnitude: 28, unit: 'PT' },
                    fontFamily: 'Arial',
                    color: { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } }
                });

                // 타임라인 목록 생성
                let timelineY = 150;
                for (let i = 0; i < sortedExperiences.length; i++) {
                    const exp = sortedExperiences[i];
                    const timelineText = `${i + 1}. ${exp.title} (${exp.period})`;
                    
                    await addTextBoxToSlide(presId, overviewSlide.objectId, timelineText, currentToken, {
                        x: 80,
                        y: timelineY,
                        width: 450,
                        height: 30
                    });
                    
                    timelineY += 40;
                }
            } catch (error) {
                console.error('타임라인 개요 슬라이드 생성 실패:', error);
            }
            idx++;
        }

        // 2. 각 이력별 상세 슬라이드 생성
        for (let i = 0; i < sortedExperiences.length; i++) {
            const exp = sortedExperiences[i];
            if (!slidesArr[idx]) break;
            const s = slidesArr[idx];
            
            updatePptProgress(calculateSlideProgress(i, sortedExperiences.length), `타임라인 슬라이드 ${i + 1} 생성중`, i + 1, sortedExperiences.length);
            
            try {
                // 제목 텍스트박스
                await addStyledTextBoxToSlide(presId, s.objectId, exp.title, currentToken, {
                    x: 50,
                    y: 50,
                    width: 400,
                    height: 60
                }, {
                    bold: true,
                    fontSize: { magnitude: 24, unit: 'PT' },
                    fontFamily: 'Arial',
                    color: { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } }
                });

                // 기간 텍스트박스
                await addTextBoxToSlide(presId, s.objectId, exp.period, currentToken, {
                    x: 50,
                    y: 100,
                    width: 350,
                    height: 40
                });

                // 설명 텍스트박스
                await addTextBoxToSlide(presId, s.objectId, exp.description, currentToken, {
                    x: 50,
                    y: 150,
                    width: 300,
                    height: 80
                });

                // 이미지가 있는 경우 추가
                if (exp.imageUrls && exp.imageUrls.length > 0) {
                    const imageCount = exp.imageUrls.length;
                    const imageWidth = 200;
                    const imageHeight = 120;
                    const startX = 400;
                    const startY = 100;
                    
                    for (let j = 0; j < imageCount; j++) {
                        const imageUrl = exp.imageUrls[j];
                        const imagePosition = {
                            x: startX,
                            y: startY + j * (imageHeight + 20),
                            width: imageWidth,
                            height: imageHeight
                        };
                        
                        await addImageToSlide(presId, s.objectId, imageUrl, currentToken, imagePosition);
                    }
                }
            } catch (error) {
                console.error(`타임라인 슬라이드 ${i + 1} 생성 실패:`, error);
            }
            
            idx++;
        }
    }

    // 사진강조 템플릿 슬라이드 생성
    async function createPhotoTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress) {
        // 이미지가 있는 이력들만 필터링
        const experiencesWithImages = selectedExperiences.filter(exp => exp.imageUrls && exp.imageUrls.length > 0);
        
        let idx = 1; // 표지 다음부터 시작

        // 각 이미지별 슬라이드 생성
        let slideCount = 0;
        const totalImages = experiencesWithImages.reduce((sum, exp) => sum + exp.imageUrls.length, 0);
        
        for (let i = 0; i < experiencesWithImages.length; i++) {
            const exp = experiencesWithImages[i];
            
            for (let j = 0; j < exp.imageUrls.length; j++) {
                if (!slidesArr[idx]) break;
                const s = slidesArr[idx];
                
                slideCount++;
                updatePptProgress(calculateSlideProgress(slideCount - 1, totalImages), `사진 슬라이드 ${slideCount} 생성중`, slideCount, totalImages);
                
                try {
                    // 이력 제목
                    await addStyledTextBoxToSlide(presId, s.objectId, exp.title, currentToken, {
                        x: 50,
                        y: 50,
                        width: 400,
                        height: 50
                    }, {
                        bold: true,
                        fontSize: { magnitude: 20, unit: 'PT' },
                        fontFamily: 'Arial',
                        color: { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } }
                    });

                    // 기간
                    await addTextBoxToSlide(presId, s.objectId, exp.period, currentToken, {
                        x: 50,
                        y: 100,
                        width: 300,
                        height: 30
                    });

                    // 이미지 (중앙에 크게 배치)
                    const imageUrl = exp.imageUrls[j];
                    const imagePosition = {
                        x: 100,
                        y: 150,
                        width: 400,
                        height: 300
                    };
                    
                    await addImageToSlide(presId, s.objectId, imageUrl, currentToken, imagePosition);
                    
                    // 이미지 설명 (선택적)
                    if (exp.description) {
                        await addTextBoxToSlide(presId, s.objectId, exp.description, currentToken, {
                            x: 50,
                            y: 470,
                            width: 400,
                            height: 60
                        });
                    }
                } catch (error) {
                    console.error(`사진 슬라이드 ${slideCount} 생성 실패:`, error);
                }
                
                idx++;
            }
        }
    }

    // PPT 생성 메인 함수
    async function handleTemplateSelect(templateName, token, {
        selectedExperiences,
        driveService,
        authService,
        setSelectedTemplate,
        setIsPptCreating,
        setPptMessages,
        updatePptProgress,
        setPresentationId,
        setSlides,
        loadPptHistory,
        setActiveSection,
        setAccessToken,
        accessToken
    }) {
        const title = prompt('슬라이드 제목을 입력하세요:', '나의 포트폴리오');
        if (!title) {
            alert('제목이 없습니다.');
            return;
        }

        // 현재 날짜를 YYYY-MM-DD 형식으로 생성
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        // PPT 표지용 제목 (날짜와 중복표시 제거)
        const cleanTitle = title.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').replace(/_\d+$/, '');
        
        // 기본 파일명 생성 (날짜 포함)
        const baseFileName = `${title} ${dateString}`;
        
        // PPT 폴더에서 기존 PPT 파일들 조회하여 중복 확인
        let finalFileName = baseFileName;
        try {
            const portfolioFolder = await driveService.current.ensurePortfolioFolder();
            const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
            
            if (pptFolder) {
                const existingFiles = await driveService.current.getFilesInFolder(pptFolder.id);
                
                // PPT 파일만 필터링 (Google Slides 파일)
                const pptFiles = existingFiles.filter(file => 
                    file.mimeType === 'application/vnd.google-apps.presentation'
                );
                
                // 순차적 번호가 포함된 파일명 생성
                finalFileName = driveService.current.generateSequentialFileName(baseFileName, pptFiles);
                console.log(`원본 PPT 파일명: ${baseFileName} → 최종 파일명: ${finalFileName}`);
            } else {
                console.log('PPT 폴더가 없어서 기본 파일명 사용');
            }
        } catch (error) {
            console.warn('PPT 파일명 중복 확인 실패, 기본 파일명 사용:', error);
        }

        // 토큰 확보 보장
        let currentToken = accessToken;
        if (!currentToken) {
            try {
                // 인증 상태 확인
                const isAuthenticated = await authService.current.isAuthenticated();
                if (!isAuthenticated) {
                    alert('인증이 필요합니다. 다시 로그인해주세요.');
                    return;
                }
                
                currentToken = await authService.current.getAccessToken();
                if (!currentToken) {
                    alert('액세스 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
                    return;
                }
                setAccessToken(currentToken);
            } catch (error) {
                console.error('토큰 가져오기 실패:', error);
                alert('인증이 필요합니다. 다시 로그인해주세요.');
                return;
            }
        }

        setSelectedTemplate(templateName);
        setIsPptCreating(true); // PPT 생성 시작
        
        // 진행 상황 초기화
        setPptMessages([]);
        updatePptProgress(0, 'PPT 생성을 시작합니다...');

        try {
            // 1) 프레젠테이션 생성 (중복 확인된 최종 파일명으로)
            updatePptProgress(10, 'PPT 파일을 생성하고 있습니다...');
            const presId = await createPresentation(finalFileName, currentToken);
            setPresentationId(presId);

            // 1-1) PPT 파일을 PPT 폴더로 이동
            try {
                const portfolioFolder = await driveService.current.ensurePortfolioFolder();
                const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
                
                if (pptFolder) {
                    const gapiClient = authService.current.getAuthenticatedGapiClient();
                    
                    // PPT 파일을 PPT 폴더로 이동
                    await gapiClient.drive.files.update({
                        fileId: presId,
                        addParents: pptFolder.id,
                        removeParents: 'root'
                    });
                    console.log('PPT 파일이 PPT 폴더로 이동되었습니다.');
                } else {
                    console.warn('PPT 폴더를 찾을 수 없습니다. 포트폴리오 폴더에 저장됩니다.');
                }
            } catch (moveError) {
                console.warn('PPT 파일 폴더 이동 실패:', moveError);
                // 폴더 이동 실패해도 PPT 생성은 성공으로 처리
            }

            // 2) 첫 슬라이드 레이아웃 보정 및 제목/부제목 설정
            updatePptProgress(20, '표지 슬라이드 생성중');
            let data = await getPresentationData(presId, currentToken);
            if (data.slides?.length > 0) {
                // 구글 계정에서 사용자 이름 가져오기
                let userName = '사용자';
                try {
                    userName = await authService.current.getGoogleAccountName();
                } catch (error) {
                    console.warn('사용자 이름 가져오기 실패, 기본값 사용:', error);
                }
                
                await makeTitleAndBody(presId, data.slides[0].objectId, currentToken, cleanTitle, userName);
            }

            // 3) 템플릿별 슬라이드 추가 (기본 슬라이드만 먼저 생성)
            let totalSlides = selectedExperiences.length;
            if (templateName === 'timeline') {
                totalSlides = selectedExperiences.length + 1; // 개요 슬라이드 1개 추가
            } else if (templateName === 'photo') {
                // 이미지가 있는 이력들의 이미지 개수만큼 슬라이드 생성
                const experiencesWithImages = selectedExperiences.filter(exp => exp.imageUrls && exp.imageUrls.length > 0);
                totalSlides = experiencesWithImages.reduce((sum, exp) => sum + exp.imageUrls.length, 0);
            }
            
            if (templateName === 'basic') {
                // 기본 템플릿: 이력별 슬라이드만 생성
                for (let i = 0; i < selectedExperiences.length; i++) {
                    await addSlide(presId, currentToken);
                }
            } else if (templateName === 'timeline') {
                // 타임라인 템플릿: 타임라인 개요 슬라이드 + 이력별 슬라이드 (시작일 기준 정렬)
                await addSlide(presId, currentToken); // 타임라인 개요 슬라이드
                for (let i = 0; i < selectedExperiences.length; i++) {
                    await addSlide(presId, currentToken);
                }
            } else if (templateName === 'photo') {
                // 사진강조 템플릿: 이미지별 슬라이드만 생성
                // 이미지가 있는 이력들만 필터링하고 이미지별로 슬라이드 생성
                const experiencesWithImages = selectedExperiences.filter(exp => exp.imageUrls && exp.imageUrls.length > 0);
                for (let i = 0; i < experiencesWithImages.length; i++) {
                    const exp = experiencesWithImages[i];
                    // 이미지 개수만큼 슬라이드 생성
                    for (let j = 0; j < exp.imageUrls.length; j++) {
                        await addSlide(presId, currentToken);
                    }
                }
            }

            // 4) 최신 데이터 가져오기
            data = await getPresentationData(presId, currentToken);
            const slidesArr = data.slides || [];

            // 5) 텍스트 채우기
            if (slidesArr[0]) {
                const s0 = slidesArr[0];
                const titleShapeId = findFirstPlaceholder(s0.pageElements, 'TITLE');
                const bodyShapeId  = findFirstPlaceholder(s0.pageElements, 'BODY');

                // 표지 제목: 원본 제목 (날짜 제외)
                if (titleShapeId) await updateElementText(presId, titleShapeId, title, currentToken);
                
                // 표지 본문: 구글 계정 이름
                if (bodyShapeId) {
                    const userName = await authService.current.getGoogleAccountName();
                    await updateElementText(presId, bodyShapeId, userName, currentToken);
                }
            }

            // 5) 템플릿별 슬라이드 내용 추가
            if (templateName === 'basic') {
                await createBasicTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress);
            } else if (templateName === 'timeline') {
                await createTimelineTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress);
            } else if (templateName === 'photo') {
                await createPhotoTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress);
            }

            // 6) 최종 상태 반영
            const refreshed = await getPresentationData(presId, currentToken);
            setSlides(refreshed.slides || []);
            
            // 7) PPT 기록 새로고침
            updatePptProgress(95, '최종 정리중');
            await loadPptHistory();
            
            updatePptProgress(100, 'PPT 생성 완료!');
            alert('PPT가 생성되었습니다.');
            setActiveSection('editor');
        } catch (error) {
            console.error('PPT 생성 오류:', error);
            alert('PPT 생성에 실패했습니다: ' + (error?.message || error));
        } finally {
            setIsPptCreating(false); // PPT 생성 완료 (성공/실패 관계없이)
        }
    }

    return {
        createPresentation,
        addSlide,
        makeTitleAndBody,
        getPresentationData,
        updateElementText,
        updateElementStyle,
        addStyledTextBoxToSlide,
        addTextBoxToSlide,
        addImageToSlide,
        updateElementTextAndLocal,
        downloadPptxFromDrive,
        findFirstPlaceholder,
        getTextFromElement,
        loadPptHistory,
        loadPptForEdit,
        calculateSlideProgress,
        handleTemplateSelect,
        createBasicTemplateSlides,
        createTimelineTemplateSlides,
        createPhotoTemplateSlides
    };
}
