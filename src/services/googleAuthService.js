// 구글 인증 공통 서비스
class GoogleAuthService {
  constructor() {
    this.clientId = '158941918402-insbhffbmi221j6s3v4hghlle67t6rt2.apps.googleusercontent.com';
    this.apiKey = 'AIzaSyCxMEd8FTlgZoYc4zu_E2nk6gA446iCGGA';
    this.tokenClient = null;
    this.gapiInited = false;
    this.gisInited = false;
    this.accessToken = null;
  }

  // GAPI 초기화
  async initializeGapi() {
    return new Promise((resolve, reject) => {
      if (this.gapiInited) {
        resolve();
        return;
      }

      console.log('공통 GAPI 초기화 시작, API 키:', this.apiKey ? '설정됨' : '설정되지 않음');

      // 이미 스크립트가 로드되어 있는지 확인
      if (window.gapi) {
        console.log('기존 공통 GAPI 스크립트 사용');
        window.gapi.load('client', async () => {
          try {
            console.log('공통 GAPI 클라이언트 초기화 중...');
            await window.gapi.client.init({
              apiKey: this.apiKey,
            });
            
            // Google Sheets와 Drive API 로드
            await window.gapi.client.load('sheets', 'v4');
            await window.gapi.client.load('drive', 'v3');
            console.log('공통 GAPI 클라이언트 초기화 완료 (Sheets, Drive API 로드됨)');
            this.gapiInited = true;
            resolve();
          } catch (error) {
            console.error('공통 GAPI 클라이언트 초기화 오류:', error);
            reject(error);
          }
        });
        return;
      }

      console.log('새 공통 GAPI 스크립트 로드 중...');
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        console.log('공통 GAPI 스크립트 로드 완료');
        window.gapi.load('client', async () => {
          try {
            console.log('공통 GAPI 클라이언트 초기화 중...');
            await window.gapi.client.init({
              apiKey: this.apiKey,
            });
            
            // Google Sheets와 Drive API 로드
            await window.gapi.client.load('sheets', 'v4');
            await window.gapi.client.load('drive', 'v3');
            console.log('공통 GAPI 클라이언트 초기화 완료 (Sheets, Drive API 로드됨)');
            this.gapiInited = true;
            resolve();
          } catch (error) {
            console.error('공통 GAPI 클라이언트 초기화 오류:', error);
            reject(error);
          }
        });
      };
      script.onerror = (error) => {
        console.error('공통 GAPI 스크립트 로드 오류:', error);
        reject(error);
      };
      document.head.appendChild(script);
    });
  }

  // GIS 초기화
  async initializeGis() {
    return new Promise((resolve, reject) => {
      if (this.gisInited) {
        resolve();
        return;
      }

      // 이미 스크립트가 로드되어 있는지 확인
      if (window.google && window.google.accounts) {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              this.accessToken = tokenResponse.access_token;
              // GAPI 클라이언트에 토큰 설정
              this.setTokenToGapi(tokenResponse);
              this.gisInited = true;
              console.log('공통 토큰 획득 및 설정 완료');
              resolve();
            } else {
              // 토큰이 없어도 초기화는 완료
              this.gisInited = true;
              console.log('토큰 없이 초기화 완료');
              resolve();
            }
          },
        });
        this.gisInited = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              this.accessToken = tokenResponse.access_token;
              // GAPI 클라이언트에 토큰 설정
              this.setTokenToGapi(tokenResponse);
              this.gisInited = true;
              console.log('공통 토큰 획득 및 설정 완료');
              resolve();
            } else {
              // 토큰이 없어도 초기화는 완료
              this.gisInited = true;
              console.log('토큰 없이 초기화 완료');
              resolve();
            }
          },
        });
        this.gisInited = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 인증 토큰 요청
  async requestToken() {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('토큰 클라이언트가 초기화되지 않았습니다.'));
        return;
      }

      try {
        // 이미 토큰이 있으면 새로 요청하지 않음
        if (this.accessToken) {
          console.log('이미 토큰이 있습니다.');
          resolve();
          return;
        }

        console.log('토큰 요청 시작...');
        
        // 토큰 요청 콜백을 직접 처리
        const originalCallback = this.tokenClient.callback;
        this.tokenClient.callback = (tokenResponse) => {
          console.log('토큰 응답 받음:', tokenResponse);
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            this.setTokenToGapi(tokenResponse);
            console.log('토큰 설정 완료');
          } else {
            console.log('토큰 응답에 액세스 토큰이 없음');
          }
          // 원래 콜백도 호출
          if (originalCallback) {
            originalCallback(tokenResponse);
          }
        };
        
        // 자동으로 토큰 요청 (팝업 없이)
        this.tokenClient.requestAccessToken({ prompt: 'none' });
        
        // 토큰 설정을 기다림
        setTimeout(() => {
          console.log('토큰 요청 후 상태:', {
            hasAccessToken: !!this.accessToken,
            gapiHasToken: !!(window.gapi && window.gapi.client && window.gapi.client.getToken())
          });
          
          // 토큰이 없으면 다시 시도 (팝업으로)
          if (!this.accessToken) {
            console.log('토큰이 없어서 팝업으로 다시 시도합니다...');
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
          }
          
          resolve();
        }, 3000);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 토큰 가져오기
  getAccessToken() {
    return this.accessToken;
  }

  // 토큰을 GAPI 클라이언트에 설정
  setTokenToGapi(tokenResponse) {
    if (window.gapi && window.gapi.client && tokenResponse) {
      window.gapi.client.setToken(tokenResponse);
      console.log('GAPI 클라이언트에 토큰 설정 완료');
      return true;
    }
    return false;
  }

  // 인증 상태 확인
  isAuthenticated() {
    const hasToken = this.accessToken !== null;
    const gapiHasToken = window.gapi && window.gapi.client && window.gapi.client.getToken();
    
    console.log('인증 상태 확인:', {
      gisInited: this.gisInited,
      hasAccessToken: hasToken,
      gapiHasToken: !!gapiHasToken
    });
    
    return this.gisInited && (hasToken || gapiHasToken);
  }
}

export default GoogleAuthService; 