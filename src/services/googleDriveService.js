// 구글 드라이브 API 서비스
class GoogleDriveService {
  constructor() {
    this.clientId = '158941918402-insbhffbmi221j6s3v4hghlle67t6rt2.apps.googleusercontent.com';
    this.apiKey = 'AIzaSyCxMEd8FTlgZoYc4zu_E2nk6gA446iCGGA';
    this.discoveryDocs = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
    this.scopes = 'https://www.googleapis.com/auth/drive';
    this.tokenClient = null;
    this.gapiInited = false;
    this.gisInited = false;
  }

  // GAPI 초기화
  async initializeGapi() {
    return new Promise((resolve, reject) => {
      if (this.gapiInited) {
        resolve();
        return;
      }

      console.log('드라이브 GAPI 초기화 시작, API 키:', this.apiKey ? '설정됨' : '설정되지 않음');

      // 이미 스크립트가 로드되어 있는지 확인
      if (window.gapi) {
        console.log('기존 드라이브 GAPI 스크립트 사용');
        window.gapi.load('client', async () => {
          try {
            console.log('드라이브 GAPI 클라이언트 초기화 중...');
            await window.gapi.client.init({
              apiKey: this.apiKey,
              discoveryDocs: this.discoveryDocs,
            });
            console.log('드라이브 GAPI 클라이언트 초기화 완료');
            this.gapiInited = true;
            resolve();
          } catch (error) {
            console.error('드라이브 GAPI 클라이언트 초기화 오류:', error);
            reject(error);
          }
        });
        return;
      }

      console.log('새 드라이브 GAPI 스크립트 로드 중...');
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        console.log('드라이브 GAPI 스크립트 로드 완료');
        window.gapi.load('client', async () => {
          try {
            console.log('드라이브 GAPI 클라이언트 초기화 중...');
            await window.gapi.client.init({
              apiKey: this.apiKey,
              discoveryDocs: this.discoveryDocs,
            });
            console.log('드라이브 GAPI 클라이언트 초기화 완료');
            this.gapiInited = true;
            resolve();
          } catch (error) {
            console.error('드라이브 GAPI 클라이언트 초기화 오류:', error);
            reject(error);
          }
        });
      };
      script.onerror = (error) => {
        console.error('드라이브 GAPI 스크립트 로드 오류:', error);
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
          scope: this.scopes,
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              this.gisInited = true;
              resolve();
            } else {
              reject(new Error('토큰 응답이 없습니다.'));
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
          scope: this.scopes,
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              this.gisInited = true;
              resolve();
            } else {
              reject(new Error('토큰 응답이 없습니다.'));
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
        this.tokenClient.requestAccessToken({ prompt: '' });
        setTimeout(() => resolve(), 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 파일 목록 가져오기
  async listFiles(pageSize = 10) {
    try {
      // 토큰 상태 확인
      const token = window.gapi.client.getToken();
      console.log('드라이브 API 호출 전 토큰 상태:', token ? '설정됨' : '설정되지 않음');
      
      if (!token) {
        throw new Error('토큰이 설정되지 않았습니다. 구글 로그인을 다시 시도해주세요.');
      }
      
      // Drive API가 로드되었는지 확인
      if (!window.gapi.client.drive) {
        console.error('Drive API가 로드되지 않았습니다.');
        throw new Error('구글 드라이브 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      console.log('Drive API 로드 확인됨, 파일 목록 가져오기 시작...');
      
      const response = await window.gapi.client.drive.files.list({
        pageSize: pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size)',
      });
      return response.result.files || [];
    } catch (error) {
      console.error('파일 목록 가져오기 오류:', error);
      if (error.message.includes('403')) {
        throw new Error('구글 드라이브 API 권한이 없습니다. 구글 계정에서 드라이브 권한을 확인해주세요.');
      }
      throw new Error('파일 목록을 가져오는데 실패했습니다.');
    }
  }

  // 폴더 생성
  async createFolder(name) {
    try {
      const response = await window.gapi.client.drive.files.create({
        resource: {
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id, name, mimeType',
      });
      return response.result;
    } catch (error) {
      console.error('폴더 생성 오류:', error);
      throw new Error('폴더 생성에 실패했습니다.');
    }
  }

  // 파일 업로드 (이미지 등 바이너리 포함)
  async uploadFile(name, file, mimeType = 'application/octet-stream') {
    try {
      const metadata = {
        name: name,
        mimeType: mimeType,
      };

      // gapi v3에서는 auth.getToken() 또는 client.getToken() 사용
      const accessToken = (window.gapi.auth && window.gapi.auth.getToken && window.gapi.auth.getToken().access_token)
        || (window.gapi.client && window.gapi.client.getToken && window.gapi.client.getToken().access_token);

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType',
        {
          method: 'POST',
          headers: new Headers({ Authorization: 'Bearer ' + accessToken }),
          body: form,
        }
      );
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      throw new Error('파일 업로드에 실패했습니다.');
    }
  }

  // 파일 삭제
  async deleteFile(fileId) {
    try {
      await window.gapi.client.drive.files.delete({
        fileId: fileId,
      });
      return true;
    } catch (error) {
      console.error('파일 삭제 오류:', error);
      throw new Error('파일 삭제에 실패했습니다.');
    }
  }

  // 파일 정보 가져오기
  async getFile(fileId) {
    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, createdTime, modifiedTime, size',
      });
      return response.result;
    } catch (error) {
      console.error('파일 정보 가져오기 오류:', error);
      throw new Error('파일 정보를 가져오는데 실패했습니다.');
    }
  }

  // 에러 메시지 포맷팅
  formatErrorMessage(error) {
    const errorMessage = error?.message || error?.toString() || '알 수 없는 오류';
    
    console.error('구글 드라이브 오류 상세:', error);
    console.error('오류 메시지:', errorMessage);
    
    if (errorMessage.includes('권한') || errorMessage.includes('permission')) {
      return '구글 드라이브 접근 권한이 없습니다. 구글 계정을 다시 로그인해주세요.';
    } else if (errorMessage.includes('API') || errorMessage.includes('key') || errorMessage.includes('403')) {
      return '구글 API 설정에 문제가 있습니다. API 키와 권한을 확인해주세요.';
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else {
      return `오류가 발생했습니다: ${errorMessage}`;
    }
  }
}

export default GoogleDriveService; 