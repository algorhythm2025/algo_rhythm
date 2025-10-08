import GoogleAuthService from '../../services/googleAuthService';

// 인증 관련 로직
export function useAuthLogic() {
    // 통합 인증 시스템 초기화
    async function initializeGoogleAuth(authService, setAuthStatus, setIsSheetsInitialized, setIsDriveInitialized, initializeServices) {
        try {
            console.log('통합 인증 시스템 초기화 시작...');

            // 인증 상태 변경 리스너 등록
            authService.addAuthStateListener((isAuthenticated) => {
                setAuthStatus(isAuthenticated ? 'connected' : 'disconnected');
                console.log('인증 상태 변경:', isAuthenticated);
            });

            // 에러 리스너 등록
            authService.addErrorListener((error) => {
                console.error('인증 에러 발생:', error);
                setAuthStatus('error');
            });

            // 통합 인증 초기화
            await authService.initialize();
            console.log('통합 인증 시스템 초기화 완료');

            // 인증 상태 확인 및 토큰 갱신 시도
            if (!authService.isAuthenticated()) {
                console.log('인증 상태가 유효하지 않습니다. 토큰 갱신을 시도합니다...');
                try {
                    // 토큰 갱신 시도 (팝업 없이)
                    await authService.refreshToken();
                    console.log('토큰 갱신 완료');
                } catch (tokenError) {
                    console.log('토큰 갱신 실패:', tokenError);

                    // interaction_required 오류는 정상적인 상황으로 처리
                    if (tokenError.message === 'interaction_required') {
                        console.log('사용자 상호작용이 필요한 상황입니다. 로그인 상태는 유지합니다.');

                        // 토큰 갱신이 실패해도 기존 토큰이 있다면 서비스 초기화를 시도
                        if (authService.hasExistingToken()) {
                            console.log('기존 토큰이 있습니다. 서비스 초기화를 시도합니다.');
                        } else {
                            console.log('기존 토큰이 없습니다. 서비스 초기화를 건너뜁니다.');
                            // 토큰이 없으면 서비스 초기화를 건너뜀 (로그인 상태는 유지)
                            setAuthStatus('disconnected');
                            setIsSheetsInitialized(false);
                            setIsDriveInitialized(false);
                            return;
                        }
                    } else {
                        // 다른 오류는 서비스 초기화를 건너뜀
                        setAuthStatus('disconnected');
                        setIsSheetsInitialized(false);
                        setIsDriveInitialized(false);
                        return;
                    }
                }
            }

            // 인증 완료 후 서비스들 초기화
            if (initializeServices) {
                await initializeServices();
            }

            return true; // 인증 성공
        } catch (error) {
            console.error('통합 인증 시스템 초기화 오류:', error);
            setAuthStatus('error');
            throw error;
        }
    }

    // GIS 기반 로그인 (단일 팝업에서 로그인+권한 처리)
    async function handleGISLogin(authService, setIsLoading, saveLoginState, setActiveSection, initializeServices, setAccessToken) {
        try {
            setIsLoading(true);
            console.log('GIS 기반 로그인 시작...');

            // 통합 인증 시스템 초기화
            await authService.initialize();
            console.log('인증 시스템 초기화 완료');

            // 단일 팝업에서 로그인과 권한 요청
            await authService.requestToken();
            console.log('GIS 로그인 및 권한 요청 완료');

            // 로그인 상태 저장 (이미 isLoggedIn이 true로 설정되어 있으므로 스프레드시트 ID만 전달)
            saveLoginState(true);

            // 메인 페이지로 이동 (저장된 섹션이 있으면 그대로 유지)
            const savedSection = localStorage.getItem('activeSection') || 'main';
            setActiveSection(savedSection);

            // 인증 완료 후 서비스들 초기화
            await initializeServices();

            // 액세스 토큰 설정
            try {
                const token = authService.getAccessToken();
                setAccessToken(token);
            } catch (error) {
                console.log('토큰 가져오기 실패:', error);
            }

        } catch (error) {
            console.error('GIS 로그인 오류:', error);
            const errorMessage = error?.message || '로그인에 실패했습니다.';
            alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }

    // 로그아웃
    function logout(authService, saveLoginState, setActiveSection, setPortfolioFolderId, setIsSheetsInitialized, setIsDriveInitialized, setAuthStatus, sheetsService, driveService) {
        if (window.confirm('로그아웃 하시겠습니까?')) {
            // 통합 인증 서비스에서 로그아웃
            authService.logout();

            // 로컬 상태 정리 (saveLoginState에서 스프레드시트 ID도 제거됨)
            saveLoginState(false);
            setActiveSection('main');
            localStorage.setItem('activeSection', 'main');
            localStorage.setItem('driveViewMode', 'all');
            localStorage.removeItem('portfolioFolderId');
            setPortfolioFolderId(null);
            setIsSheetsInitialized(false);
            setIsDriveInitialized(false);
            setAuthStatus('disconnected');

            // 서비스 인스턴스 정리
            sheetsService.current = null;
            driveService.current = null;
        }
    }

    // 로그인 상태 저장
    function saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId) {
        setIsLoggedIn(loggedIn);
        localStorage.setItem('isLoggedIn', loggedIn.toString());

        if (spreadsheetIdValue) {
            setSpreadsheetId(spreadsheetIdValue);
            localStorage.setItem('spreadsheetId', spreadsheetIdValue);
        }

        // 로그아웃 시에는 스프레드시트 ID도 제거
        if (!loggedIn) {
            localStorage.removeItem('spreadsheetId');
            setSpreadsheetId(null);
        }
    }

    // 구글 계정 이름 가져오기
    async function getGoogleAccountName(authService) {
        try {
            const gapiClient = authService.getAuthenticatedGapiClient();
            
            // Google People API를 사용하여 사용자 정보 가져오기
            const response = await gapiClient.people.people.get({
                resourceName: 'people/me',
                personFields: 'names'
            });
            
            const names = response.result.names;
            if (names && names.length > 0) {
                // 첫 번째 이름 반환 (일반적으로 주 이름)
                return names[0].displayName || names[0].givenName || '사용자';
            }
            
            return '사용자';
        } catch (error) {
            console.error('구글 계정 이름 가져오기 실패:', error);
            return '사용자';
        }
    }

    return {
        initializeGoogleAuth,
        handleGISLogin,
        logout,
        saveLoginState,
        getGoogleAccountName
    };
}
