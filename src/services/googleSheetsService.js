// 구글 시트 API 서비스 (통합 인증 사용)
class GoogleSheetsService {
  constructor(authService) {
    if (!authService) {
      throw new Error('GoogleAuthService 인스턴스가 필요합니다.');
    }
    this.authService = authService;
  }

  // 인증 상태 확인
  async ensureAuthenticated() {
    if (!this.authService.isServiceAuthenticated('Sheets')) {
      throw new Error('구글 시트 서비스를 사용하기 위해 인증이 필요합니다.');
    }
  }

  // 스프레드시트 생성
  async createSpreadsheet(title, parentId = null) {
    try {
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      // Sheets API가 로드되었는지 확인
      if (!gapiClient.sheets) {
        throw new Error('구글 시트 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      console.log('Sheets API 로드 확인됨, 스프레드시트 생성 시작...');
      
      const response = await gapiClient.sheets.spreadsheets.create({
        properties: {
          title: title || '포트폴리오 이력'
        }
      });
      
      // 부모 폴더가 지정된 경우 파일을 해당 폴더로 이동
      if (parentId && response.result.spreadsheetId) {
        try {
          await gapiClient.drive.files.update({
            fileId: response.result.spreadsheetId,
            addParents: parentId,
            removeParents: 'root'
          });
          console.log('스프레드시트가 지정된 폴더로 이동됨');
        } catch (moveError) {
          console.warn('스프레드시트 폴더 이동 실패:', moveError);
          // 폴더 이동 실패해도 시트 생성은 성공으로 처리
        }
      }
      
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
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      const response = await gapiClient.sheets.spreadsheets.values.append({
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
      
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      // Sheets API가 로드되었는지 확인
      if (!gapiClient.sheets) {
        throw new Error('구글 시트 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      console.log('Sheets API 로드 확인됨, 데이터 읽기 시작...');
      
      const response = await gapiClient.sheets.spreadsheets.values.get({
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
      } else if (error.message.includes('인증이 필요합니다')) {
        throw new Error('구글 시트를 사용하기 위해 로그인이 필요합니다.');
      } else {
        throw new Error('데이터 로드에 실패했습니다. 스프레드시트 접근 권한을 확인해주세요.');
      }
    }
  }

  // 시트 데이터 업데이트
  async updateData(spreadsheetId, range, values) {
    try {
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      const response = await gapiClient.sheets.spreadsheets.values.update({
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
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      const response = await gapiClient.sheets.spreadsheets.values.clear({
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
      Array.isArray(experience.imageUrls) ? experience.imageUrls.join(', ') : (experience.imageUrl || ''), // 여러 이미지 URL을 쉼표로 구분
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
      imageUrls: row[3] ? row[3].split(', ').filter(url => url.trim()) : [], // 여러 이미지 URL을 쉼표로 구분하여 배열로 변환
      createdAt: row[4] || ''
    }));
  }

  // 초기 헤더 설정
  async setupHeaders(spreadsheetId) {
    const headers = [['제목', '기간', '설명', '이미지', '생성시간']];
    return await this.updateData(spreadsheetId, 'A1:E1', headers);
  }

  // 스프레드시트 존재 여부 확인
  async checkSpreadsheetExists(spreadsheetId) {
    try {
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      // Sheets API가 로드되었는지 확인
      if (!gapiClient.sheets) {
        throw new Error('구글 시트 API가 로드되지 않았습니다.');
      }
      
      // 스프레드시트 메타데이터만 가져와서 존재 여부 확인
      const response = await gapiClient.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        ranges: [],
        includeGridData: false
      });
      
      return response.result && response.result.spreadsheetId === spreadsheetId;
    } catch (error) {
      console.log('스프레드시트 존재 여부 확인 실패:', error.message);
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
    } else if (errorMessage.includes('인증이 필요합니다')) {
      return '구글 시트를 사용하기 위해 로그인이 필요합니다.';
    } else {
      return `오류가 발생했습니다: ${errorMessage}`;
    }
  }
}

export default GoogleSheetsService; 