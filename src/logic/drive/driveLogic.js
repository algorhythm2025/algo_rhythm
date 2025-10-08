// 구글 드라이브 관련 로직
export function useDriveLogic() {
    // 드라이브 파일 목록 로드
    async function loadDriveFiles(driveService, driveViewMode, portfolioFolderId, spreadsheetId, sheetsService, setDriveFiles, setIsDriveLoading, setSpreadsheetId) {
        if (!driveService.current) return;

        try {
            setIsDriveLoading(true);
            console.log('드라이브 파일 불러오기 시작, 뷰 모드:', driveViewMode);

            // 시트가 있다면 실제로 존재하는지 확인
            if (spreadsheetId && sheetsService.current) {
                try {
                    const exists = await sheetsService.current.checkSpreadsheetExists(spreadsheetId);
                    if (!exists) {
                        console.log('저장된 시트가 존재하지 않습니다. 상태를 초기화합니다.');
                        setSpreadsheetId(null);
                        localStorage.removeItem('spreadsheetId');
                    }
                } catch (error) {
                    console.log('시트 존재 확인 중 오류:', error);
                    setSpreadsheetId(null);
                    localStorage.removeItem('spreadsheetId');
                }
            }

            let files;
            if (driveViewMode === 'portfolio' && portfolioFolderId) {
                // 포트폴리오 폴더 내 파일만 로드
                files = await driveService.current.listFiles(50, portfolioFolderId);
                console.log('포트폴리오 폴더 파일:', files);
            } else {
                // 전체 파일 로드
                files = await driveService.current.listFiles(20);
                console.log('전체 드라이브 파일:', files);
            }

            setDriveFiles(files);
        } catch (error) {
            console.error('드라이브 파일 로드 오류:', error);
        } finally {
            setIsDriveLoading(false);
        }
    }

    // 파일 다운로드 (Access Token 사용)
    async function handleDriveFileDownload(file, driveService, authService, setIsLoading) {
        if (!driveService.current || !authService.current) return;
        try {
            setIsLoading(true);
            const accessToken = authService.current.getAccessToken();
            // 구글 문서류(import가 필요한 유형)는 export, 일반 파일은 alt=media
            const isGoogleDoc = file.mimeType?.includes('application/vnd.google-apps');
            const exportMap = {
                'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.google-apps.drawing': 'image/png',
            };

            const url = isGoogleDoc
                ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMap[file.mimeType] || 'application/pdf')}`
                : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

            const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
            if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
            const blob = await res.blob();

            // 파일명/확장자 보정
            let filename = file.name;
            if (isGoogleDoc) {
                const extMap = {
                    'application/vnd.google-apps.document': '.docx',
                    'application/vnd.google-apps.spreadsheet': '.xlsx',
                    'application/vnd.google-apps.presentation': '.pptx',
                    'application/vnd.google-apps.drawing': '.png',
                };
                if (!/\.[a-z0-9]+$/i.test(filename)) filename += (extMap[file.mimeType] || '.pdf');
            }

            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (e) {
            const msg = driveService.current?.formatErrorMessage?.(e) || e.message || '다운로드 오류';
            alert(msg);
        } finally {
            setIsLoading(false);
        }
    }

    // 파일 업로드 핸들러
    async function handleDriveFileUpload(event, driveService, currentPath, loadDriveFiles, setIsUploadLoading) {
        const file = event.target.files[0];
        if (!file || !driveService.current) return;

        try {
            setIsUploadLoading(true);
            await driveService.current.uploadFile(file.name, file, file.type);
            
            // 현재 경로를 유지하면서 파일 목록 새로고침
            const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
            await loadDriveFiles(currentParentId);
            
            alert('파일이 업로드되었습니다!');
        } catch (error) {
            const errorMessage = driveService.current?.formatErrorMessage(error) || '파일 업로드에 실패했습니다.';
            alert(errorMessage);
        } finally {
            setIsUploadLoading(false);
        }
    }

    // 파일 삭제 핸들러
    async function handleDriveFileDelete(fileId, isFromPptHistory, driveService, currentPath, loadDriveFiles, loadPptHistory, setDeletingFileIds) {
        if (!window.confirm('정말로 이 파일을 삭제하시겠습니까?') || !driveService.current) return;

        try {
            // 해당 파일 ID를 삭제 중 상태에 추가
            setDeletingFileIds(prev => new Set([...prev, fileId]));
            await driveService.current.deleteFile(fileId);
            
            if (isFromPptHistory) {
                // PPT 기록에서 삭제한 경우 PPT 기록 새로고침
                await loadPptHistory();
                console.log('PPT 기록이 새로고침되었습니다.');
            } else {
                // 드라이브 파일에서 삭제한 경우 드라이브 파일 목록 새로고침
                const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
                await loadDriveFiles(currentParentId);
            }
            
            alert('파일이 삭제되었습니다!');
        } catch (error) {
            const errorMessage = driveService.current?.formatErrorMessage(error) || '파일 삭제에 실패했습니다.';
            alert(errorMessage);
        } finally {
            // 해당 파일 ID를 삭제 중 상태에서 제거
            setDeletingFileIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(fileId);
                return newSet;
            });
        }
    }

    // 뷰 모드 전환
    async function switchViewMode(mode, setDriveViewMode, setCurrentPath, loadDriveFiles, setIsViewModeLoading) {
        try {
            setIsViewModeLoading(true);
            setDriveViewMode(mode);
            localStorage.setItem('driveViewMode', mode);
            setCurrentPath([]); // 경로 초기화
            await loadDriveFiles();
        } finally {
            setIsViewModeLoading(false);
        }
    }

    // 드라이브 새로고침
    async function handleDriveRefresh(currentPath, loadDriveFiles, setIsRefreshLoading) {
        try {
            setIsRefreshLoading(true);
            
            // 현재 경로를 유지하면서 파일 목록 새로고침
            const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
            await loadDriveFiles(currentParentId);
        } finally {
            setIsRefreshLoading(false);
        }
    }

    // 폴더 진입
    async function enterFolder(folderId, folderName, portfolioFolderId, setPortfolioFolderId, setDriveViewMode, setCurrentPath, loadDriveFiles, setIsViewModeLoading) {
        try {
            setIsViewModeLoading(true);
            
            // 포트폴리오 폴더인지 확인
            if (folderName === '포트폴리오 이력') {
                // 포트폴리오 폴더 ID가 설정되어 있으면 해당 ID와 비교
                if (portfolioFolderId && folderId === portfolioFolderId) {
                    // 포트폴리오 폴더인 경우 작업영역을 포트폴리오 폴더로 전환
                    setDriveViewMode('portfolio');
                    setCurrentPath([]); // 경로 초기화
                    await loadDriveFiles(); // 포트폴리오 폴더 내용 로드
                } else {
                    // 포트폴리오 폴더 ID가 설정되지 않은 경우, 폴더 이름으로만 확인
                    // 이 경우 포트폴리오 폴더 ID를 설정하고 작업영역 전환
                    setPortfolioFolderId(folderId);
                    localStorage.setItem('portfolioFolderId', folderId);
                    setDriveViewMode('portfolio');
                    setCurrentPath([]); // 경로 초기화
                    await loadDriveFiles(); // 포트폴리오 폴더 내용 로드
                }
            } else {
                // 일반 폴더인 경우 기존 로직 유지
                setCurrentPath(prev => [...prev, { id: folderId, name: folderName }]);
                await loadDriveFiles(folderId);
            }
        } finally {
            setIsViewModeLoading(false);
        }
    }

    // 뒤로가기
    async function goBack(currentPath, setCurrentPath, loadDriveFiles, setIsViewModeLoading) {
        if (currentPath.length === 0) return;

        try {
            setIsViewModeLoading(true);
            const newPath = currentPath.slice(0, -1);
            setCurrentPath(newPath);

            if (newPath.length === 0) {
                // 루트로 돌아가기
                await loadDriveFiles();
            } else {
                // 이전 폴더로 돌아가기
                const parentFolderId = newPath[newPath.length - 1].id;
                await loadDriveFiles(parentFolderId);
            }
        } finally {
            setIsViewModeLoading(false);
        }
    }

    // 파일 다운로드
    async function downloadFile(file, driveService, authService) {
        if (!driveService.current) return;

        try {
            // 구글 문서 파일인지 확인 (Google Docs, Sheets, Slides 등)
            const isGoogleDoc = file.mimeType && file.mimeType.includes('application/vnd.google-apps');

            if (isGoogleDoc) {
                // 구글 문서 파일은 export API 사용
                await downloadGoogleDoc(file, authService);
            } else {
                // 일반 파일은 직접 다운로드
                await downloadRegularFile(file, authService);
            }
        } catch (error) {
            console.error('파일 다운로드 오류:', error);
            alert('파일 다운로드에 실패했습니다: ' + (error?.message || error));
        }
    }

    // 구글 문서 파일 다운로드
    async function downloadGoogleDoc(file, authService) {
        try {
            const accessToken = authService.current?.getAccessToken();
            if (!accessToken) {
                throw new Error('인증 토큰이 없습니다.');
            }

            // MIME 타입에 따른 export 형식 결정
            let exportMimeType;
            let fileExtension;

            switch (file.mimeType) {
                case 'application/vnd.google-apps.spreadsheet':
                    exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                    fileExtension = '.xlsx';
                    break;
                case 'application/vnd.google-apps.document':
                    exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    fileExtension = '.docx';
                    break;
                case 'application/vnd.google-apps.presentation':
                    exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
                    fileExtension = '.pptx';
                    break;
                case 'application/vnd.google-apps.drawing':
                    exportMimeType = 'image/png';
                    fileExtension = '.png';
                    break;
                default:
                    exportMimeType = 'application/pdf';
                    fileExtension = '.pdf';
            }

            const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${exportMimeType}`;

            const response = await fetch(exportUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Export 실패: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = file.name + fileExtension;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 메모리 정리
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            console.error('구글 문서 다운로드 오류:', error);
            throw error;
        }
    }

    // 일반 파일 다운로드
    async function downloadRegularFile(file, authService) {
        try {
            const accessToken = authService.current?.getAccessToken();
            if (!accessToken) {
                throw new Error('인증 토큰이 없습니다.');
            }

            const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 메모리 정리
            window.URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error('일반 파일 다운로드 오류:', error);
            throw error;
        }
    }

    return {
        loadDriveFiles,
        handleDriveFileDownload,
        handleDriveFileUpload,
        handleDriveFileDelete,
        switchViewMode,
        handleDriveRefresh,
        enterFolder,
        goBack,
        downloadFile,
        downloadGoogleDoc,
        downloadRegularFile
    };
}
