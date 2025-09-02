// 구글 드라이브 API 서비스 (통합 인증 사용)
class GoogleDriveService {
  constructor(authService) {
    if (!authService) {
      throw new Error('GoogleAuthService 인스턴스가 필요합니다.');
    }
    this.authService = authService;
  }

  // 인증 상태 확인
  async ensureAuthenticated() {
    if (!this.authService.isServiceAuthenticated('Drive')) {
      throw new Error('구글 드라이브 서비스를 사용하기 위해 인증이 필요합니다.');
    }
  }

  // 파일 목록 가져오기
  async listFiles(pageSize = 10) {
    try {
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      // Drive API가 로드되었는지 확인
      if (!gapiClient.drive) {
        throw new Error('구글 드라이브 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }
      
      console.log('Drive API 로드 확인됨, 파일 목록 가져오기 시작...');
      
      const response = await gapiClient.drive.files.list({
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
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      const response = await gapiClient.drive.files.create({
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
      await this.ensureAuthenticated();
      
      const metadata = {
        name: name,
        mimeType: mimeType,
      };

      const accessToken = this.authService.getAccessToken();

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
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      await gapiClient.drive.files.delete({
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
      await this.ensureAuthenticated();
      
      const gapiClient = this.authService.getAuthenticatedGapiClient();
      
      const response = await gapiClient.drive.files.get({
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
    } else if (errorMessage.includes('인증이 필요합니다')) {
      return '구글 드라이브를 사용하기 위해 로그인이 필요합니다.';
    } else {
      return `오류가 발생했습니다: ${errorMessage}`;
    }
  }
}

export default GoogleDriveService; 