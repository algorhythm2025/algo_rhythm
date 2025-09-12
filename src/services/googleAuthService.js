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
      console.log('GIS 기반 인증 시스템 초기화 시작...');

      // 1. GAPI 초기화
      await this._initializeGapi();
      console.log('GAPI 초기화 완료');

      // 2. GIS 초기화
      await this._initializeGis();
      console.log('GIS 초기화 완료');

      // 3. 저장된 토큰 불러오기
      const tokenLoaded = this._loadTokenFromStorage();
      if (tokenLoaded) {
        // 저장된 토큰을 GAPI에 설정
        const tokenData = JSON.parse(localStorage.getItem('google_token'));
        this._setTokenToGapi(tokenData);
      }

      console.log('GIS 기반 인증 시스템 초기화 완료');
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
        console.log('기존 GAPI 스크립트 사용');
        this._setupGapi(resolve, reject);
        return;
      }

      console.log('새 GAPI 스크립트 로드 중...');
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        console.log('GAPI 스크립트 로드 완료');
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
          console.log('GAPI 클라이언트 초기화 중...');
          await window.gapi.client.init({
            apiKey: this.apiKey,
          });

          // Google Sheets, Drive, Slides API 로드
          await window.gapi.client.load('sheets', 'v4');
          await window.gapi.client.load('drive', 'v3');
          await window.gapi.client.load('slides', 'v1');

          console.log('GAPI 클라이언트 초기화 완료 (Sheets, Drive, Slides API 로드됨)');
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
        console.log('기존 GIS 스크립트 사용');
        this._setupGis(resolve, reject);
        return;
      }

      console.log('새 GIS 스크립트 로드 중...');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        console.log('GIS 스크립트 로드 완료');
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
        scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/presentations',
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            console.log('토큰 획득 및 설정 완료');
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
      console.log('이미 토큰이 있습니다.');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('단일 팝업에서 로그인과 권한 요청 시작...');

        // 토큰 요청 콜백을 직접 처리
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse) => {
          console.log('토큰 응답 받음:', tokenResponse);
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            console.log('토큰 설정 완료');
            this.emitAuthStateChange(true);
            resolve();
          } else {
            console.log('토큰 응답에 액세스 토큰이 없음');
            reject(new Error('토큰 획득 실패'));
          }

          // 원래 콜백도 호출
          if (originalCallback) {
            originalCallback(tokenResponse);
          }
        };

        // 단일 팝업에서 로그인과 권한 요청
        console.log('단일 팝업에서 로그인과 권한 요청합니다...');
        this.tokenClient.requestAccessToken({ prompt: 'consent' });

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
        console.log('토큰 갱신 시도 (팝업 없이)...');

        // 토큰 요청 콜백을 직접 처리
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse) => {
          console.log('토큰 갱신 응답 받음:', tokenResponse);

          // interaction_required 오류 처리
          if (tokenResponse && tokenResponse.error === 'interaction_required') {
            console.log('사용자 상호작용이 필요합니다. 토큰 갱신을 건너뜁니다.');
            reject(new Error('interaction_required'));
            return;
          }

          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            console.log('토큰 갱신 완료');
            this.emitAuthStateChange(true);
            resolve();
          } else {
            console.log('토큰 갱신 실패 - 액세스 토큰이 없음');
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
        console.log('팝업 없이 토큰 요청 시도...');

        // 토큰 요청 콜백을 직접 처리
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse) => {
          console.log('자동 토큰 요청 응답 받음:', tokenResponse);

          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this._setTokenToGapi(tokenResponse);
            console.log('자동 토큰 요청 완료');
            this.emitAuthStateChange(true);
            resolve();
          } else {
            console.log('자동 토큰 요청 실패 - 액세스 토큰이 없음');
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
      console.log('GAPI 클라이언트에 토큰 설정 완료');

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
      console.log('토큰을 localStorage에 저장 완료');
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
          console.log('localStorage에서 토큰 불러오기 완료');
          return true;
        } else {
          console.log('저장된 토큰이 만료되었습니다.');
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

    console.log('인증 상태 확인:', {
      gisInited: this.gisInited,
      gapiInited: this.gapiInited,
      hasAccessToken: hasToken,
      gapiHasToken: !!gapiHasToken
    });

    return this.gisInited && this.gapiInited && (hasToken || gapiHasToken);
  }

  // 기존 토큰이 있는지 확인 (토큰 갱신 실패 시에도 기존 토큰 사용 가능한지 확인)
  hasExistingToken() {
    const hasToken = this.accessToken !== null;
    const gapiHasToken = window.gapi && window.gapi.client && window.gapi.client.getToken();

    console.log('기존 토큰 확인:', {
      hasAccessToken: hasToken,
      gapiHasToken: !!gapiHasToken
    });

    return hasToken || gapiHasToken;
  }

  // 로그아웃
  logout() {
    console.log('GIS 로그아웃 시작...');

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
    console.log('GIS 로그아웃 완료');
  }

  // 인증 상태 검증 및 복구
  async validateAndRepairAuth() {
    if (!this.isAuthenticated()) {
      console.log('인증 상태가 유효하지 않습니다. 복구를 시도합니다...');

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
    console.log(`${serviceName} 서비스 인증 상태:`, isAuth);
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
}

export default GoogleAuthService;
