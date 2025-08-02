// 구글 시트 API 서비스
class GoogleSheetsService {
  constructor() {
    this.clientId = '158941918402-insbhffbmi221j6s3v4hghlle67t6rt2.apps.googleusercontent.com';
    this.apiKey = 'AIzaSyCxMEd8FTlgZoYc4zu_E2nk6gA446iCGGA';
    this.discoveryDocs = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];
    this.scopes = 'https://www.googleapis.com/auth/spreadsheets';
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

      console.log('GAPI 초기화 시작, API 키:', this.apiKey ? '설정됨' : '설정되지 않음');

      // 이미 스크립트가 로드되어 있는지 확인
      if (window.gapi) {
        console.log('기존 GAPI 스크립트 사용');
        window.gapi.load('client', async () => {
          try {
            console.log('GAPI 클라이언트 초기화 중...');
            await window.gapi.client.init({
              apiKey: this.apiKey,
              discoveryDocs: this.discoveryDocs,
            });
            console.log('GAPI 클라이언트 초기화 완료');
            this.gapiInited = true;
            resolve();
          } catch (error) {
            console.error('GAPI 클라이언트 초기화 오류:', error);
            reject(error);
          }
        });
        return;
      }

      console.log('새 GAPI 스크립트 로드 중...');
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        console.log('GAPI 스크립트 로드 완료');
        window.gapi.load('client', async () => {
          try {
            console.log('GAPI 클라이언트 초기화 중...');
            await window.gapi.client.init({
              apiKey: this.apiKey,
              discoveryDocs: this.discoveryDocs,
            });
            console.log('GAPI 클라이언트 초기화 완료');
            this.gapiInited = true;
            resolve();
          } catch (error) {
            console.error('GAPI 클라이언트 초기화 오류:', error);
            reject(error);
          }
        });
      };
      script.onerror = (error) => {
        console.error('GAPI 스크립트 로드 오류:', error);
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
        // 토큰 요청이 성공적으로 시작되면 resolve
        setTimeout(() => resolve(), 100);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 스프레드시트 생성
  async createSpreadsheet(title) {
    try {
      // 토큰 상태 확인
      const token = window.gapi.client.getToken();
      console.log('시트 API 호출 전 토큰 상태:', token ? '설정됨' : '설정되지 않음');
      
      if (!token) {
        throw new Error('토큰이 설정되지 않았습니다. 구글 로그인을 다시 시도해주세요.');
      }
      
      // Sheets API가 로드되었는지 확인
      if (!window.gapi.client.sheets) {
        console.error('Sheets API가 로드되지 않았습니다.');
        throw new Error('구글 시트 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      console.log('Sheets API 로드 확인됨, 스프레드시트 생성 시작...');
      
      const response = await window.gapi.client.sheets.spreadsheets.create({
        properties: {
          title: title || '포트폴리오 이력'
        }
      });
      return response.result;
    } catch (error) {
      console.error('스프레드시트 생성 오류:', error);
      if (error.message.includes('403')) {
        throw new Error('구글 시트 API 권한이 없습니다. 구글 계정에서 시트 권한을 확인해주세요.');
      }
      throw new Error('스프레드시트 생성에 실패했습니다. 구글 API 설정을 확인해주세요.');
    }
  }

  // 시트에 데이터 추가
  async appendData(spreadsheetId, range, values) {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: values
        }
      });
      return response.result;
    } catch (error) {
      console.error('데이터 추가 오류:', error);
      throw new Error('데이터 저장에 실패했습니다. 권한을 확인해주세요.');
    }
  }

  // 데이터 읽기
  async readData(spreadsheetId, range) {
    try {
      console.log('시트 데이터 읽기 시작:', { spreadsheetId, range });
      
      // 토큰 상태 확인
      const token = window.gapi.client.getToken();
      console.log('시트 API 호출 전 토큰 상태:', token ? '설정됨' : '설정되지 않음');
      
      if (!token) {
        throw new Error('토큰이 설정되지 않았습니다. 구글 로그인을 다시 시도해주세요.');
      }
      
      // Sheets API가 로드되었는지 확인
      if (!window.gapi.client.sheets) {
        console.error('Sheets API가 로드되지 않았습니다.');
        throw new Error('구글 시트 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      console.log('Sheets API 로드 확인됨, 데이터 읽기 시작...');
      
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
      });
      
      console.log('시트 API 응답:', response);
      
      if (!response.result.values) {
        console.log('시트에 데이터가 없습니다.');
        return [];
      }
      
      console.log('읽어온 데이터:', response.result.values);
      return response.result.values;
    } catch (error) {
      console.error('데이터 읽기 오류 상세:', error);
      console.error('오류 메시지:', error.message);
      console.error('오류 코드:', error.code);
      console.error('오류 상태:', error.status);
      
      if (error.status === 403) {
        throw new Error('구글 시트 접근 권한이 없습니다. 스프레드시트 권한을 확인해주세요.');
      } else if (error.status === 404) {
        throw new Error('스프레드시트를 찾을 수 없습니다. 스프레드시트 ID를 확인해주세요.');
      } else if (error.message.includes('권한') || error.message.includes('permission')) {
        throw new Error('구글 시트 접근 권한이 없습니다. 구글 계정을 다시 로그인해주세요.');
      } else {
        throw new Error('데이터 로드에 실패했습니다. 스프레드시트 접근 권한을 확인해주세요.');
      }
    }
  }

  // 시트 데이터 업데이트
  async updateData(spreadsheetId, range, values) {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: values
        }
      });
      return response.result;
    } catch (error) {
      console.error('데이터 업데이트 오류:', error);
      throw new Error('데이터 업데이트에 실패했습니다.');
    }
  }

  // 시트 데이터 삭제
  async deleteData(spreadsheetId, range) {
    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: spreadsheetId,
        range: range
      });
      return response.result;
    } catch (error) {
      console.error('데이터 삭제 오류:', error);
      throw new Error('데이터 삭제에 실패했습니다.');
    }
  }

  // 이력 데이터를 시트 형식으로 변환
  formatExperienceForSheet(experience) {
    return [
      experience.title,
      experience.period,
      experience.description,
      new Date().toISOString() // 생성 시간
    ];
  }

  // 시트 데이터를 이력 형식으로 변환
  formatSheetToExperience(sheetData) {
    if (!sheetData || sheetData.length === 0) return [];
    
    // 헤더 제거 (첫 번째 행)
    const dataRows = sheetData.slice(1);
    
    return dataRows.map(row => ({
      title: row[0] || '',
      period: row[1] || '',
      description: row[2] || '',
      createdAt: row[3] || ''
    }));
  }

  // 초기 헤더 설정
  async setupHeaders(spreadsheetId) {
    const headers = [['제목', '기간', '설명', '생성시간']];
    return await this.updateData(spreadsheetId, 'A1:D1', headers);
  }

  // 스프레드시트 존재 여부 확인
  async checkSpreadsheetExists(spreadsheetId) {
    try {
      await this.readData(spreadsheetId, 'A1:A1');
      return true;
    } catch (error) {
      return false;
    }
  }

  // 사용자 권한 확인
  async checkUserPermissions(spreadsheetId) {
    try {
      await this.readData(spreadsheetId, 'A1:A1');
      return true;
    } catch (error) {
      throw new Error('스프레드시트에 대한 권한이 없습니다. 구글 계정을 확인해주세요.');
    }
  }

  // 에러 메시지 포맷팅
  formatErrorMessage(error) {
    const errorMessage = error?.message || error?.toString() || '알 수 없는 오류';
    
    console.error('구글 시트 오류 상세:', error);
    console.error('오류 메시지:', errorMessage);
    
    if (errorMessage.includes('권한') || errorMessage.includes('permission')) {
      return '구글 시트 접근 권한이 없습니다. 구글 계정을 다시 로그인해주세요.';
    } else if (errorMessage.includes('API') || errorMessage.includes('key') || errorMessage.includes('403')) {
      return '구글 API 설정에 문제가 있습니다. API 키와 권한을 확인해주세요.';
    } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      return 'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else {
      return `오류가 발생했습니다: ${errorMessage}`;
    }
  }
}

export default GoogleSheetsService; 