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

      await this.ensureAuthenticated();

      const gapiClient = this.authService.getAuthenticatedGapiClient();

      // Sheets API가 로드되었는지 확인
      if (!gapiClient.sheets) {
        throw new Error('구글 시트 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }


      const response = await gapiClient.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
      });


      if (!response.result.values) {
        return [];
      }

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

      // range에서 행 번호 추출 (예: "A2:E2" -> 2)
      const rowNumber = parseInt(range.match(/\d+/)[0]);
      
      // 행 자체를 삭제 (values.clear 대신 batchUpdate 사용)
      const response = await gapiClient.sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // 첫 번째 시트
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // 0부터 시작하므로 -1
                endIndex: rowNumber // endIndex는 제외되므로 rowNumber
              }
            }
          }]
        }
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

    return dataRows
      .map(row => ({
        title: row[0] || '',
        period: row[1] || '',
        description: row[2] || '',
        imageUrls: row[3] ? row[3].split(', ').filter(url => url.trim()) : [], // 여러 이미지 URL을 쉼표로 구분하여 배열로 변환
        createdAt: row[4] || ''
      }))
      .filter(experience => {
        // 제목이 있는 이력만 유지 (빈 이력 제거)
        return experience.title && experience.title.trim() !== '';
      });
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

  // 이미지 URL을 썸네일 형식으로 변환
  convertImageUrlToThumbnail(imageUrl) {
    if (!imageUrl || imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    const fileIdMatch = imageUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
      return imageUrl;
    }

    const fileId = fileIdMatch[0];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  // 시트에서 이력 데이터 로드 (sheetsLogic에서 통합)
  async loadExperiencesFromSheets(spreadsheetId, setExperiences, preloadImage = null, shouldPreloadImages = false) {
    if (!spreadsheetId) return;

    try {
      const sheetData = await this.readData(spreadsheetId, 'A:E');
      const experiences = this.formatSheetToExperience(sheetData);
      
      // 이미지 URL은 원본 그대로 유지 (표시할 때 적절한 함수 사용)
      // experiences.forEach(exp => {
      //   if (exp.imageUrls && exp.imageUrls.length > 0) {
      //     exp.imageUrls = exp.imageUrls.map(url => this.convertImageUrlToThumbnail(url));
      //   }
      // });
      
      setExperiences(experiences);
      
      // 이미지 프리로딩 제거 - 필요할 때 로딩하는 것이 더 효율적
      // 프리로딩은 권한 설정 전에 실패할 가능성이 높고 불필요한 로그를 생성함
    } catch (error) {
      console.error('이력 데이터 로드 오류:', error);
      // 시트가 존재하지 않는 경우 로그만 출력하고 새로 생성하지 않음
      if (error.message.includes('찾을 수 없습니다') || error.status === 404) {
        // 사용자에게 알림
        alert('포트폴리오 시트가 삭제되었습니다. 로그아웃 후 다시 로그인해주세요.');
      }
    }
  }

  // 구글 시트 데이터 새로고침 (sheetsLogic에서 통합)
  async refreshSheetsData(loadExperiencesFromSheets, setIsExperienceLoading) {
    try {
      setIsExperienceLoading(true);
      await loadExperiencesFromSheets(null, true); // 새로고침 시에는 이미지 프리로딩 활성화
    } catch (error) {
      console.error('시트 데이터 새로고침 오류:', error);
      alert('데이터 새로고침에 실패했습니다: ' + (error?.message || error));
    } finally {
      setIsExperienceLoading(false);
    }
  }

  async createSheet(driveService, setPortfolioFolderId, setSpreadsheetId, loadDriveFiles, setIsSheetLoading) {
    if (!driveService.current) return;

    try {
      setIsSheetLoading(true);

      const portfolioFolder = await driveService.current.createPortfolioFolder();
      setPortfolioFolderId(portfolioFolder.id);
      localStorage.setItem('portfolioFolderId', portfolioFolder.id);

      await driveService.current.ensureImageFolder(portfolioFolder.id);

      const spreadsheet = await this.createSpreadsheet('포트폴리오 이력', portfolioFolder.id);
      const newSpreadsheetId = spreadsheet.spreadsheetId;

      setSpreadsheetId(newSpreadsheetId);
      localStorage.setItem('spreadsheetId', newSpreadsheetId);

      await this.setupHeaders(newSpreadsheetId);

      await loadDriveFiles();

      alert('포트폴리오 시트와 폴더가 생성되었습니다!');
    } catch (error) {
      console.error('시트 생성 오류:', error);
      alert('시트 생성에 실패했습니다: ' + (error?.message || error));
    } finally {
      setIsSheetLoading(false);
    }
  }

  // 시트 삭제 (sheetsLogic에서 통합)
  async deleteSheet(spreadsheetId, driveService, portfolioFolderId, setSpreadsheetId, setPortfolioFolderId, setExperiences, loadDriveFiles, setIsSheetLoading) {
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