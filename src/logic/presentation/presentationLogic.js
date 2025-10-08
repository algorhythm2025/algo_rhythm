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
        loadPptForEdit
    };
}
