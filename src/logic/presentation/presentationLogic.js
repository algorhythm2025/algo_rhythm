// PPT 생성 관련 로직
export function usePresentationLogic() {
    async function getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = (err) => {
                console.error('이미지 크기 로드 실패:', url, err);
                resolve({ width: 1920, height: 1080 });
            };

            try {
                if (url.startsWith('http')) {
                    img.crossOrigin = 'anonymous';
                }
            } catch(e) {
                console.warn('crossOrigin 설정 실패', e);
            }

            img.src = url;
        });
    }

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
    async function makeTitleAndBody(presId, slideId, token, title, subtitle, selectedThemeColor = 'light') {
        try {
            // 테마 색상 스타일 가져오기
            const themeStyles = getThemeStyles(selectedThemeColor);
            
            // 슬라이드 배경색 설정
            await setSlideBackground(presId, slideId, themeStyles.backgroundColor, token);
            
            // 슬라이드 데이터를 가져와서 텍스트 요소들을 찾기
            const slideData = await getPresentationData(presId, token);
            const slide = slideData.slides.find(s => s.objectId === slideId);
            
            if (!slide || !slide.pageElements) {
                console.error('슬라이드 또는 페이지 요소를 찾을 수 없습니다.');
                return;
            }


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
                
                // 텍스트 색상 설정
                const styleRequests = [];
                if (titleElement) {
                    styleRequests.push({
                        updateTextStyle: {
                            objectId: titleElement.objectId,
                            style: {
                                foregroundColor: themeStyles.textColor
                            },
                            fields: 'foregroundColor'
                        }
                    });
                }
                if (subtitleElement) {
                    styleRequests.push({
                        updateTextStyle: {
                            objectId: subtitleElement.objectId,
                            style: {
                                foregroundColor: themeStyles.textColor
                            },
                            fields: 'foregroundColor'
                        }
                    });
                }
                
                if (styleRequests.length > 0) {
                    await fetch(`https://slides.googleapis.com/v1/presentations/${presId}:batchUpdate`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ requests: styleRequests })
                    });
                }
            } else {
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
            
            // 슬라이드 데이터 설정
            setSlides(data.slides || []);
            setPresentationId(pptId);
            
            
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

    // 테마 색상에 따른 스타일 반환 함수
    function getThemeStyles(selectedThemeColor) {
        if (selectedThemeColor === 'navy-white') {
            return {
                backgroundColor: { rgbColor: { red: 0.098, green: 0.125, blue: 0.165 } }, // 네이비
                textColor: { opaqueColor: { rgbColor: { red: 1, green: 1, blue: 1 } } } // 화이트
            };
        } else if (selectedThemeColor === 'navy-yellow') {
            return {
                backgroundColor: { rgbColor: { red: 0.098, green: 0.125, blue: 0.165 } }, // 네이비
                textColor: { opaqueColor: { rgbColor: { red: 1, green: 0.843, blue: 0 } } } // 옐로우
            };
        } else if (selectedThemeColor === 'darkgray-white') {
            return {
                backgroundColor: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } }, // 다크그레이
                textColor: { opaqueColor: { rgbColor: { red: 1, green: 1, blue: 1 } } } // 화이트
            };
        } else if (selectedThemeColor === 'darkgreen-white') {
            return {
                backgroundColor: { rgbColor: { red: 0.067, green: 0.2, blue: 0.067 } }, // 다크그린
                textColor: { opaqueColor: { rgbColor: { red: 1, green: 1, blue: 1 } } } // 화이트
            };
        } else if (selectedThemeColor === 'lavenderpurple-black') {
            return {
                backgroundColor: { rgbColor: { red: 0.8, green: 0.7, blue: 0.9 } }, // 연한 라벤더퍼플
                textColor: { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } } // 블랙
            };
        } else if (selectedThemeColor === 'dark') {
            return {
                backgroundColor: { rgbColor: { red: 0, green: 0, blue: 0 } },
                textColor: { opaqueColor: { rgbColor: { red: 1, green: 1, blue: 1 } } }
            };
        } else {
            // light 테마 (기본값)
            return {
                backgroundColor: { rgbColor: { red: 1, green: 1, blue: 1 } },
                textColor: { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } }
            };
        }
    }

    // 슬라이드 배경색 설정 함수
    async function setSlideBackground(presId, slideId, backgroundColor, token) {
        try {
            const requests = [{
                updatePageProperties: {
                    objectId: slideId,
                    pageProperties: {
                        pageBackgroundFill: {
                            solidFill: {
                                color: backgroundColor
                            }
                        }
                    },
                    fields: 'pageBackgroundFill'
                }
            }];

            await window.gapi.client.slides.presentations.batchUpdate({
                presentationId: presId,
                requests: requests
            });
        } catch (error) {
            console.error('슬라이드 배경색 설정 실패:', error);
        }
    }

    async function addExperienceTextToSlide(presId, slideId, exp, currentToken, themeStyles) {
        try {
            await addStyledTextBoxToSlide(presId, slideId, exp.title, currentToken, {
                x: 50,
                y: 50,
                width: 400,
                height: 60
            }, {
                bold: true,
                fontSize: { magnitude: 24, unit: 'PT' },
                fontFamily: 'Arial',
                color: themeStyles.textColor
            });

            await addStyledTextBoxToSlide(presId, slideId, exp.period, currentToken, {
                x: 50,
                y: 100,
                width: 350,
                height: 40
            }, {
                fontSize: { magnitude: 14, unit: 'PT' },
                fontFamily: 'Arial',
                color: themeStyles.textColor
            });

            await addStyledTextBoxToSlide(presId, slideId, exp.description, currentToken, {
                x: 50,
                y: 150,
                width: 300,
                height: 80
            }, {
                fontSize: { magnitude: 12, unit: 'PT' },
                fontFamily: 'Arial',
                color: themeStyles.textColor
            });

        } catch (textBoxError) {
            console.error(`슬라이드 ${slideId}에 텍스트박스 추가 실패:`, textBoxError);
        }
    }

    // 기본 템플릿 슬라이드 생성
    async function createBasicTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor = 'light') {
        const themeStyles = getThemeStyles(selectedThemeColor);

        let idx = 1;
        for (let i = 0; i < selectedExperiences.length; i++) {
            const exp = selectedExperiences[i];
            if (!slidesArr[idx]) break;
            const s = slidesArr[idx];

            updatePptProgress(calculateSlideProgress(i, selectedExperiences.length), `슬라이드 ${i + 1} 생성중`, i + 1, selectedExperiences.length);

            updatePptProgress(calculateSlideProgress(i, selectedExperiences.length) + 5, `슬라이드 ${i + 1} 내용 삽입중`, i + 1, selectedExperiences.length);

            await setSlideBackground(presId, s.objectId, themeStyles.backgroundColor, currentToken);
            
            if (exp.imageUrls && exp.imageUrls.length > 0) {
                updatePptProgress(calculateSlideProgress(i, selectedExperiences.length) + 10, `슬라이드 ${i + 1} 이미지 삽입중`, i + 1, selectedExperiences.length, 0, exp.imageUrls.length);

                const imageChunks = [];
                for (let j = 0; j < exp.imageUrls.length; j += 2) {
                    imageChunks.push(exp.imageUrls.slice(j, j + 2));
                }

                let totalImageCountForExp = exp.imageUrls.length;
                let processedImageCount = 0;

                for (let chunkIndex = 0; chunkIndex < imageChunks.length; chunkIndex++) {
                    const chunk = imageChunks[chunkIndex];
                    const currentSlideForImages = slidesArr[idx + chunkIndex];

                    if (!currentSlideForImages) break;

                    if (chunkIndex > 0) {
                        await setSlideBackground(presId, currentSlideForImages.objectId, themeStyles.backgroundColor, currentToken);
                    }

                    await addExperienceTextToSlide(presId, currentSlideForImages.objectId, exp, currentToken, themeStyles);

                    try {
                        for (let imageInChunkIndex = 0; imageInChunkIndex < chunk.length; imageInChunkIndex++) {
                            const imageUrl = chunk[imageInChunkIndex];

                            const imageWidth = 240;
                            const imageHeight = 160;
                            const imageX = 460;
                            const imageY_start = 50;
                            const imageMargin = 20;

                            const imagePosition = {
                                x: imageX,
                                y: imageY_start + (imageInChunkIndex * (imageHeight + imageMargin)),
                                width: imageWidth,
                                height: imageHeight
                            };

                            await addImageToSlide(presId, currentSlideForImages.objectId, imageUrl, currentToken, imagePosition);
                            processedImageCount++;
                            updatePptProgress(calculateSlideProgress(i, selectedExperiences.length) + 10 + (processedImageCount * 2), `이미지 ${processedImageCount} 삽입중`, i + 1, selectedExperiences.length, processedImageCount, totalImageCountForExp);
                        }
                    } catch (imageError) {
                        console.error(`슬라이드 ${idx + chunkIndex + 1}에 이미지 추가 실패:`, imageError);
                    }
                }
                idx += imageChunks.length;
            } else{
                await addExperienceTextToSlide(presId, s.objectId, exp, currentToken, themeStyles);
                idx++;
            }
        }
    }

    // 타임라인 템플릿 슬라이드 생성
    async function createTimelineTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor = 'light') {
        const themeStyles = getThemeStyles(selectedThemeColor);
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
            
            // 슬라이드 배경색 설정
            await setSlideBackground(presId, overviewSlide.objectId, themeStyles.backgroundColor, currentToken);
            
            try {
                await addStyledTextBoxToSlide(presId, overviewSlide.objectId, '타임라인', currentToken, {
                    x: 50,
                    y: 50,
                    width: 500,
                    height: 60
                }, {
                    bold: true,
                    fontSize: { magnitude: 28, unit: 'PT' },
                    fontFamily: 'Arial',
                    color: themeStyles.textColor
                });

                const totalExperiences = sortedExperiences.length;
                const isSplit = totalExperiences >= 5;
                const splitPoint = Math.ceil(totalExperiences / 2);

                const colWidth = isSplit ? 320 : 600;
                const startX_left = 60;
                const startX_right = 390;
                const startY = 150;
                const lineHeight = 40;

                for (let i = 0; i < totalExperiences; i++) {
                    const exp = sortedExperiences[i];
                    const timelineText = `${i + 1}. ${exp.title} (${exp.period})`;

                    let currentX, currentY;

                    if (isSplit) {
                        if (i < splitPoint) {
                            currentX = startX_left;
                            currentY = startY + (i * lineHeight);
                        } else {
                            currentX = startX_right;
                            currentY = startY + ((i - splitPoint) * lineHeight);
                        }
                    } else {
                        currentX = startX_left;
                        currentY = startY + (i * lineHeight);
                    }

                    await addStyledTextBoxToSlide(presId, overviewSlide.objectId, timelineText, currentToken, {
                        x: currentX,
                        y: currentY,
                        width: colWidth,
                        height: 30
                    }, {
                        fontSize: { magnitude: 14, unit: 'PT' },
                        fontFamily: 'Arial',
                        color: themeStyles.textColor
                    });
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
            
            await setSlideBackground(presId, s.objectId, themeStyles.backgroundColor, currentToken);

            if (exp.imageUrls && exp.imageUrls.length > 0) {
                updatePptProgress(calculateSlideProgress(i, sortedExperiences.length) + 10, `타임라인 슬라이드 ${i + 1} 이미지 삽입중`, i + 1, sortedExperiences.length, 0, exp.imageUrls.length);

                const imageChunks = [];
                for (let j = 0; j < exp.imageUrls.length; j += 2) {
                    imageChunks.push(exp.imageUrls.slice(j, j + 2));
                }

                let totalImageCountForExp = exp.imageUrls.length;
                let processedImageCount = 0;

                for (let chunkIndex = 0; chunkIndex < imageChunks.length; chunkIndex++) {
                    const chunk = imageChunks[chunkIndex];
                    const currentSlideForImages = slidesArr[idx + chunkIndex];

                    if (!currentSlideForImages) break;

                    if (chunkIndex > 0) {
                        await setSlideBackground(presId, currentSlideForImages.objectId, themeStyles.backgroundColor, currentToken);
                    }

                    await addExperienceTextToSlide(presId, currentSlideForImages.objectId, exp, currentToken, themeStyles);

                    try {
                        for (let imageInChunkIndex = 0; imageInChunkIndex < chunk.length; imageInChunkIndex++) {
                            const imageUrl = chunk[imageInChunkIndex];

                            const imageWidth = 240;
                            const imageHeight = 160;
                            const imageX = 460;
                            const imageY_start = 50;
                            const imageMargin = 20;

                            const imagePosition = {
                                x: imageX,
                                y: imageY_start + (imageInChunkIndex * (imageHeight + imageMargin)),
                                width: imageWidth,
                                height: imageHeight
                            };

                            await addImageToSlide(presId, currentSlideForImages.objectId, imageUrl, currentToken, imagePosition);
                            processedImageCount++;
                            updatePptProgress(calculateSlideProgress(i, sortedExperiences.length) + 10 + (processedImageCount * 2), `이미지 ${processedImageCount} 삽입중`, i + 1, sortedExperiences.length, processedImageCount, totalImageCountForExp);
                        }
                    } catch (imageError) {
                        console.error(`슬라이드 ${idx + chunkIndex + 1}에 이미지 추가 실패:`, imageError);
                    }
                }
                idx += imageChunks.length;
            } else {
                await addExperienceTextToSlide(presId, s.objectId, exp, currentToken, themeStyles);
                idx++;
            }
        }
    }

    // 사진강조 템플릿 슬라이드 생성
    async function createPhotoTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor = 'light') {
        const themeStyles = getThemeStyles(selectedThemeColor);
        const experiencesWithImages = selectedExperiences.filter(exp => exp.imageUrls && exp.imageUrls.length > 0);
        
        let idx = 1;

        let slideCount = 0;
        const totalImages = experiencesWithImages.reduce((sum, exp) => sum + exp.imageUrls.length, 0);

        const titleStyle = {
            bold: true,
            fontSize: { magnitude: 20, unit: 'PT' },
            fontFamily: 'Arial',
            color: themeStyles.textColor
        };
        const periodStyle = {
            fontSize: { magnitude: 14, unit: 'PT' },
            fontFamily: 'Arial',
            color: themeStyles.textColor
        };
        const descStyle = {
            fontSize: { magnitude: 12, unit: 'PT' },
            fontFamily: 'Arial',
            color: themeStyles.textColor
        };

        for (let i = 0; i < experiencesWithImages.length; i++) {
            const exp = experiencesWithImages[i];
            
            for (let j = 0; j < exp.imageUrls.length; j++) {
                if (!slidesArr[idx]) break;
                const s = slidesArr[idx];
                
                slideCount++;
                updatePptProgress(calculateSlideProgress(slideCount - 1, totalImages), `사진 슬라이드 ${slideCount} 생성중`, slideCount, totalImages);

                const imageUrl = exp.imageUrls[j];

                await setSlideBackground(presId, s.objectId, themeStyles.backgroundColor, currentToken);

                try {
                    let dimensions;
                    try {
                        dimensions = await getImageDimensions(imageUrl);
                    } catch (dimError) {
                        console.warn('이미지 크기를 가져올 수 없어, 가로 모드로 기본 설정합니다.', dimError);
                        dimensions = { width: 1920, height: 1080 };
                    }

                    const isVertical = dimensions.width <= dimensions.height;

                    await addStyledTextBoxToSlide(presId, s.objectId, exp.title, currentToken, {
                        x: 50, y: 20, width: 620, height: 40
                    }, titleStyle);


                    if (isVertical) {
                        await addImageToSlide(presId, s.objectId, imageUrl, currentToken, {
                            x: 50, y: 70, width: 300, height: 320
                        });

                        await addStyledTextBoxToSlide(presId, s.objectId, exp.period, currentToken, {
                            x: 370, y: 70, width: 300, height: 30
                        }, periodStyle);

                        if (exp.description) {
                            await addStyledTextBoxToSlide(presId, s.objectId, exp.description, currentToken, {
                                x: 370, y: 110, width: 300, height: 280
                            }, descStyle);
                        }

                    } else {
                        await addStyledTextBoxToSlide(presId, s.objectId, exp.period, currentToken, {
                            x: 50, y: 60, width: 620, height: 30
                        }, periodStyle);

                        await addImageToSlide(presId, s.objectId, imageUrl, currentToken, {
                            x: 60, y: 100, width: 600, height: 250
                        });

                        if (exp.description) {
                            await addStyledTextBoxToSlide(presId, s.objectId, exp.description, currentToken, {
                                x: 50, y: 360, width: 620, height: 40
                            }, descStyle);
                        }
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
        accessToken,
        selectedThemeColor = 'light'
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
            } else {
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
                
                await makeTitleAndBody(presId, data.slides[0].objectId, currentToken, cleanTitle, userName, selectedThemeColor);
            }

            // 3) 템플릿별 슬라이드 추가 (기본 슬라이드만 먼저 생성)
            let totalSlides = selectedExperiences.length;
            if (templateName === 'timeline') {
                totalSlides = selectedExperiences.length + 1;
            } else if (templateName === 'photo') {
                const experiencesWithImages = selectedExperiences.filter(exp => exp.imageUrls && exp.imageUrls.length > 0);
                totalSlides = experiencesWithImages.reduce((sum, exp) => sum + exp.imageUrls.length, 0);
            }
            
            if (templateName === 'basic') {
                let totalSlidesForBasic = 0;
                for (const exp of selectedExperiences) {
                    totalSlidesForBasic++;
                    const imageCount = exp.imageUrls?.length || 0;
                    if (imageCount > 2) {
                        totalSlidesForBasic += Math.ceil((imageCount - 2) / 2);
                    }
                }
                for (let i = 0; i < totalSlidesForBasic; i++) {
                    await addSlide(presId, currentToken);
                }
            } else if (templateName === 'timeline') {
                await addSlide(presId, currentToken);
                let totalSlidesForTimeline = 0;
                for (const exp of selectedExperiences) {
                    totalSlidesForTimeline++;
                    const imageCount = exp.imageUrls?.length || 0;
                    if (imageCount > 2) {
                        totalSlidesForTimeline += Math.ceil((imageCount - 2) / 2);
                    }
                }
                for (let i = 0; i < totalSlidesForTimeline; i++) {
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
                await createBasicTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor);
            } else if (templateName === 'timeline') {
                await createTimelineTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor);
            } else if (templateName === 'photo') {
                await createPhotoTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor);
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
