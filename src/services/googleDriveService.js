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
  async listFiles(pageSize = 10, parentId = null) {
    try {
      await this.ensureAuthenticated();

      const gapiClient = this.authService.getAuthenticatedGapiClient();

      // Drive API가 로드되었는지 확인
      if (!gapiClient.drive) {
        throw new Error('구글 드라이브 API가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      }

      console.log('Drive API 로드 확인됨, 파일 목록 가져오기 시작...');

      let query = 'trashed=false';
      if (parentId) {
        // 특정 폴더 내 파일만 가져오기
        query += ` and '${parentId}' in parents`;
      } else {
        // 루트 레벨의 파일과 폴더만 가져오기 (중첩된 폴더 제외)
        query += ` and 'root' in parents`;
      }

      const response = await gapiClient.drive.files.list({
        q: query,
        pageSize: pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size, parents)',
      });

      const files = response.result.files || [];

      // 클라이언트 측에서 추가 필터링 (소유자 확인)
      const myFiles = files.filter(file => {
        // 현재 사용자가 소유한 파일만 필터링
        return true; // 일단 모든 파일을 반환 (소유자 필터링은 나중에 추가)
      });

      return myFiles;
    } catch (error) {
      console.error('파일 목록 가져오기 오류:', error);
      if (error.message.includes('403')) {
        throw new Error('구글 드라이브 API 권한이 없습니다. 구글 계정에서 드라이브 권한을 확인해주세요.');
      }
      throw new Error('파일 목록을 가져오는데 실패했습니다.');
    }
  }

  // 폴더 생성
  async createFolder(name, parentId = null) {
    try {
      await this.ensureAuthenticated();

      const gapiClient = this.authService.getAuthenticatedGapiClient();

      const folderResource = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
      };

      // 부모 폴더가 지정된 경우 parents 배열에 추가
      if (parentId) {
        folderResource.parents = [parentId];
      }

      const response = await gapiClient.drive.files.create({
        resource: folderResource,
        fields: 'id, name, mimeType',
      });
      return response.result;
    } catch (error) {
      console.error('폴더 생성 오류:', error);
      throw new Error('폴더 생성에 실패했습니다.');
    }
  }

  // 폴더 검색
  async findFolder(folderName, parentId = null) {
    try {
      await this.ensureAuthenticated();

      const gapiClient = this.authService.getAuthenticatedGapiClient();

      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      // 부모 폴더가 지정된 경우 해당 폴더 안에서만 검색
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const response = await gapiClient.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType)',
      });

      return response.result.files && response.result.files.length > 0 ? response.result.files[0] : null;
    } catch (error) {
      console.error('폴더 검색 오류:', error);
      throw new Error('폴더 검색에 실패했습니다.');
    }
  }

  // 포트폴리오 이력 폴더 생성 또는 찾기
  async ensurePortfolioFolder() {
    try {
      // 먼저 기존 폴더가 있는지 확인
      let portfolioFolder = await this.findFolder('포트폴리오 이력');

      if (!portfolioFolder) {
        // 폴더가 없으면 생성
        portfolioFolder = await this.createFolder('포트폴리오 이력');
        console.log('포트폴리오 이력 폴더 생성됨:', portfolioFolder.id);
        
        // 포트폴리오 폴더 생성 시 하위 폴더들도 함께 생성
        await this.createFolder('image', portfolioFolder.id);
        await this.createFolder('PPT', portfolioFolder.id);
        console.log('포트폴리오 하위 폴더들 생성됨: image, PPT');
      } else {
        console.log('기존 포트폴리오 이력 폴더 발견:', portfolioFolder.id);
      }

      return portfolioFolder;
    } catch (error) {
      console.error('포트폴리오 이력 폴더 확인/생성 오류:', error);
      throw new Error('포트폴리오 이력 폴더를 확인하거나 생성하는데 실패했습니다.');
    }
  }

  // 이미지 폴더 생성 또는 찾기
  async ensureImageFolder(portfolioFolderId) {
    try {
      // 먼저 기존 이미지 폴더가 있는지 확인
      let imageFolder = await this.findFolder('image', portfolioFolderId);

      if (!imageFolder) {
        // 폴더가 없으면 생성
        imageFolder = await this.createFolder('image', portfolioFolderId);
        console.log('이미지 폴더 생성됨:', imageFolder.id);
      } else {
        console.log('기존 이미지 폴더 발견:', imageFolder.id);
      }

      return imageFolder;
    } catch (error) {
      console.error('이미지 폴더 확인/생성 오류:', error);
      throw new Error('이미지 폴더를 확인하거나 생성하는데 실패했습니다.');
    }
  }

  // PPT 폴더 생성 또는 찾기
  async ensurePptFolder(portfolioFolderId) {
    try {
      // 먼저 기존 PPT 폴더가 있는지 확인
      let pptFolder = await this.findFolder('PPT', portfolioFolderId);

      if (!pptFolder) {
        // 폴더가 없으면 생성
        pptFolder = await this.createFolder('PPT', portfolioFolderId);
        console.log('PPT 폴더 생성됨:', pptFolder.id);
      } else {
        console.log('기존 PPT 폴더 발견:', pptFolder.id);
      }

      return pptFolder;
    } catch (error) {
      console.error('PPT 폴더 확인/생성 오류:', error);
      throw new Error('PPT 폴더를 확인하거나 생성하는데 실패했습니다.');
    }
  }

  // 이력별 이미지 폴더 생성 또는 찾기
  async ensureExperienceImageFolder(experienceTitle, imageFolderId) {
    try {
      // 이력 제목을 폴더명으로 사용 (특수문자 제거)
      const folderName = experienceTitle.replace(/[<>:"/\\|?*]/g, '_');

      // 먼저 기존 폴더가 있는지 확인
      let experienceFolder = await this.findFolder(folderName, imageFolderId);

      if (!experienceFolder) {
        // 폴더가 없으면 생성
        experienceFolder = await this.createFolder(folderName, imageFolderId);
        console.log(`이력 이미지 폴더 생성됨: ${folderName}`, experienceFolder.id);
      } else {
        console.log(`기존 이력 이미지 폴더 발견: ${folderName}`, experienceFolder.id);
      }

      return experienceFolder;
    } catch (error) {
      console.error('이력 이미지 폴더 확인/생성 오류:', error);
      throw new Error('이력 이미지 폴더를 확인하거나 생성하는데 실패했습니다.');
    }
  }

  // 파일 업로드
  async uploadFile(name, file, mimeType = 'application/octet-stream', parentId = null) {
    try {
      await this.ensureAuthenticated();

      const metadata = {
        name: name,
        mimeType: mimeType,
      };

      // 부모 폴더가 지정된 경우 parents 배열에 추가
      if (parentId) {
        metadata.parents = [parentId];
      }

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

  // 특정 폴더의 파일 목록 가져오기
  async getFilesInFolder(folderId) {
    try {
      await this.ensureAuthenticated();

      const gapiClient = this.authService.getAuthenticatedGapiClient();

      const response = await gapiClient.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, createdTime, modifiedTime, size)',
      });

      return response.result.files || [];
    } catch (error) {
      console.error('폴더 내 파일 목록 가져오기 오류:', error);
      throw new Error('폴더 내 파일 목록을 가져오는데 실패했습니다.');
    }
  }

  // 파일명에서 순차적 번호 생성
  generateSequentialFileName(originalName, existingFiles) {
    // 파일명과 확장자 분리
    const lastDotIndex = originalName.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
    const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';

    // 같은 이름으로 시작하는 파일들 찾기 (원본 이름과 _숫자 패턴 모두 포함)
    const sameNameFiles = existingFiles.filter(file => 
      file.name.startsWith(nameWithoutExt) && 
      (file.name === originalName || file.name.match(new RegExp(`^${nameWithoutExt}_\\d+${extension.replace('.', '\\.')}$`)))
    );

    // 기존 파일들에서 번호 추출
    const numbers = sameNameFiles.map(file => {
      if (file.name === originalName) {
        return 1;
      }
      const match = file.name.match(new RegExp(`^${nameWithoutExt}_(\\d+)${extension.replace('.', '\\.')}$`));
      return match ? parseInt(match[1]) : 1;
    });

    // 다음 번호 계산
    const nextNumber = sameNameFiles.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${nameWithoutExt}_${nextNumber}${extension}`;
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

  // 파일 다운로드
  async downloadFile(fileId, mimeType = null) {
    try {
      await this.ensureAuthenticated();

      const accessToken = this.authService.getAccessToken();
      let downloadUrl;

      // 구글 문서 파일인지 확인 (Google Docs, Sheets, Slides 등)
      const isGoogleDoc = mimeType && (
          mimeType.includes('google-apps') ||
          mimeType.includes('application/vnd.google-apps')
      );

      if (isGoogleDoc) {
        // 구글 문서 파일은 export API 사용
        const exportMimeType = this.getExportMimeType(mimeType);
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${exportMimeType}`;
      } else {
        // 일반 파일은 alt=media 사용
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      }

      console.log('다운로드 URL:', downloadUrl);

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error('다운로드 응답 오류:', response.status, response.statusText);
        throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('파일 다운로드 오류:', error);
      throw new Error('파일 다운로드에 실패했습니다.');
    }
  }

  // 구글 문서 파일의 export MIME 타입 반환
  getExportMimeType(originalMimeType) {
    const mimeTypeMap = {
      'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.google-apps.drawing': 'image/png', // .png
      'application/vnd.google-apps.form': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    };

    return mimeTypeMap[originalMimeType] || 'application/octet-stream';
  }

  // 구글 문서 파일의 확장자 반환
  getFileExtension(originalMimeType) {
    const extensionMap = {
      'application/vnd.google-apps.document': '.docx',
      'application/vnd.google-apps.spreadsheet': '.xlsx',
      'application/vnd.google-apps.presentation': '.pptx',
      'application/vnd.google-apps.drawing': '.png',
      'application/vnd.google-apps.form': '.xlsx',
    };

    return extensionMap[originalMimeType] || '';
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
