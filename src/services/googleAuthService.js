// GIS 기반 구글 인증 서비스 (단일 팝업에서 로그인+권한 처리)
class GoogleAuthService {
  constructor() {
    this.clientId = '158941918402-insbhffbmi221j6s3v4hghlle67t6rt2.apps.googleusercontent.com';
    this.apiKey = 'AIzaSyCxMEd8FTlgZoYc4zu_E2nk6gA446iCGGA';
    this.tokenClient = null;
    this.gapiInited = false;
    this.gisInited = false;
    this.accessToken = null;
    this.isInitializing = false;
    this.initializationPromise = null;

    // 이벤트 리스너들을 저장
    this.authStateListeners = [];
    this.errorListeners = [];
  }

  // 인증 상태 변경 이벤트 리스너 등록
  addAuthStateListener(listener) {
    this.authStateListeners.push(listener);
  }

  // 에러 이벤트 리스너 등록
  addErrorListener(listener) {
    this.errorListeners.push(listener);
  }

  // 이벤트 발생
  emitAuthStateChange(isAuthenticated) {
    this.authStateListeners.forEach(listener => listener(isAuthenticated));
  }

  emitError(error) {
    this.errorListeners.forEach(listener => listener(error));
  }

  // 전체 인증 시스템 초기화
  async initialize() {
    // 이미 초기화 중이면 기존 Promise 반환
    if (this.isInitializing) {
      return this.initializationPromise;
    }

    // 이미 초기화 완료되었으면 즉시 반환
    if (this.gapiInited && this.gisInited) {
      return Promise.resolve();
    }

    this.isInitializing = true;
    this.initializationPromise = this._performInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
    }

    return this.initializationPromise;
  }

  // 실제 초기화 수행
  async _performInitialization() {
    try {

      // 1. GAPI 초기화
      await this._initializeGapi();

      // 2. GIS 초기화
      await this._initializeGis();

      // 3. 저장된 토큰 불러오기
      const tokenLoaded = this._loadTokenFromStorage();
      if (tokenLoaded) {
        // 저장된 토큰을 GAPI에 설정
        const tokenData = JSON.parse(localStorage.getItem('google_token'));
        this._setTokenToGapi(tokenData);
      }

      this.emitAuthStateChange(this.isAuthenticated());

    } catch (error) {
      console.error('GIS 기반 인증 시스템 초기화 오류:', error);
      this.emitError(error);
      throw error;
    }
  }

  // GAPI 초기화
  async _initializeGapi() {
    if (this.gapiInited) {
      return;
    }

    return new Promise((resolve, reject) => {
      // 이미 스크립트가 로드되어 있는지 확인
      if (window.gapi) {
        this._setupGapi(resolve, reject);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        this._setupGapi(resolve, reject);
      };
      script.onerror = (error) => {
        console.error('GAPI 스크립트 로드 오류:', error);
        reject(new Error('GAPI 스크립트 로드 실패'));
      };
      document.head.appendChild(script);
    });
  }

  // GAPI 설정
  async _setupGapi(resolve, reject) {
    try {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: this.apiKey,
          });

          // Google Sheets, Drive, Slides, People API 로드
          await window.gapi.client.load('sheets', 'v4');
          await window.gapi.client.load('drive', 'v3');
          await window.gapi.client.load('slides', 'v1');
          await window.gapi.client.load('people', 'v1');

          this.gapiInited = true;
          resolve();
        } catch (error) {
          console.error('GAPI 클라이언트 초기화 오류:', error);
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  }

  // GIS 초기화
  async _initializeGis() {
    if (this.gisInited) {
      return;
    }

    return new Promise((resolve, reject) => {
      // 이미 스크립트가 로드되어 있는지 확인
      if (window.google && window.google.accounts) {
        this._setupGis(resolve, reject);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this._setupGis(resolve, reject);
      };
      script.onerror = (error) => {
        console.error('GIS 스크립트 로드 오류:', error);
        reject(new Error('GIS 스크립트 로드 실패'));
      };
      document.head.appendChild(script);
    });
  }

  // GIS 설정
  _setupGis(resolve, reject) {
    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/userinfo.profile',
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            this.emitAuthStateChange(true);
          }
          this.gisInited = true;
          resolve();
        },
      });
      this.gisInited = true;
      resolve();
    } catch (error) {
      reject(error);
    }
  }

  // 단일 팝업에서 로그인과 권한 요청
  async requestToken() {
    if (!this.tokenClient) {
      throw new Error('토큰 클라이언트가 초기화되지 않았습니다.');
    }

    // 이미 토큰이 있으면 새로 요청하지 않음
    if (this.accessToken) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {

        // 토큰 요청 콜백을 직접 처리
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            this.emitAuthStateChange(true);
            resolve();
          } else {
            reject(new Error('토큰 획득 실패'));
          }

          // 원래 콜백도 호출
          if (originalCallback) {
            originalCallback(tokenResponse);
          }
        };

        // 단일 팝업에서 로그인과 권한 요청
        this.tokenClient.requestAccessToken({ prompt: 'consent' });

        // 팝업이 뜨는 시점을 감지하여 스피너 중지
        // 팝업이 뜨면 스피너가 중지되도록 이벤트 발생
        setTimeout(() => {
          // 팝업이 뜨는 시점 (약 500ms 후)
          window.dispatchEvent(new CustomEvent('loginPopupOpened'));
        }, 500);

      } catch (error) {
        reject(error);
      }
    });
  }

  // 토큰 갱신 (팝업 없이)
  async refreshToken() {
    if (!this.tokenClient) {
      throw new Error('토큰 클라이언트가 초기화되지 않았습니다.');
    }

    return new Promise((resolve, reject) => {
      try {

        // 토큰 요청 콜백을 직접 처리
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse) => {

          // interaction_required 오류 처리
          if (tokenResponse && tokenResponse.error === 'interaction_required') {
            reject(new Error('interaction_required'));
            return;
          }

          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            this.emitAuthStateChange(true);
            resolve();
          } else {
            reject(new Error('토큰 갱신 실패'));
          }

          // 원래 콜백도 호출
          if (originalCallback) {
            originalCallback(tokenResponse);
          }
        };

        // 팝업 없이 토큰 갱신 시도
        this.tokenClient.requestAccessToken({ prompt: 'none' });

      } catch (error) {
        reject(error);
      }
    });
  }

  // 팝업 없이 토큰 요청 (자동 로그인)
  async requestTokenSilently() {
    if (!this.tokenClient) {
      throw new Error('토큰 클라이언트가 초기화되지 않았습니다.');
    }

    return new Promise((resolve, reject) => {
      try {

        // 토큰 요청 콜백을 직접 처리
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse) => {

          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            this.emitAuthStateChange(true);
            resolve();
          } else {
            reject(new Error('자동 토큰 요청 실패'));
          }

          // 원래 콜백도 호출
          if (originalCallback) {
            originalCallback(tokenResponse);
          }
        };

        // 팝업 없이 토큰 요청 시도
        this.tokenClient.requestAccessToken({ prompt: 'none' });

      } catch (error) {
        reject(error);
      }
    });
  }

  // 토큰을 GAPI 클라이언트에 설정
  _setTokenToGapi(tokenResponse) {
    if (window.gapi && window.gapi.client && tokenResponse) {
      window.gapi.client.setToken(tokenResponse);

      // 토큰을 localStorage에 저장
      this._saveTokenToStorage(tokenResponse);
      return true;
    }
    return false;
  }

  // 토큰을 localStorage에 저장
  _saveTokenToStorage(tokenResponse) {
    try {
      const tokenData = {
        access_token: tokenResponse.access_token,
        expires_in: tokenResponse.expires_in,
        token_type: tokenResponse.token_type,
        scope: tokenResponse.scope,
        saved_at: Date.now()
      };
      localStorage.setItem('google_token', JSON.stringify(tokenData));
    } catch (error) {
      console.error('토큰 저장 오류:', error);
    }
  }

  // localStorage에서 토큰 불러오기
  _loadTokenFromStorage() {
    try {
      const tokenData = localStorage.getItem('google_token');
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        const now = Date.now();
        const savedAt = parsed.saved_at || 0;
        const expiresIn = parsed.expires_in || 3600; // 기본 1시간
        const expirationTime = savedAt + (expiresIn * 1000);

        // 토큰이 아직 유효한지 확인 (5분 여유를 둠)
        if (now < expirationTime - 300000) {
          this.accessToken = parsed.access_token;
          return true;
        } else {
          localStorage.removeItem('google_token');
        }
      }
    } catch (error) {
      console.error('토큰 불러오기 오류:', error);
      localStorage.removeItem('google_token');
    }
    return false;
  }

  // 인증된 GAPI 클라이언트 반환
  getAuthenticatedGapiClient() {
    if (!this.gapiInited || !this.isAuthenticated()) {
      throw new Error('인증이 완료되지 않았습니다. initialize()를 먼저 호출하세요.');
    }
    return window.gapi.client;
  }

  // 인증된 토큰 반환
  getAccessToken() {
    return this.accessToken;
  }

  // 인증 상태 확인
  isAuthenticated() {
    const hasToken = this.accessToken !== null;
    const gapiHasToken = window.gapi && window.gapi.client && window.gapi.client.getToken();

    // 로그를 줄이기 위해 디버그 모드에서만 출력
    if (this._debugMode) {
      console.log('인증 상태 확인:', {
        gisInited: this.gisInited,
        gapiInited: this.gapiInited,
        hasAccessToken: hasToken,
        gapiHasToken: !!gapiHasToken
      });
    }

    return this.gisInited && this.gapiInited && (hasToken || gapiHasToken);
  }

  // 기존 토큰이 있는지 확인 (토큰 갱신 실패 시에도 기존 토큰 사용 가능한지 확인)
  hasExistingToken() {
    const hasToken = this.accessToken !== null;
    const gapiHasToken = window.gapi && window.gapi.client && window.gapi.client.getToken();

    // 로그를 줄이기 위해 디버그 모드에서만 출력
    if (this._debugMode) {
      console.log('기존 토큰 확인:', {
        hasAccessToken: hasToken,
        gapiHasToken: !!gapiHasToken
      });
    }

    return hasToken || gapiHasToken;
  }

  // 로그아웃
  logout() {

    // 로컬 상태 정리
    this.accessToken = null;

    // GAPI 클라이언트 토큰 제거
    if (window.gapi && window.gapi.client) {
      window.gapi.client.setToken(null);
    }

    // localStorage에서 토큰 제거
    localStorage.removeItem('google_token');

    // GIS 토큰 클라이언트 리셋
    this.tokenClient = null;
    this.gisInited = false;
    this.gapiInited = false;

    this.emitAuthStateChange(false);
  }

  // 인증 상태 검증 및 복구
  async validateAndRepairAuth() {
    if (!this.isAuthenticated()) {
      try {
        // 토큰 갱신 시도
        await this.requestToken();
        return true;
      } catch (error) {
        console.error('인증 복구 실패:', error);
        // 전체 재초기화 시도
        try {
          this.gapiInited = false;
          this.gisInited = false;
          await this.initialize();
          return true;
        } catch (reinitError) {
          console.error('재초기화 실패:', reinitError);
          return false;
        }
      }
    }
    return true;
  }

  // 서비스별 인증 상태 확인
  isServiceAuthenticated(serviceName) {
    const isAuth = this.isAuthenticated();
    // 로그를 줄이기 위해 디버그 모드에서만 출력
    if (this._debugMode) {
      console.log(`${serviceName} 서비스 인증 상태:`, isAuth);
    }
    return isAuth;
  }

  // 초기화 상태 확인
  getInitializationStatus() {
    return {
      gapiInited: this.gapiInited,
      gisInited: this.gisInited,
      isAuthenticated: this.isAuthenticated(),
      isInitializing: this.isInitializing
    };
  }

  // 구글 계정 사용자 정보 가져오기
  async getUserInfo() {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('인증이 필요합니다.');
      }

      const gapiClient = this.getAuthenticatedGapiClient();
      
      // Google People API를 사용하여 사용자 정보 가져오기
      const response = await gapiClient.people.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses'
      });

      const person = response.result;
      const name = person.names && person.names[0] ? person.names[0].displayName : '사용자';
      
      return name;
    } catch (error) {
      console.error('사용자 정보 가져오기 실패:', error);
      // People API가 실패하면 기본값 반환
      return '사용자';
    }
  }

  // 통합 인증 시스템 초기화 (authLogic에서 통합)
  async initializeGoogleAuth(setAuthStatus, setIsSheetsInitialized, setIsDriveInitialized, initializeServices) {
    try {
      // 인증 상태 변경 리스너 등록
      this.addAuthStateListener((isAuthenticated) => {
        setAuthStatus(isAuthenticated ? 'connected' : 'disconnected');
      });

      // 에러 리스너 등록
      this.addErrorListener((error) => {
        console.error('인증 에러 발생:', error);
        setAuthStatus('error');
      });

      // 통합 인증 초기화
      await this.initialize();

      // 인증 상태 확인 및 토큰 갱신 시도
      if (!this.isAuthenticated()) {
        try {
          // 토큰 갱신 시도 (팝업 없이)
          await this.refreshToken();
        } catch (tokenError) {

          // interaction_required 오류는 정상적인 상황으로 처리
          if (tokenError.message === 'interaction_required') {

            // 토큰 갱신이 실패해도 기존 토큰이 있다면 서비스 초기화를 시도
            if (this.hasExistingToken()) {
            } else {
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

  // GIS 기반 로그인 (단일 팝업에서 로그인+권한 처리) (authLogic에서 통합)
  async handleGISLogin(setIsLoading, saveLoginState, setActiveSection, initializeServices, setAccessToken) {
    try {
      // 통합 인증 시스템 초기화
      await this.initialize();

      // 단일 팝업에서 로그인과 권한 요청
      await this.requestToken();

      // 로그인 상태 저장 (이미 isLoggedIn이 true로 설정되어 있으므로 스프레드시트 ID만 전달)
      saveLoginState(true);

      // 메인 페이지로 이동 (저장된 섹션이 있으면 그대로 유지)
      const savedSection = localStorage.getItem('activeSection') || 'main';
      setActiveSection(savedSection);

      // 인증 완료 후 서비스들 초기화
      await initializeServices();

      // 액세스 토큰 설정
      try {
        const token = this.getAccessToken();
        setAccessToken(token);
      } catch (error) {
        console.error('토큰 가져오기 실패:', error);
      }

    } catch (error) {
      console.error('GIS 로그인 오류:', error);
      const errorMessage = error?.message || '로그인에 실패했습니다.';
      alert(errorMessage);
    }
    // setIsLoading은 appLogic.js에서 관리하므로 여기서는 제거
  }

  // 로그아웃 (authLogic에서 통합)
  logout(saveLoginState, setActiveSection, setPortfolioFolderId, setIsSheetsInitialized, setIsDriveInitialized, setAuthStatus, sheetsService, driveService) {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      // 통합 인증 서비스에서 로그아웃 (무한 재귀 방지를 위해 내부 로그아웃 메서드 호출)
      this._performLogout();

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

  // 내부 로그아웃 수행 (무한 재귀 방지)
  _performLogout() {

    // 로컬 상태 정리
    this.accessToken = null;

    // GAPI 클라이언트 토큰 제거
    if (window.gapi && window.gapi.client) {
      window.gapi.client.setToken(null);
    }

    // localStorage에서 토큰 제거
    localStorage.removeItem('google_token');

    // GIS 토큰 클라이언트 리셋
    this.tokenClient = null;
    this.gisInited = false;
    this.gapiInited = false;

    this.emitAuthStateChange(false);
  }

  // 로그인 상태 저장 (authLogic에서 통합)
  saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId) {
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

  // 구글 계정 이름 가져오기 (authLogic에서 통합)
  async getGoogleAccountName() {
    try {
      const gapiClient = this.getAuthenticatedGapiClient();
      
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

  async getGoogleAccountInfo() {
    try {
      const gapiClient = this.getAuthenticatedGapiClient();
      
      const response = await gapiClient.people.people.get({
        resourceName: 'people/me',
        personFields: 'names,emailAddresses,photos'
      });
      
      const person = response.result;
      const name = person.names && person.names[0] ? person.names[0].displayName || person.names[0].givenName || '사용자' : '사용자';
      const email = person.emailAddresses && person.emailAddresses[0] ? person.emailAddresses[0].value : '';
      const photoUrl = person.photos && person.photos[0] ? person.photos[0].url : null;
      
      return {
        name,
        email,
        photoUrl
      };
    } catch (error) {
      console.error('구글 계정 정보 가져오기 실패:', error);
      return {
        name: '사용자',
        email: '',
        photoUrl: null
      };
    }
  }
}

export default GoogleAuthService;

