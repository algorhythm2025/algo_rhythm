// 구글 시트 관련 로직
export function useSheetsLogic() {
    // 시트에서 이력 데이터 로드
    async function loadExperiencesFromSheets(spreadsheetId, sheetsService, setExperiences, preloadImage) {
        if (!spreadsheetId || !sheetsService.current) return;

        try {
            const sheetData = await sheetsService.current.readData(spreadsheetId, 'A:E');
            const experiences = sheetsService.current.formatSheetToExperience(sheetData);
            setExperiences(experiences);
            
            // 이미지 프리로딩 (백그라운드에서 미리 로딩)
            experiences.forEach(exp => {
                if (exp.imageUrls && exp.imageUrls.length > 0) {
                    exp.imageUrls.forEach(imageUrl => {
                        preloadImage(imageUrl).catch(err => {
                            console.log('이미지 프리로딩 실패 (무시됨):', imageUrl, err);
                        });
                    });
                }
            });
        } catch (error) {
            console.error('이력 데이터 로드 오류:', error);
            // 시트가 존재하지 않는 경우 로그만 출력하고 새로 생성하지 않음
            if (error.message.includes('찾을 수 없습니다') || error.status === 404) {
                console.log('시트가 존재하지 않습니다. 시트를 다시 생성해주세요.');
                // 사용자에게 알림
                alert('포트폴리오 시트가 삭제되었습니다. 로그아웃 후 다시 로그인해주세요.');
            }
        }
    }

    // 구글 시트 데이터 새로고침
    async function refreshSheetsData(loadExperiencesFromSheets, setIsExperienceLoading) {
        try {
            setIsExperienceLoading(true);
            await loadExperiencesFromSheets();
        } catch (error) {
            console.error('시트 데이터 새로고침 오류:', error);
            alert('데이터 새로고침에 실패했습니다: ' + (error?.message || error));
        } finally {
            setIsExperienceLoading(false);
        }
    }

    // 시트 생성
    async function createSheet(sheetsService, driveService, setPortfolioFolderId, setSpreadsheetId, loadDriveFiles, setIsSheetLoading) {
        if (!sheetsService.current || !driveService.current) return;

        try {
            setIsSheetLoading(true);

            // 포트폴리오 이력 폴더 생성 또는 찾기
            const portfolioFolder = await driveService.current.ensurePortfolioFolder();
            setPortfolioFolderId(portfolioFolder.id);
            localStorage.setItem('portfolioFolderId', portfolioFolder.id);

            // 이미지 폴더도 생성
            await driveService.current.ensureImageFolder(portfolioFolder.id);

            // 시트 생성
            const spreadsheet = await sheetsService.current.createSpreadsheet('포트폴리오 이력', portfolioFolder.id);
            const newSpreadsheetId = spreadsheet.spreadsheetId;

            // 상태 업데이트
            setSpreadsheetId(newSpreadsheetId);
            localStorage.setItem('spreadsheetId', newSpreadsheetId);

            // 헤더 설정
            await sheetsService.current.setupHeaders(newSpreadsheetId);

            // 파일 목록 새로고침
            await loadDriveFiles();

            alert('포트폴리오 시트와 폴더가 생성되었습니다!');
        } catch (error) {
            console.error('시트 생성 오류:', error);
            alert('시트 생성에 실패했습니다: ' + (error?.message || error));
        } finally {
            setIsSheetLoading(false);
        }
    }

    // 시트 삭제
    async function deleteSheet(spreadsheetId, driveService, portfolioFolderId, setSpreadsheetId, setPortfolioFolderId, setExperiences, loadDriveFiles, setIsSheetLoading) {
        if (!spreadsheetId || !driveService.current) return;

        if (!window.confirm('포트폴리오 시트와 포트폴리오 이력 폴더를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            setIsSheetLoading(true);

            // 시트 파일 삭제
            await driveService.current.deleteFile(spreadsheetId);

            // 포트폴리오 이력 폴더도 삭제
            if (portfolioFolderId) {
                try {
                    await driveService.current.deleteFile(portfolioFolderId);
                    console.log('포트폴리오 이력 폴더도 삭제됨');
                } catch (folderError) {
                    console.warn('포트폴리오 폴더 삭제 실패:', folderError);
                }
            }

            // 상태 초기화
            setSpreadsheetId(null);
            localStorage.removeItem('spreadsheetId');
            setPortfolioFolderId(null);
            localStorage.removeItem('portfolioFolderId');
            setExperiences([]);

            // 강제로 상태 업데이트
            setTimeout(() => {
                setSpreadsheetId(null);
                setPortfolioFolderId(null);
            }, 100);

            // 파일 목록 새로고침
            await loadDriveFiles();

            alert('포트폴리오 시트와 폴더가 삭제되었습니다!');
        } catch (error) {
            console.error('시트 삭제 오류:', error);
            alert('시트 삭제에 실패했습니다: ' + (error?.message || error));
        } finally {
            setIsSheetLoading(false);
        }
    }

    return {
        loadExperiencesFromSheets,
        refreshSheetsData,
        createSheet,
        deleteSheet
    };
}
