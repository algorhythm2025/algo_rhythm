// PPT 생성 관련 로직
export function usePresentationLogic() {
    async function getImageDimensions(url, driveService = null) {
        // Google Drive URL인지 확인하고 파일 ID 추출
        const isGoogleDriveUrl = url.includes('drive.google.com') || url.includes('googleusercontent.com');
        let imageUrl = url;
        let blobUrl = null;

        // Google Drive URL이고 driveService가 제공된 경우, API를 통해 Blob URL 생성
        if (isGoogleDriveUrl && driveService?.current) {
            try {
                // 파일 ID 추출
                const fileIdMatch = url.match(/[-\w]{25,}/);
                if (fileIdMatch) {
                    const fileId = fileIdMatch[0];
                    blobUrl = await driveService.current.getImageAsBlobUrl(fileId);
                    imageUrl = blobUrl;
                }
            } catch (error) {
                console.warn('Google Drive API를 통한 이미지 로드 실패, 직접 URL 사용:', error);
                // 실패 시 원본 URL 사용 (fallback)
            }
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Blob URL 정리
                if (blobUrl) {
                    URL.revokeObjectURL(blobUrl);
                }
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = (err) => {
                // Blob URL 정리
                if (blobUrl) {
                    URL.revokeObjectURL(blobUrl);
                }
                console.error('이미지 크기 로드 실패:', url, err);
                resolve({ width: 1920, height: 1080 });
            };

            // Google Drive 직접 URL이 아닌 경우에만 crossOrigin 설정
            if (!isGoogleDriveUrl && url.startsWith('http')) {
                try {
                    img.crossOrigin = 'anonymous';
                } catch(e) {
                    console.warn('crossOrigin 설정 실패', e);
                }
            }

            img.src = imageUrl;
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
                                predefinedLayout: 'BLANK'
                            }
                        }
                    }
                ]
            })
        });
    }

    async function addMultipleSlides(presentationId, token, count) {
        if (count <= 0) return [];
        
        const requests = [];
        for (let i = 0; i < count; i++) {
            requests.push({
                createSlide: {
                    slideLayoutReference: {
                        predefinedLayout: 'BLANK'
                    }
                }
            });
        }

        const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests })
        });

        const result = await response.json();
        return result.replies?.map(reply => reply.createSlide?.objectId).filter(Boolean) || [];
    }

    async function batchUpdate(presentationId, token, requests) {
        if (requests.length === 0) return { replies: [] };
        
        const BATCH_SIZE = 50;
        const results = [];
        
        for (let i = 0; i < requests.length; i += BATCH_SIZE) {
            const batch = requests.slice(i, i + BATCH_SIZE);
            const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requests: batch })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`batchUpdate 실패: ${errorData.error?.message || '알 수 없는 오류'}`);
            }
            
            const result = await response.json();
            results.push(...(result.replies || []));
        }
        
        return { replies: results };
    }

    // 첫 슬라이드에 제목/부제목 설정 (레이아웃 변경 없이)
    async function makeTitleAndBody(presId, slideId, token, title, subtitle, selectedThemeColor = 'light', customBackgroundColor = null, customTextColor = null) {
        try {
            const themeStyles = getThemeStyles(selectedThemeColor, customBackgroundColor, customTextColor);
            
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
    async function loadPptHistory(driveService, setPptHistory, setIsLoading, portfolioFolderId) {
        if (!driveService.current) return;
        
        try {
            setIsLoading(true);
            
            let portfolioFolder;
            if (portfolioFolderId) {
                const gapiClient = driveService.current.authService.getAuthenticatedGapiClient();
                try {
                    const response = await gapiClient.drive.files.get({
                        fileId: portfolioFolderId,
                        fields: 'id, name, mimeType'
                    });
                    if (response.result && response.result.mimeType === 'application/vnd.google-apps.folder') {
                        portfolioFolder = response.result;
                    }
                } catch (error) {
                    portfolioFolder = await driveService.current.ensurePortfolioFolder();
                }
            } else {
                portfolioFolder = await driveService.current.ensurePortfolioFolder();
            }
            
            const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
            
            if (!pptFolder) {
                setPptHistory([]);
                return;
            }
            
            const gapiClient = driveService.current.authService.getAuthenticatedGapiClient();
            const response = await gapiClient.drive.files.list({
                q: `'${pptFolder.id}' in parents and mimeType='application/vnd.google-apps.presentation' and trashed=false`,
                fields: 'files(id, name, mimeType, createdTime, modifiedTime, size)',
                orderBy: 'createdTime desc'
            });
            
            const pptFiles = response.result.files || [];
            
            setPptHistory(pptFiles);
            
        } catch (error) {
            console.error('PPT 기록 조회 오류:', error);
            alert('PPT 기록을 불러오는데 실패했습니다: ' + (error?.message || error));
        } finally {
            setIsLoading(false);
        }
    }

    // PPT 수정을 위한 슬라이드 데이터 로드
    async function loadPptForEdit(pptId, authService, getPresentationData, setSlides, setPresentationId, setActiveSection, setIsLoading) {
        window.open(`https://docs.google.com/presentation/d/${pptId}/edit`, '_blank');
    }

    function calculateSlideProgress(currentSlide, totalSlides, hasImages = false) {
        const baseProgress = 25;
        const slideProgressRange = 55;
        
        if (totalSlides === 0) return baseProgress;
        
        const slideRatio = Math.min(currentSlide / totalSlides, 1);
        const calculatedProgress = baseProgress + (slideProgressRange * slideRatio);
        
        return Math.min(Math.max(calculatedProgress, baseProgress), 80);
    }

    // 테마 색상에 따른 스타일 반환 함수
    function getThemeStyles(selectedThemeColor, customBackgroundColor = null, customTextColor = null) {
        if (selectedThemeColor === 'custom' && customBackgroundColor && customTextColor) {
            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    red: parseInt(result[1], 16) / 255,
                    green: parseInt(result[2], 16) / 255,
                    blue: parseInt(result[3], 16) / 255
                } : null;
            };
            const bgRgb = hexToRgb(customBackgroundColor);
            const textRgb = hexToRgb(customTextColor);
            if (bgRgb && textRgb) {
                return {
                    backgroundColor: { rgbColor: bgRgb },
                    textColor: { opaqueColor: { rgbColor: textRgb } }
                };
            }
        }
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

            await batchUpdate(presId, token, requests);
        } catch (error) {
            console.error('슬라이드 배경색 설정 실패:', error);
        }
    }

    async function setMultipleSlideBackgrounds(presId, slideIds, backgroundColor, token) {
        if (slideIds.length === 0) return;
        
        const requests = slideIds.map(slideId => ({
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
        }));

        await batchUpdate(presId, token, requests);
    }

    async function setMultipleSlideBackgroundImages(presId, slideIds, imageUrl, token) {
        if (slideIds.length === 0 || !imageUrl) return;
        
        const requests = slideIds.map(slideId => ({
            updatePageProperties: {
                objectId: slideId,
                pageProperties: {
                    pageBackgroundFill: {
                        stretchedPictureFill: {
                            contentUrl: imageUrl
                        }
                    }
                },
                fields: 'pageBackgroundFill'
            }
        }));

        await batchUpdate(presId, token, requests);
    }

    async function addExperienceTextToSlideBatch(presId, slideId, exp, currentToken, themeStyles) {
        try {
            const objectId1 = `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const objectId2 = `textbox_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`;
            const objectId3 = `textbox_${Date.now() + 2}_${Math.random().toString(36).substr(2, 9)}`;

            const requests = [
                {
                    createShape: {
                        objectId: objectId1,
                        shapeType: 'TEXT_BOX',
                        elementProperties: {
                            pageObjectId: slideId,
                            size: {
                                width: { magnitude: 400, unit: 'PT' },
                                height: { magnitude: 60, unit: 'PT' }
                            },
                            transform: {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: 50,
                                translateY: 50,
                                unit: 'PT'
                            }
                        }
                    }
                },
                {
                    insertText: {
                        objectId: objectId1,
                        text: exp.title
                    }
                },
                {
                    updateTextStyle: {
                        objectId: objectId1,
                        style: {
                            bold: true,
                            fontSize: { magnitude: 24, unit: 'PT' },
                            fontFamily: 'Arial',
                            foregroundColor: themeStyles.textColor
                        },
                        fields: 'bold,fontSize,fontFamily,foregroundColor'
                    }
                },
                {
                    createShape: {
                        objectId: objectId2,
                        shapeType: 'TEXT_BOX',
                        elementProperties: {
                            pageObjectId: slideId,
                            size: {
                                width: { magnitude: 350, unit: 'PT' },
                                height: { magnitude: 40, unit: 'PT' }
                            },
                            transform: {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: 50,
                                translateY: 100,
                                unit: 'PT'
                            }
                        }
                    }
                },
                {
                    insertText: {
                        objectId: objectId2,
                        text: exp.period
                    }
                },
                {
                    updateTextStyle: {
                        objectId: objectId2,
                        style: {
                            fontSize: { magnitude: 14, unit: 'PT' },
                            fontFamily: 'Arial',
                            foregroundColor: themeStyles.textColor
                        },
                        fields: 'fontSize,fontFamily,foregroundColor'
                    }
                },
                {
                    createShape: {
                        objectId: objectId3,
                        shapeType: 'TEXT_BOX',
                        elementProperties: {
                            pageObjectId: slideId,
                            size: {
                                width: { magnitude: 300, unit: 'PT' },
                                height: { magnitude: 80, unit: 'PT' }
                            },
                            transform: {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: 50,
                                translateY: 150,
                                unit: 'PT'
                            }
                        }
                    }
                },
                {
                    insertText: {
                        objectId: objectId3,
                        text: exp.description
                    }
                },
                {
                    updateTextStyle: {
                        objectId: objectId3,
                        style: {
                            fontSize: { magnitude: 12, unit: 'PT' },
                            fontFamily: 'Arial',
                            foregroundColor: themeStyles.textColor
                        },
                        fields: 'fontSize,fontFamily,foregroundColor'
                    }
                }
            ];

            await batchUpdate(presId, currentToken, requests);
        } catch (textBoxError) {
            console.error(`슬라이드 ${slideId}에 텍스트박스 추가 실패:`, textBoxError);
        }
    }

    async function addExperienceTextToSlide(presId, slideId, exp, currentToken, themeStyles) {
        await addExperienceTextToSlideBatch(presId, slideId, exp, currentToken, themeStyles);
    }

    async function createBasicTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor = 'light', customBackgroundColor = null, customTextColor = null) {
        const themeStyles = getThemeStyles(selectedThemeColor, customBackgroundColor, customTextColor);
        
        let idx = 1;
        const allRequests = [];
        const slideIdsToSetBackground = [];
        
        for (let i = 0; i < selectedExperiences.length; i++) {
            const exp = selectedExperiences[i];
            if (!slidesArr[idx]) break;
            const s = slidesArr[idx];
            
            const progress = calculateSlideProgress(i + 1, selectedExperiences.length);
            updatePptProgress(progress, `슬라이드 ${i + 1} 생성중`, i + 1, selectedExperiences.length);
            
            slideIdsToSetBackground.push(s.objectId);
            
            if (exp.imageUrls && exp.imageUrls.length > 0) {
                const imageChunks = [];
                for (let j = 0; j < exp.imageUrls.length; j += 2) {
                    imageChunks.push(exp.imageUrls.slice(j, j + 2));
                }
                
                for (let chunkIndex = 0; chunkIndex < imageChunks.length; chunkIndex++) {
                    const chunk = imageChunks[chunkIndex];
                    const currentSlideForImages = slidesArr[idx + chunkIndex];
                    
                    if (!currentSlideForImages) break;
                    
                    if (chunkIndex > 0) {
                        slideIdsToSetBackground.push(currentSlideForImages.objectId);
                    }
                    
                    const textRequests = createExperienceTextRequests(currentSlideForImages.objectId, exp, themeStyles);
                    allRequests.push(...textRequests);
                    
                    const imageWidth = 240;
                    const imageHeight = 160;
                    const imageX = 460;
                    const imageY_start = 50;
                    const imageMargin = 20;
                    
                    for (let imageInChunkIndex = 0; imageInChunkIndex < chunk.length; imageInChunkIndex++) {
                        const imageUrl = chunk[imageInChunkIndex];
                        const imagePosition = {
                            x: imageX,
                            y: imageY_start + (imageInChunkIndex * (imageHeight + imageMargin)),
                            width: imageWidth,
                            height: imageHeight
                        };
                        
                        allRequests.push({
                            createImage: {
                                objectId: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                url: imageUrl,
                                elementProperties: {
                                    pageObjectId: currentSlideForImages.objectId,
                                    size: {
                                        width: { magnitude: imagePosition.width, unit: 'PT' },
                                        height: { magnitude: imagePosition.height, unit: 'PT' }
                                    },
                                    transform: {
                                        scaleX: 1,
                                        scaleY: 1,
                                        translateX: imagePosition.x,
                                        translateY: imagePosition.y,
                                        unit: 'PT'
                                    }
                                }
                            }
                        });
                    }
                }
                idx += imageChunks.length;
            } else {
                const textRequests = createExperienceTextRequests(s.objectId, exp, themeStyles);
                allRequests.push(...textRequests);
                idx++;
            }
        }
        
        if (slideIdsToSetBackground.length > 0) {
            await setMultipleSlideBackgrounds(presId, slideIdsToSetBackground, themeStyles.backgroundColor, currentToken);
        }
        
        if (allRequests.length > 0) {
            updatePptProgress(60, '슬라이드 내용 추가중');
            await batchUpdate(presId, currentToken, allRequests);
        }
        
        updatePptProgress(80, '기본 템플릿 슬라이드 생성 완료');
    }
    
    function createExperienceTextRequests(slideId, exp, themeStyles) {
        const objectId1 = `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const objectId2 = `textbox_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`;
        const objectId3 = `textbox_${Date.now() + 2}_${Math.random().toString(36).substr(2, 9)}`;
        
        return [
            {
                createShape: {
                    objectId: objectId1,
                    shapeType: 'TEXT_BOX',
                    elementProperties: {
                        pageObjectId: slideId,
                        size: {
                            width: { magnitude: 400, unit: 'PT' },
                            height: { magnitude: 60, unit: 'PT' }
                        },
                        transform: {
                            scaleX: 1,
                            scaleY: 1,
                            translateX: 50,
                            translateY: 50,
                            unit: 'PT'
                        }
                    }
                }
            },
            {
                insertText: {
                    objectId: objectId1,
                    text: exp.title
                }
            },
            {
                updateTextStyle: {
                    objectId: objectId1,
                    style: {
                        bold: true,
                        fontSize: { magnitude: 24, unit: 'PT' },
                        fontFamily: 'Arial',
                        foregroundColor: themeStyles.textColor
                    },
                    fields: 'bold,fontSize,fontFamily,foregroundColor'
                }
            },
            {
                createShape: {
                    objectId: objectId2,
                    shapeType: 'TEXT_BOX',
                    elementProperties: {
                        pageObjectId: slideId,
                        size: {
                            width: { magnitude: 350, unit: 'PT' },
                            height: { magnitude: 40, unit: 'PT' }
                        },
                        transform: {
                            scaleX: 1,
                            scaleY: 1,
                            translateX: 50,
                            translateY: 100,
                            unit: 'PT'
                        }
                    }
                }
            },
            {
                insertText: {
                    objectId: objectId2,
                    text: exp.period
                }
            },
            {
                updateTextStyle: {
                    objectId: objectId2,
                    style: {
                        fontSize: { magnitude: 14, unit: 'PT' },
                        fontFamily: 'Arial',
                        foregroundColor: themeStyles.textColor
                    },
                    fields: 'fontSize,fontFamily,foregroundColor'
                }
            },
            {
                createShape: {
                    objectId: objectId3,
                    shapeType: 'TEXT_BOX',
                    elementProperties: {
                        pageObjectId: slideId,
                        size: {
                            width: { magnitude: 300, unit: 'PT' },
                            height: { magnitude: 80, unit: 'PT' }
                        },
                        transform: {
                            scaleX: 1,
                            scaleY: 1,
                            translateX: 50,
                            translateY: 150,
                            unit: 'PT'
                        }
                    }
                }
            },
            {
                insertText: {
                    objectId: objectId3,
                    text: exp.description
                }
            },
            {
                updateTextStyle: {
                    objectId: objectId3,
                    style: {
                        fontSize: { magnitude: 12, unit: 'PT' },
                        fontFamily: 'Arial',
                        foregroundColor: themeStyles.textColor
                    },
                    fields: 'fontSize,fontFamily,foregroundColor'
                }
            }
        ];
    }

    async function createTimelineTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor = 'light', customBackgroundColor = null, customTextColor = null) {
        const themeStyles = getThemeStyles(selectedThemeColor, customBackgroundColor, customTextColor);
        const sortedExperiences = [...selectedExperiences].sort((a, b) => {
            const dateA = new Date(a.period.split(' - ')[0] || a.period.split('~')[0] || a.period);
            const dateB = new Date(b.period.split(' - ')[0] || b.period.split('~')[0] || b.period);
            return dateA - dateB;
        });

        let idx = 1;
        const allRequests = [];
        const slideIdsToSetBackground = [];

        if (slidesArr[idx]) {
            const overviewSlide = slidesArr[idx];
            updatePptProgress(25, '타임라인 개요 슬라이드 생성중');
            
            slideIdsToSetBackground.push(overviewSlide.objectId);
            
            const titleObjectId = `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            allRequests.push({
                createShape: {
                    objectId: titleObjectId,
                    shapeType: 'TEXT_BOX',
                    elementProperties: {
                        pageObjectId: overviewSlide.objectId,
                        size: {
                            width: { magnitude: 500, unit: 'PT' },
                            height: { magnitude: 60, unit: 'PT' }
                        },
                        transform: {
                            scaleX: 1,
                            scaleY: 1,
                            translateX: 50,
                            translateY: 50,
                            unit: 'PT'
                        }
                    }
                }
            });
            allRequests.push({
                insertText: {
                    objectId: titleObjectId,
                    text: '타임라인'
                }
            });
            allRequests.push({
                updateTextStyle: {
                    objectId: titleObjectId,
                    style: {
                        bold: true,
                        fontSize: { magnitude: 28, unit: 'PT' },
                        fontFamily: 'Arial',
                        foregroundColor: themeStyles.textColor
                    },
                    fields: 'bold,fontSize,fontFamily,foregroundColor'
                }
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

                const textObjectId = `textbox_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
                allRequests.push({
                    createShape: {
                        objectId: textObjectId,
                        shapeType: 'TEXT_BOX',
                        elementProperties: {
                            pageObjectId: overviewSlide.objectId,
                            size: {
                                width: { magnitude: colWidth, unit: 'PT' },
                                height: { magnitude: 30, unit: 'PT' }
                            },
                            transform: {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: currentX,
                                translateY: currentY,
                                unit: 'PT'
                            }
                        }
                    }
                });
                allRequests.push({
                    insertText: {
                        objectId: textObjectId,
                        text: timelineText
                    }
                });
                allRequests.push({
                    updateTextStyle: {
                        objectId: textObjectId,
                        style: {
                            fontSize: { magnitude: 14, unit: 'PT' },
                            fontFamily: 'Arial',
                            foregroundColor: themeStyles.textColor
                        },
                        fields: 'fontSize,fontFamily,foregroundColor'
                    }
                });
            }
            idx++;
        }

        for (let i = 0; i < sortedExperiences.length; i++) {
            const exp = sortedExperiences[i];
            if (!slidesArr[idx]) break;
            const s = slidesArr[idx];
            
            const progress = calculateSlideProgress(i + 1, sortedExperiences.length);
            updatePptProgress(progress, `타임라인 슬라이드 ${i + 1} 생성중`, i + 1, sortedExperiences.length);
            
            slideIdsToSetBackground.push(s.objectId);

            if (exp.imageUrls && exp.imageUrls.length > 0) {
                const imageChunks = [];
                for (let j = 0; j < exp.imageUrls.length; j += 2) {
                    imageChunks.push(exp.imageUrls.slice(j, j + 2));
                }

                for (let chunkIndex = 0; chunkIndex < imageChunks.length; chunkIndex++) {
                    const chunk = imageChunks[chunkIndex];
                    const currentSlideForImages = slidesArr[idx + chunkIndex];

                    if (!currentSlideForImages) break;

                    if (chunkIndex > 0) {
                        slideIdsToSetBackground.push(currentSlideForImages.objectId);
                    }

                    const textRequests = createExperienceTextRequests(currentSlideForImages.objectId, exp, themeStyles);
                    allRequests.push(...textRequests);

                    const imageWidth = 240;
                    const imageHeight = 160;
                    const imageX = 460;
                    const imageY_start = 50;
                    const imageMargin = 20;

                    for (let imageInChunkIndex = 0; imageInChunkIndex < chunk.length; imageInChunkIndex++) {
                        const imageUrl = chunk[imageInChunkIndex];
                        const imagePosition = {
                            x: imageX,
                            y: imageY_start + (imageInChunkIndex * (imageHeight + imageMargin)),
                            width: imageWidth,
                            height: imageHeight
                        };
                        
                        allRequests.push({
                            createImage: {
                                objectId: `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                url: imageUrl,
                                elementProperties: {
                                    pageObjectId: currentSlideForImages.objectId,
                                    size: {
                                        width: { magnitude: imagePosition.width, unit: 'PT' },
                                        height: { magnitude: imagePosition.height, unit: 'PT' }
                                    },
                                    transform: {
                                        scaleX: 1,
                                        scaleY: 1,
                                        translateX: imagePosition.x,
                                        translateY: imagePosition.y,
                                        unit: 'PT'
                                    }
                                }
                            }
                        });
                    }
                }
                idx += imageChunks.length;
            } else {
                const textRequests = createExperienceTextRequests(s.objectId, exp, themeStyles);
                allRequests.push(...textRequests);
                idx++;
            }
        }
        
        if (slideIdsToSetBackground.length > 0) {
            await setMultipleSlideBackgrounds(presId, slideIdsToSetBackground, themeStyles.backgroundColor, currentToken);
        }
        
        if (allRequests.length > 0) {
            updatePptProgress(60, '타임라인 슬라이드 내용 추가중');
            await batchUpdate(presId, currentToken, allRequests);
        }
        
        updatePptProgress(80, '타임라인 템플릿 슬라이드 생성 완료');
    }

    async function createPhotoTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor = 'light', customBackgroundColor = null, customTextColor = null, driveService = null) {
        const themeStyles = getThemeStyles(selectedThemeColor, customBackgroundColor, customTextColor);
        const experiencesWithImages = selectedExperiences.filter(exp => exp.imageUrls && exp.imageUrls.length > 0);
        
        let idx = 1;
        const allRequests = [];
        const slideIdsToSetBackground = [];
        const imageDimensionsPromises = [];

        const totalImages = experiencesWithImages.reduce((sum, exp) => sum + exp.imageUrls.length, 0);

        for (let i = 0; i < experiencesWithImages.length; i++) {
            const exp = experiencesWithImages[i];
            
            for (let j = 0; j < exp.imageUrls.length; j++) {
                if (!slidesArr[idx]) break;
                const s = slidesArr[idx];
                
                slideIdsToSetBackground.push(s.objectId);
                const imageUrl = exp.imageUrls[j];
                imageDimensionsPromises.push(getImageDimensions(imageUrl, driveService).catch(() => ({ width: 1920, height: 1080 })));
                
                idx++;
            }
        }

        updatePptProgress(30, '이미지 크기 확인중');
        const imageDimensions = await Promise.all(imageDimensionsPromises);

        idx = 1;
        let dimIndex = 0;

        for (let i = 0; i < experiencesWithImages.length; i++) {
            const exp = experiencesWithImages[i];
            
            for (let j = 0; j < exp.imageUrls.length; j++) {
                if (!slidesArr[idx]) break;
                const s = slidesArr[idx];
                
                const imageUrl = exp.imageUrls[j];
                const dimensions = imageDimensions[dimIndex++];
                const isVertical = dimensions.width <= dimensions.height;

                const titleObjectId = `textbox_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`;
                allRequests.push({
                    createShape: {
                        objectId: titleObjectId,
                        shapeType: 'TEXT_BOX',
                        elementProperties: {
                            pageObjectId: s.objectId,
                            size: {
                                width: { magnitude: 620, unit: 'PT' },
                                height: { magnitude: 40, unit: 'PT' }
                            },
                            transform: {
                                scaleX: 1,
                                scaleY: 1,
                                translateX: 50,
                                translateY: 20,
                                unit: 'PT'
                            }
                        }
                    }
                });
                allRequests.push({
                    insertText: {
                        objectId: titleObjectId,
                        text: exp.title
                    }
                });
                allRequests.push({
                    updateTextStyle: {
                        objectId: titleObjectId,
                        style: {
                            bold: true,
                            fontSize: { magnitude: 20, unit: 'PT' },
                            fontFamily: 'Arial',
                            foregroundColor: themeStyles.textColor
                        },
                        fields: 'bold,fontSize,fontFamily,foregroundColor'
                    }
                });

                if (isVertical) {
                    allRequests.push({
                        createImage: {
                            objectId: `image_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
                            url: imageUrl,
                            elementProperties: {
                                pageObjectId: s.objectId,
                                size: {
                                    width: { magnitude: 300, unit: 'PT' },
                                    height: { magnitude: 320, unit: 'PT' }
                                },
                                transform: {
                                    scaleX: 1,
                                    scaleY: 1,
                                    translateX: 50,
                                    translateY: 70,
                                    unit: 'PT'
                                }
                            }
                        }
                    });

                    const periodObjectId = `textbox_${Date.now()}_${idx}_period_${Math.random().toString(36).substr(2, 9)}`;
                    allRequests.push({
                        createShape: {
                            objectId: periodObjectId,
                            shapeType: 'TEXT_BOX',
                            elementProperties: {
                                pageObjectId: s.objectId,
                                size: {
                                    width: { magnitude: 300, unit: 'PT' },
                                    height: { magnitude: 30, unit: 'PT' }
                                },
                                transform: {
                                    scaleX: 1,
                                    scaleY: 1,
                                    translateX: 370,
                                    translateY: 70,
                                    unit: 'PT'
                                }
                            }
                        }
                    });
                    allRequests.push({
                        insertText: {
                            objectId: periodObjectId,
                            text: exp.period
                        }
                    });
                    allRequests.push({
                        updateTextStyle: {
                            objectId: periodObjectId,
                            style: {
                                fontSize: { magnitude: 14, unit: 'PT' },
                                fontFamily: 'Arial',
                                foregroundColor: themeStyles.textColor
                            },
                            fields: 'fontSize,fontFamily,foregroundColor'
                        }
                    });

                    if (exp.description) {
                        const descObjectId = `textbox_${Date.now()}_${idx}_desc_${Math.random().toString(36).substr(2, 9)}`;
                        allRequests.push({
                            createShape: {
                                objectId: descObjectId,
                                shapeType: 'TEXT_BOX',
                                elementProperties: {
                                    pageObjectId: s.objectId,
                                    size: {
                                        width: { magnitude: 300, unit: 'PT' },
                                        height: { magnitude: 280, unit: 'PT' }
                                    },
                                    transform: {
                                        scaleX: 1,
                                        scaleY: 1,
                                        translateX: 370,
                                        translateY: 110,
                                        unit: 'PT'
                                    }
                                }
                            }
                        });
                        allRequests.push({
                            insertText: {
                                objectId: descObjectId,
                                text: exp.description
                            }
                        });
                        allRequests.push({
                            updateTextStyle: {
                                objectId: descObjectId,
                                style: {
                                    fontSize: { magnitude: 12, unit: 'PT' },
                                    fontFamily: 'Arial',
                                    foregroundColor: themeStyles.textColor
                                },
                                fields: 'fontSize,fontFamily,foregroundColor'
                            }
                        });
                    }
                } else {
                    const periodObjectId = `textbox_${Date.now()}_${idx}_period_${Math.random().toString(36).substr(2, 9)}`;
                    allRequests.push({
                        createShape: {
                            objectId: periodObjectId,
                            shapeType: 'TEXT_BOX',
                            elementProperties: {
                                pageObjectId: s.objectId,
                                size: {
                                    width: { magnitude: 620, unit: 'PT' },
                                    height: { magnitude: 30, unit: 'PT' }
                                },
                                transform: {
                                    scaleX: 1,
                                    scaleY: 1,
                                    translateX: 50,
                                    translateY: 60,
                                    unit: 'PT'
                                }
                            }
                        }
                    });
                    allRequests.push({
                        insertText: {
                            objectId: periodObjectId,
                            text: exp.period
                        }
                    });
                    allRequests.push({
                        updateTextStyle: {
                            objectId: periodObjectId,
                            style: {
                                fontSize: { magnitude: 14, unit: 'PT' },
                                fontFamily: 'Arial',
                                foregroundColor: themeStyles.textColor
                            },
                            fields: 'fontSize,fontFamily,foregroundColor'
                        }
                    });

                    allRequests.push({
                        createImage: {
                            objectId: `image_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
                            url: imageUrl,
                            elementProperties: {
                                pageObjectId: s.objectId,
                                size: {
                                    width: { magnitude: 600, unit: 'PT' },
                                    height: { magnitude: 250, unit: 'PT' }
                                },
                                transform: {
                                    scaleX: 1,
                                    scaleY: 1,
                                    translateX: 60,
                                    translateY: 100,
                                    unit: 'PT'
                                }
                            }
                        }
                    });

                    if (exp.description) {
                        const descObjectId = `textbox_${Date.now()}_${idx}_desc_${Math.random().toString(36).substr(2, 9)}`;
                        allRequests.push({
                            createShape: {
                                objectId: descObjectId,
                                shapeType: 'TEXT_BOX',
                                elementProperties: {
                                    pageObjectId: s.objectId,
                                    size: {
                                        width: { magnitude: 620, unit: 'PT' },
                                        height: { magnitude: 40, unit: 'PT' }
                                    },
                                    transform: {
                                        scaleX: 1,
                                        scaleY: 1,
                                        translateX: 50,
                                        translateY: 360,
                                        unit: 'PT'
                                    }
                                }
                            }
                        });
                        allRequests.push({
                            insertText: {
                                objectId: descObjectId,
                                text: exp.description
                            }
                        });
                        allRequests.push({
                            updateTextStyle: {
                                objectId: descObjectId,
                                style: {
                                    fontSize: { magnitude: 12, unit: 'PT' },
                                    fontFamily: 'Arial',
                                    foregroundColor: themeStyles.textColor
                                },
                                fields: 'fontSize,fontFamily,foregroundColor'
                            }
                        });
                    }
                }

                idx++;
            }
        }
        
        if (slideIdsToSetBackground.length > 0) {
            await setMultipleSlideBackgrounds(presId, slideIdsToSetBackground, themeStyles.backgroundColor, currentToken);
        }
        
        if (allRequests.length > 0) {
            updatePptProgress(60, '사진 슬라이드 내용 추가중');
            await batchUpdate(presId, currentToken, allRequests);
        }
        
        updatePptProgress(80, '사진강조 템플릿 슬라이드 생성 완료');
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
        selectedThemeColor = 'light',
        selectedBgImage = null,
        customBackgroundColor = null,
        customTextColor = null
    }) {
        setIsPptCreating(true);
        setPptMessages([]);
        updatePptProgress(0, 'PPT 생성을 준비하고 있습니다...');
        
        const title = prompt('슬라이드 제목을 입력하세요:', '나의 포트폴리오');
        if (!title) {
            setIsPptCreating(false);
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
        
        updatePptProgress(2, '파일명을 확인하고 있습니다...');
        
        let finalFileName = baseFileName;
        try {
            const portfolioFolder = await driveService.current.ensurePortfolioFolder();
            const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
            
            if (pptFolder) {
                const existingFiles = await driveService.current.getFilesInFolder(pptFolder.id);
                
                const pptFiles = existingFiles.filter(file => 
                    file.mimeType === 'application/vnd.google-apps.presentation'
                );
                
                finalFileName = driveService.current.generateSequentialFileName(baseFileName, pptFiles);
            }
        } catch (error) {
            console.warn('PPT 파일명 중복 확인 실패, 기본 파일명 사용:', error);
        }

        updatePptProgress(5, '인증 정보를 확인하고 있습니다...');
        
        let currentToken = accessToken;
        if (!currentToken) {
            try {
                const isAuthenticated = await authService.current.isAuthenticated();
                if (!isAuthenticated) {
                    alert('인증이 필요합니다. 다시 로그인해주세요.');
                    setIsPptCreating(false);
                    return;
                }
                
                currentToken = await authService.current.getAccessToken();
                if (!currentToken) {
                    alert('액세스 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
                    setIsPptCreating(false);
                    return;
                }
                setAccessToken(currentToken);
            } catch (error) {
                console.error('토큰 가져오기 실패:', error);
                alert('인증이 필요합니다. 다시 로그인해주세요.');
                setIsPptCreating(false);
                return;
            }
        }

        setSelectedTemplate(templateName);
        updatePptProgress(10, 'PPT 생성을 시작합니다...');

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
                
                await makeTitleAndBody(presId, data.slides[0].objectId, currentToken, cleanTitle, userName, selectedThemeColor, customBackgroundColor, customTextColor);
            }

            // 3) 템플릿별 슬라이드 추가 (batchUpdate로 한 번에 생성)
            updatePptProgress(25, '슬라이드 생성중');
            
            if (templateName === 'basic') {
                let totalSlidesForBasic = 0;
                for (const exp of selectedExperiences) {
                    totalSlidesForBasic++;
                    const imageCount = exp.imageUrls?.length || 0;
                    if (imageCount > 2) {
                        totalSlidesForBasic += Math.ceil((imageCount - 2) / 2);
                    }
                }
                await addMultipleSlides(presId, currentToken, totalSlidesForBasic);
            } else if (templateName === 'timeline') {
                let totalSlidesForTimeline = 1;
                for (const exp of selectedExperiences) {
                    totalSlidesForTimeline++;
                    const imageCount = exp.imageUrls?.length || 0;
                    if (imageCount > 2) {
                        totalSlidesForTimeline += Math.ceil((imageCount - 2) / 2);
                    }
                }
                await addMultipleSlides(presId, currentToken, totalSlidesForTimeline);
            } else if (templateName === 'photo') {
                const experiencesWithImages = selectedExperiences.filter(exp => exp.imageUrls && exp.imageUrls.length > 0);
                let totalSlidesForPhoto = 0;
                for (let i = 0; i < experiencesWithImages.length; i++) {
                    const exp = experiencesWithImages[i];
                    totalSlidesForPhoto += exp.imageUrls.length;
                }
                await addMultipleSlides(presId, currentToken, totalSlidesForPhoto);
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
                await createBasicTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor, customBackgroundColor, customTextColor);
            } else if (templateName === 'timeline') {
                await createTimelineTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor, customBackgroundColor, customTextColor);
            } else if (templateName === 'photo') {
                await createPhotoTemplateSlides(presId, currentToken, slidesArr, selectedExperiences, updatePptProgress, calculateSlideProgress, selectedThemeColor, customBackgroundColor, customTextColor, driveService);
            }

            // 5-1) 배경 이미지가 있으면 드라이브에 업로드하고 모든 슬라이드에 적용
            let bgImageUrl = null;
            if (selectedBgImage) {
                try {
                    updatePptProgress(85, '배경 이미지 업로드 중...');
                    bgImageUrl = await driveService.current.uploadImageToDrive(selectedBgImage, 'PPT 배경 이미지');
                    
                    // 최신 슬라이드 데이터 가져오기
                    const refreshedData = await getPresentationData(presId, currentToken);
                    const allSlideIds = refreshedData.slides?.map(slide => slide.objectId) || [];
                    
                    if (allSlideIds.length > 0) {
                        updatePptProgress(90, '배경 이미지 적용 중...');
                        await setMultipleSlideBackgroundImages(presId, allSlideIds, bgImageUrl, currentToken);
                    }
                } catch (error) {
                    console.error('배경 이미지 업로드/적용 실패:', error);
                    alert('배경 이미지 적용에 실패했습니다. PPT는 생성되었지만 배경 이미지는 적용되지 않았습니다.');
                }
            }

            // 6) 최종 상태 반영
            const refreshed = await getPresentationData(presId, currentToken);
            setSlides(refreshed.slides || []);
            
            // 7) PPT 기록 새로고침
            updatePptProgress(95, '최종 정리중');
            await loadPptHistory();
            
            updatePptProgress(100, 'PPT 생성 완료!');
            alert('PPT가 생성되었습니다.');
            window.open(`https://docs.google.com/presentation/d/${presId}/edit`, '_blank');
            setActiveSection('pptMaker');
        } catch (error) {
            console.error('PPT 생성 오류:', error);
            alert('PPT 생성에 실패했습니다: ' + (error?.message || error));
        } finally {
            setIsPptCreating(false);
        }
    }

    return {
        createPresentation,
        addSlide,
        addMultipleSlides,
        batchUpdate,
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
