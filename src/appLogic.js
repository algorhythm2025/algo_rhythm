import React, { useState, useRef, useEffect } from 'react';
import GoogleSheetsService from './services/googleSheetsService';
import GoogleDriveService from './services/googleDriveService';
import GoogleAuthService from './services/googleAuthService';

// 분리된 로직들 import
import { useAuthLogic } from './logic/auth/authLogic';
import { useExperienceLogic } from './logic/experience/experienceLogic';
import { useDriveLogic } from './logic/drive/driveLogic';
import { useSheetsLogic } from './logic/sheets/sheetsLogic';
import { usePresentationLogic } from './logic/presentation/presentationLogic';
import { useUILogic } from './logic/ui/uiLogic';

export const SECTION_LIST = [
  'main', 'drive', 'portal', 'pptMaker', 'myPage'
];

function useAppLogic() {
    // 상태 관리
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeSection, setActiveSection] = useState(() => {
      // localStorage에서 저장된 섹션 복원
      return localStorage.getItem('activeSection') || 'main';
    });
    // App.js 상단 상태 관리 섹션에 추가
    const [originalPeriod, setOriginalPeriod] = useState(null); // 기존 설정 기간을 저장
    const [showModal, setShowModal] = useState(false);
    const [experiences, setExperiences] = useState([]);
    const [form, setForm] = useState({ title: '', startDate: '', endDate: '', description: '' });
    const [selected, setSelected] = useState([]);
    const [spreadsheetId, setSpreadsheetId] = useState(() => {
      // localStorage에서 스프레드시트 ID 복원
      return localStorage.getItem('spreadsheetId') || null;
    });
    const [isSheetsInitialized, setIsSheetsInitialized] = useState(false);
    const [isDriveInitialized, setIsDriveInitialized] = useState(false);
    const [driveFiles, setDriveFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSheetLoading, setIsSheetLoading] = useState(false);
    const [isExperienceLoading, setIsExperienceLoading] = useState(false);
    const [isDriveLoading, setIsDriveLoading] = useState(false);
    const [isUploadLoading, setIsUploadLoading] = useState(false);
    const [isRefreshLoading, setIsRefreshLoading] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [deletingFileIds, setDeletingFileIds] = useState(new Set()); // 삭제 중인 파일 ID들
    const [isViewModeLoading, setIsViewModeLoading] = useState(false);
    const [isPptCreating, setIsPptCreating] = useState(false); // PPT 생성 로딩 상태
    const [currentPath, setCurrentPath] = useState([]); // 현재 경로 추적
    const [authStatus, setAuthStatus] = useState('disconnected');
    const [selectedImages, setSelectedImages] = useState([]); // 선택된 이미지 파일들
    const [imagePreviews, setImagePreviews] = useState([]); // 이미지 미리보기 URL들
    const [showImageModal, setShowImageModal] = useState(false);
    const [pptHistory, setPptHistory] = useState([]); // PPT 생성 기록 // 이미지 확대 모달
    const [selectedImageForModal, setSelectedImageForModal] = useState(null); // 모달에 표시할 이미지
    const [imageLoadingStates, setImageLoadingStates] = useState(new Map()); // 이미지 로딩 상태 추적
    const [selectedExperience, setSelectedExperience] = useState(null); // 선택된 이력
    const [showTemplateModal, setShowTemplateModal] = useState(false); // 템플릿 모달 표시 상태
    const [selectedTemplateForModal, setSelectedTemplateForModal] = useState(null); // 모달에서 선택된 템플릿
    const [showExperienceModal, setShowExperienceModal] = useState(false); // 이력 상세 모달 표시 여부
    const [accessToken, setAccessToken] = useState('');
    const [slides, setSlides] = useState([]);
    const [presentationId, setPresentationId] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedExperiences, setSelectedExperiences] = useState([]);
    const [driveViewMode, setDriveViewMode] = useState(() => {
      // localStorage에서 저장된 뷰 모드 복원
      return localStorage.getItem('driveViewMode') || 'all';
    }); // 'all' 또는 'portfolio'
    const [portfolioFolderId, setPortfolioFolderId] = useState(() => {
      // localStorage에서 저장된 포트폴리오 폴더 ID 복원
      return localStorage.getItem('portfolioFolderId') || null;
    }); // 포트폴리오 폴더 ID
    const formRef = useRef();
  
    // 통합 인증 서비스 인스턴스
    const authService = useRef(new GoogleAuthService());
    const sheetsService = useRef(null);
    const driveService = useRef(null);
  
    // 분리된 로직들 초기화
    const authLogic = useAuthLogic();
    const experienceLogic = useExperienceLogic();
    const driveLogic = useDriveLogic();
    const sheetsLogic = useSheetsLogic();
    const presentationLogic = usePresentationLogic();
    const uiLogic = useUILogic();

    // 서비스들 초기화
    async function initializeServices() {
      try {
        console.log('서비스들 초기화 시작...');

        // 인증 상태 확인
        if (!authService.current.isAuthenticated()) {
          console.log('인증이 완료되지 않았습니다. 서비스 초기화를 건너뜁니다.');
          // 토큰이 없으면 서비스 초기화를 건너뜀
          setAuthStatus('disconnected');
          setIsSheetsInitialized(false);
          setIsDriveInitialized(false);
          return;
        }

        // 서비스 인스턴스 생성 (의존성 주입)
        sheetsService.current = new GoogleSheetsService(authService.current);
        driveService.current = new GoogleDriveService(authService.current);

        console.log('서비스 인스턴스 생성 완료');

        // 기존 스프레드시트가 있는지 확인하고 없으면 생성
        let currentSpreadsheetId = spreadsheetId;

        if (currentSpreadsheetId) {
          console.log('기존 스프레드시트 ID 확인 중:', currentSpreadsheetId);

          try {
            // 기존 시트가 실제로 존재하는지 확인
            const exists = await sheetsService.current.checkSpreadsheetExists(currentSpreadsheetId);
            if (!exists) {
              console.log('기존 스프레드시트가 존재하지 않습니다. 상태를 초기화합니다...');
              currentSpreadsheetId = null;
              setSpreadsheetId(null);
              localStorage.removeItem('spreadsheetId');
            } else {
              console.log('기존 스프레드시트가 유효합니다.');
            }
          } catch (error) {
            console.log('기존 스프레드시트 확인 중 오류, 상태를 초기화합니다:', error);
            currentSpreadsheetId = null;
            setSpreadsheetId(null);
            localStorage.removeItem('spreadsheetId');
          }
        }

        if (!currentSpreadsheetId) {
          console.log('기존 포트폴리오 시트 파일 검색 중...');

          try {
            // 포트폴리오 이력 폴더가 있는지 확인 (생성하지 않고 찾기만)
            const portfolioFolder = await driveService.current.findFolder('포트폴리오 이력');

            if (portfolioFolder) {
              console.log('기존 포트폴리오 이력 폴더 발견:', portfolioFolder.id);

              // 포트폴리오 이력 폴더 안에서 기존 시트 파일 검색
              const existingFiles = await driveService.current.listFiles(50, portfolioFolder.id);
              const portfolioFile = existingFiles.find(file =>
                  file.name === '포트폴리오 이력' &&
                  file.mimeType === 'application/vnd.google-apps.spreadsheet'
              );

              if (portfolioFile) {
                console.log('기존 포트폴리오 시트 파일 발견:', portfolioFile.id);
                // 기존 파일 ID 저장
                currentSpreadsheetId = portfolioFile.id;
                setSpreadsheetId(currentSpreadsheetId);
                localStorage.setItem('spreadsheetId', currentSpreadsheetId);

                // 포트폴리오 폴더 ID 설정
                setPortfolioFolderId(portfolioFolder.id);
                localStorage.setItem('portfolioFolderId', portfolioFolder.id);
              } else {
                console.log('포트폴리오 이력 폴더는 있지만 시트 파일이 없습니다.');
                // 폴더는 있지만 시트가 없으면 폴더 ID만 저장
                setPortfolioFolderId(portfolioFolder.id);
                localStorage.setItem('portfolioFolderId', portfolioFolder.id);
              }
            } else {
              console.log('포트폴리오 이력 폴더가 없습니다. 시트 생성 시 함께 생성됩니다.');
            }

          } catch (error) {
            console.error('기존 파일 확인 중 오류:', error);
            console.log('시트 생성 시 폴더도 함께 생성됩니다.');
          }
        }

        // 서비스 초기화 상태 설정
        setIsSheetsInitialized(true);
        setIsDriveInitialized(true);

        // 기존 데이터 로드 (시트 생성 후에만 실행)
        if (currentSpreadsheetId) {
          // 시트 ID 상태를 먼저 업데이트
          setSpreadsheetId(currentSpreadsheetId);

          // 새로 생성된 시트에서 데이터 로드
          await sheetsLogic.loadExperiencesFromSheets(currentSpreadsheetId, sheetsService, setExperiences, uiLogic.preloadImage);
          await loadDriveFiles();
        }

        console.log('모든 서비스 초기화 완료');

      } catch (error) {
        console.error('서비스 초기화 오류:', error);
        const errorMessage = error?.message || '서비스 초기화에 실패했습니다.';
        alert(errorMessage);
        setIsSheetsInitialized(false);
        setIsDriveInitialized(false);
      }
    }

    // 통합 인증 시스템 초기화
    async function initializeGoogleAuth() {
      return await authLogic.initializeGoogleAuth(authService.current, setAuthStatus, setIsSheetsInitialized, setIsDriveInitialized, initializeServices);
    }

    // GIS 기반 로그인 (단일 팝업에서 로그인+권한 처리)
    async function handleGISLogin() {
      await authLogic.handleGISLogin(authService.current, setIsLoading, 
        (loggedIn, spreadsheetIdValue) => authLogic.saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId),
        setActiveSection, initializeServices, setAccessToken);
    }

    // 로그아웃
    function logout() {
      authLogic.logout(authService.current, 
        (loggedIn, spreadsheetIdValue) => authLogic.saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId),
        setActiveSection, setPortfolioFolderId, setIsSheetsInitialized, setIsDriveInitialized, setAuthStatus, sheetsService, driveService);
    }

    // 로그인 상태 저장
    function saveLoginState(loggedIn, spreadsheetIdValue = null) {
      authLogic.saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId);
    }

    // 이력 저장
    async function saveExperience(e) {
      await experienceLogic.saveExperience(e, form, selectedImages, editingIndex, experiences, spreadsheetId, sheetsService, driveService, authService, setExperiences, setIsExperienceLoading, 
        () => uiLogic.closeModal(setShowModal, setForm, setSelectedImages, setImagePreviews, setEditingIndex, setOriginalPeriod));
    }

    // 선택된 이력 삭제
    async function deleteSelectedExperiences() {
      await experienceLogic.deleteSelectedExperiences(selected, experiences, sheetsService, spreadsheetId, isSheetsInitialized, driveService, portfolioFolderId, setExperiences, setSelected, setIsExperienceLoading);
    }

    // 개별 이력 삭제
    async function deleteIndividualExperience(indexToDelete) {
      await experienceLogic.deleteIndividualExperience(indexToDelete, experiences, sheetsService, spreadsheetId, driveService, portfolioFolderId, setExperiences, setSelected, setIsExperienceLoading);
    }

    // 드라이브 파일 목록 로드
    async function loadDriveFiles(parentId = null) {
      await driveLogic.loadDriveFiles(driveService, driveViewMode, portfolioFolderId, spreadsheetId, sheetsService, setDriveFiles, setIsDriveLoading, setSpreadsheetId);
    }

    // 파일 다운로드 (Access Token 사용)
    async function handleDriveFileDownload(file) {
      await driveLogic.handleDriveFileDownload(file, driveService, authService, setIsLoading);
    }

    // 파일 업로드 핸들러
    async function handleDriveFileUpload(event) {
      await driveLogic.handleDriveFileUpload(event, driveService, currentPath, loadDriveFiles, setIsUploadLoading);
    }

    // 파일 삭제 핸들러
    async function handleDriveFileDelete(fileId, isFromPptHistory = false) {
      await driveLogic.handleDriveFileDelete(fileId, isFromPptHistory, driveService, currentPath, loadDriveFiles, loadPptHistory, setDeletingFileIds);
    }

    // 뷰 모드 전환
    async function switchViewMode(mode) {
      await driveLogic.switchViewMode(mode, setDriveViewMode, setCurrentPath, loadDriveFiles, setIsViewModeLoading);
    }

    // 드라이브 새로고침
    async function handleDriveRefresh() {
      await driveLogic.handleDriveRefresh(currentPath, loadDriveFiles, setIsRefreshLoading);
    }

    // 폴더 진입
    async function enterFolder(folderId, folderName) {
      await driveLogic.enterFolder(folderId, folderName, portfolioFolderId, setPortfolioFolderId, setDriveViewMode, setCurrentPath, loadDriveFiles, setIsViewModeLoading);
    }

    // 뒤로가기
    async function goBack() {
      await driveLogic.goBack(currentPath, setCurrentPath, loadDriveFiles, setIsViewModeLoading);
    }

    // 파일 다운로드
    async function downloadFile(file) {
      await driveLogic.downloadFile(file, driveService, authService);
    }

    // 시트에서 이력 데이터 로드
    async function loadExperiencesFromSheets(spreadsheetIdToUse = null) {
      await sheetsLogic.loadExperiencesFromSheets(spreadsheetIdToUse || spreadsheetId, sheetsService, setExperiences, uiLogic.preloadImage);
    }

    // 구글 시트 데이터 새로고침
    async function refreshSheetsData() {
      await sheetsLogic.refreshSheetsData(loadExperiencesFromSheets, setIsExperienceLoading);
    }

    // 시트 생성
    async function createSheet() {
      await sheetsLogic.createSheet(sheetsService, driveService, setPortfolioFolderId, setSpreadsheetId, loadDriveFiles, setIsSheetLoading);
    }

    // 시트 삭제
    async function deleteSheet() {
      await sheetsLogic.deleteSheet(spreadsheetId, driveService, portfolioFolderId, setSpreadsheetId, setPortfolioFolderId, setExperiences, loadDriveFiles, setIsSheetLoading);
    }

    // PPT 기록 조회
    async function loadPptHistory() {
      await presentationLogic.loadPptHistory(driveService, setPptHistory, setIsLoading);
    }

    // PPT 수정을 위한 슬라이드 데이터 로드
    async function loadPptForEdit(pptId) {
      await presentationLogic.loadPptForEdit(pptId, authService, presentationLogic.getPresentationData, setSlides, setPresentationId, setActiveSection, setIsLoading);
    }

    // 템플릿 선택 → 프레젠테이션 생성 + 이력 반영
    async function handleTemplateSelect(templateName, token) {
      const title = prompt('슬라이드 제목을 입력하세요:', '나의 포트폴리오');
      if (!title) {
        alert('제목이 없습니다.');
        return;
      }

      // 현재 날짜를 YYYY-MM-DD 형식으로 생성
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // PPT 표지용 제목 (날짜와 중복표시 제거)
      const cleanTitle = title.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').replace(/_\d+$/, '');
      
      // 기본 파일명 생성 (날짜 포함)
      const baseFileName = `${title} ${dateString}`;
      
      // PPT 폴더에서 기존 PPT 파일들 조회하여 중복 확인
      let finalFileName = baseFileName;
      try {
        const portfolioFolder = await driveService.current.ensurePortfolioFolder();
        const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
        
        if (pptFolder) {
          const existingFiles = await driveService.current.getFilesInFolder(pptFolder.id);
          
          // PPT 파일만 필터링 (Google Slides 파일)
          const pptFiles = existingFiles.filter(file => 
            file.mimeType === 'application/vnd.google-apps.presentation'
          );
          
          // 순차적 번호가 포함된 파일명 생성
          finalFileName = driveService.current.generateSequentialFileName(baseFileName, pptFiles);
          console.log(`원본 PPT 파일명: ${baseFileName} → 최종 파일명: ${finalFileName}`);
        } else {
          console.log('PPT 폴더가 없어서 기본 파일명 사용');
        }
      } catch (error) {
        console.warn('PPT 파일명 중복 확인 실패, 기본 파일명 사용:', error);
      }

      // 토큰 확보 보장
      let currentToken = accessToken;
      if (!currentToken) {
        try {
          // 인증 상태 확인
          const isAuthenticated = await authService.current.isAuthenticated();
          if (!isAuthenticated) {
            alert('인증이 필요합니다. 다시 로그인해주세요.');
            return;
          }
          
          currentToken = await authService.current.getAccessToken();
          if (!currentToken) {
            alert('액세스 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
            return;
          }
          setAccessToken(currentToken);
        } catch (error) {
          console.error('토큰 가져오기 실패:', error);
          alert('인증이 필요합니다. 다시 로그인해주세요.');
          return;
        }
      }

      setSelectedTemplate(templateName);
      setIsPptCreating(true); // PPT 생성 시작

      try {
        // 1) 프레젠테이션 생성 (중복 확인된 최종 파일명으로)
        const presId = await presentationLogic.createPresentation(finalFileName, currentToken);
        setPresentationId(presId);

        // 1-1) PPT 파일을 PPT 폴더로 이동
        try {
          const portfolioFolder = await driveService.current.ensurePortfolioFolder();
          const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
          
          if (pptFolder) {
            const gapiClient = authService.current.getAuthenticatedGapiClient();
            
            // PPT 파일을 PPT 폴더로 이동
            await gapiClient.drive.files.update({
              fileId: presId,
              addParents: pptFolder.id,
              removeParents: 'root'
            });
            console.log('PPT 파일이 PPT 폴더로 이동되었습니다.');
          } else {
            console.warn('PPT 폴더를 찾을 수 없습니다. 포트폴리오 폴더에 저장됩니다.');
          }
        } catch (moveError) {
          console.warn('PPT 파일 폴더 이동 실패:', moveError);
          // 폴더 이동 실패해도 PPT 생성은 성공으로 처리
        }

        // 2) 첫 슬라이드 레이아웃 보정 및 제목/부제목 설정
        let data = await presentationLogic.getPresentationData(presId, currentToken);
        if (data.slides?.length > 0) {
          // 구글 계정에서 사용자 이름 가져오기
          let userName = '사용자';
          try {
            userName = await authLogic.getGoogleAccountName(authService.current);
          } catch (error) {
            console.warn('사용자 이름 가져오기 실패, 기본값 사용:', error);
          }
          
          await presentationLogic.makeTitleAndBody(presId, data.slides[0].objectId, currentToken, cleanTitle, userName);
        }

        // 3) 템플릿별 슬라이드 추가
        if (templateName === 'basic') {
          for (let i = 0; i < selectedExperiences.length; i++) {
            await presentationLogic.addSlide(presId, currentToken);
          }
        } else if (templateName === 'timeline') {
          await presentationLogic.addSlide(presId, currentToken);
          await presentationLogic.addSlide(presId, currentToken);
          for (let i = 0; i < selectedExperiences.length; i++) {
            await presentationLogic.addSlide(presId, currentToken);
          }
        } else if (templateName === 'grid') {
          await presentationLogic.addSlide(presId, currentToken);
          await presentationLogic.addSlide(presId, currentToken);
        }

        // 4) 최신 데이터 가져오기
        data = await presentationLogic.getPresentationData(presId, currentToken);
        const slidesArr = data.slides || [];

        // 5) 텍스트 채우기
        if (slidesArr[0]) {
          const s0 = slidesArr[0];
          const titleShapeId = presentationLogic.findFirstPlaceholder(s0.pageElements, 'TITLE');
          const bodyShapeId  = presentationLogic.findFirstPlaceholder(s0.pageElements, 'BODY');

          // 표지 제목: 원본 제목 (날짜 제외)
          if (titleShapeId) await presentationLogic.updateElementText(presId, titleShapeId, title, currentToken);
          
          // 표지 본문: 구글 계정 이름
          if (bodyShapeId) {
            const userName = await authLogic.getGoogleAccountName(authService.current);
            await presentationLogic.updateElementText(presId, bodyShapeId, userName, currentToken);
          }
        }

        let idx = 1;
        for (const exp of selectedExperiences) {
          if (!slidesArr[idx]) break;
          const s = slidesArr[idx];

          // 제목, 기간, 설명을 위한 새로운 텍스트박스들을 생성
          try {
            // 1. 제목 텍스트박스 (제목 스타일 적용)
            await presentationLogic.addStyledTextBoxToSlide(presId, s.objectId, exp.title, token, {
              x: 50,   // 왼쪽에서 50pt
              y: 50,   // 상단에서 50pt
              width: 400,
              height: 60
            }, {
              bold: true,
              fontSize: { magnitude: 24, unit: 'PT' },
              fontFamily: 'Arial',
              color: { opaqueColor: { rgbColor: { red: 0, green: 0, blue: 0 } } }
            });
            console.log(`제목 텍스트박스가 슬라이드 ${idx}에 추가되었습니다:`, exp.title);

            // 2. 기간 텍스트박스 (일반 스타일, 가로 길이 증가)
            await presentationLogic.addTextBoxToSlide(presId, s.objectId, exp.period, token, {
              x: 50,   // 왼쪽에서 50pt
              y: 100,  // 제목 아래 간격을 줄임 (120 → 100)
              width: 350,  // 가로 길이를 늘림 (200 → 350)
              height: 40
            });
            console.log(`기간 텍스트박스가 슬라이드 ${idx}에 추가되었습니다:`, exp.period);

            // 3. 설명 텍스트박스 (일반 스타일, 위치 조정)
            await presentationLogic.addTextBoxToSlide(presId, s.objectId, exp.description, token, {
              x: 50,   // 왼쪽에서 50pt
              y: 150,  // 기간 아래 간격을 줄임 (170 → 150)
              width: 300,
              height: 80
            });
            console.log(`설명 텍스트박스가 슬라이드 ${idx}에 추가되었습니다:`, exp.description);

          } catch (textBoxError) {
            console.error(`슬라이드 ${idx}에 텍스트박스 추가 실패:`, textBoxError);
            // 텍스트박스 추가 실패해도 PPT 생성은 계속 진행
          }
          
          // 이미지가 있는 경우 슬라이드에 추가
          if (exp.imageUrls && exp.imageUrls.length > 0) {
            try {
              // 모든 이미지를 추가 (세로로 일렬 배치)
              const imageCount = exp.imageUrls.length;
              const imageWidth = 250;
              const imageHeight = 150;
              const imageSpacing = 20;
              const startX = 400; // 텍스트 영역 오른쪽
              const startY = 100; // 상단에서 100pt
              
              for (let i = 0; i < imageCount; i++) {
                const imageUrl = exp.imageUrls[i];
                
                // 이미지 위치 계산 (세로로 일렬 배치)
                const imagePosition = {
                  x: startX,
                  y: startY + i * (imageHeight + imageSpacing),
                  width: imageWidth,
                  height: imageHeight
                };
                
                await presentationLogic.addImageToSlide(presId, s.objectId, imageUrl, token, imagePosition);
                console.log(`이미지 ${i + 1}/${imageCount}가 슬라이드 ${idx}에 추가되었습니다:`, imageUrl);
              }
            } catch (imageError) {
              console.error(`슬라이드 ${idx}에 이미지 추가 실패:`, imageError);
              // 이미지 추가 실패해도 PPT 생성은 계속 진행
            }
          }
          
          idx++;
        }

        // 6) 최종 상태 반영
        const refreshed = await presentationLogic.getPresentationData(presId, currentToken);
        setSlides(refreshed.slides || []);
        
        // 7) PPT 기록 새로고침
        await loadPptHistory();
        
        alert('PPT가 생성되었습니다.');
        setActiveSection('editor');
      } catch (error) {
        console.error('PPT 생성 오류:', error);
        alert('PPT 생성에 실패했습니다: ' + (error?.message || error));
      } finally {
        setIsPptCreating(false); // PPT 생성 완료 (성공/실패 관계없이)
      }
    }

    // 템플릿 모달에서 사용 버튼 클릭
    async function handleTemplateUse() {
      setShowTemplateModal(false);
      
      // 인증 서비스를 통해 토큰 확인 및 갱신
      if (!authService.current) {
        alert('인증 서비스가 초기화되지 않았습니다. 다시 로그인해주세요.');
        return;
      }
      
      // 인증 상태 확인
      const isAuthenticated = await authService.current.isAuthenticated();
      if (!isAuthenticated) {
        alert('인증이 필요합니다. 다시 로그인해주세요.');
        return;
      }
      
      // 액세스 토큰 가져오기
      const token = await authService.current.getAccessToken();
      if (!token) {
        alert('액세스 토큰을 가져올 수 없습니다. 다시 로그인해주세요.');
        return;
      }
      
      await handleTemplateSelect(selectedTemplateForModal, token);
    }

    // 포트폴리오 폴더 ID 설정
    async function setPortfolioFolder() {
      if (!driveService.current) return;

      try {
        // 기존 폴더가 있는지 확인만 (생성하지 않음)
        const portfolioFolder = await driveService.current.findFolder('포트폴리오 이력');
        if (portfolioFolder) {
          setPortfolioFolderId(portfolioFolder.id);
          localStorage.setItem('portfolioFolderId', portfolioFolder.id);
          console.log('기존 포트폴리오 폴더 ID 설정됨:', portfolioFolder.id);
        } else {
          console.log('포트폴리오 폴더가 없습니다. 시트 생성 시 함께 생성됩니다.');
        }
      } catch (error) {
        console.error('포트폴리오 폴더 확인 오류:', error);
      }
    }

    // 뷰 모드 변경 시 파일 목록 다시 로드
    useEffect(() => {
      if (isDriveInitialized) {
        loadDriveFiles();
      }
    }, [driveViewMode, portfolioFolderId]);

    // 포트폴리오 폴더 ID가 변경될 때 localStorage 업데이트
    useEffect(() => {
      if (portfolioFolderId) {
        localStorage.setItem('portfolioFolderId', portfolioFolderId);
      }
    }, [portfolioFolderId]);

    // 마이페이지 섹션이 활성화될 때 PPT 기록과 이력 목록 로드
    useEffect(() => {
      if (activeSection === 'myPage' && isDriveInitialized) {
        loadPptHistory();
        // 이력 목록도 자동으로 새로고침
        if (isSheetsInitialized) {
          loadExperiencesFromSheets();
        }
      }
    }, [activeSection, isDriveInitialized, isSheetsInitialized]);

    // 페이지 로드 시 로그인 상태 복원 및 초기화
    useEffect(() => {
      const initializeApp = async () => {
        try {
          console.log('앱 초기화 시작...');

          // localStorage에서 로그인 상태 확인
          const savedLoginState = localStorage.getItem('isLoggedIn');
          const savedSpreadsheetId = localStorage.getItem('spreadsheetId');

          if (savedLoginState === 'true' && savedSpreadsheetId) {
            console.log('저장된 로그인 상태 발견, 서비스 초기화 시작...');

            // 로그인 상태를 먼저 설정
            setIsLoggedIn(true);
            setSpreadsheetId(savedSpreadsheetId);

            // 통합 인증 시스템 초기화
            await initializeGoogleAuth();
          } else {
            console.log('저장된 로그인 상태가 없습니다.');
            // 로그인 상태가 없으면 명시적으로 false로 설정
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error('앱 초기화 오류:', error);
          // 초기화 실패 시 로그인 상태를 false로 설정
          setIsLoggedIn(false);
          setAuthStatus('error');
        }
      };

      initializeApp();
    }, []);

    // GIS 기반 로그인 버튼 렌더링
    useEffect(() => {
      if (!isLoggedIn) {
        // GIS 기반 로그인 버튼 렌더링
        const googleSignInDiv = document.getElementById('googleSignInDiv');
        if (googleSignInDiv) {
          googleSignInDiv.innerHTML = `
            <button 
              id="gisLoginBtn"
              style="
                background: #4285f4; 
                color: white; 
                border: none; 
                padding: 12px 24px; 
                border-radius: 4px; 
                font-size: 16px; 
                cursor: pointer;
                width: 300px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
              "
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              구글로 로그인
            </button>
          `;

          // 버튼에 이벤트 리스너 추가
          const loginBtn = document.getElementById('gisLoginBtn');
          if (loginBtn) {
            loginBtn.addEventListener('click', handleGISLogin);
          }
        }
      }
    }, [isLoggedIn]);

    // 로딩 상태에 따른 버튼 업데이트
    useEffect(() => {
      const loginBtn = document.getElementById('gisLoginBtn');
      if (loginBtn) {
        if (isLoading) {
          loginBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm" role="status" style="width: 18px; height: 18px;">
              <span class="visually-hidden">로딩중...</span>
            </div>
            로그인 중...
          `;
          loginBtn.disabled = true;
          loginBtn.style.cursor = 'not-allowed';
          loginBtn.style.opacity = '0.7';
        } else {
          loginBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            구글로 로그인
          `;
          loginBtn.disabled = false;
          loginBtn.style.cursor = 'pointer';
          loginBtn.style.opacity = '1';
        }
      }
    }, [isLoading]);

    // ESC 키로 이미지 모달 닫기
    useEffect(() => {
      const handleEscKey = (event) => {
        if (event.key === 'Escape' && showImageModal) {
          uiLogic.closeImageModal(setShowImageModal, setSelectedImageForModal);
        }
      };

      if (showImageModal) {
        document.addEventListener('keydown', handleEscKey);
      }

      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }, [showImageModal]);

    // 드라이브 섹션이 활성화될 때 포트폴리오 폴더 ID 설정
    useEffect(() => {
      if (activeSection === 'drive' && isDriveInitialized && !portfolioFolderId) {
        setPortfolioFolder();
      }
    }, [activeSection, isDriveInitialized, portfolioFolderId]);

    // 모든 상태와 함수들을 반환
    return {
      // 상태들
      isLoggedIn,
      activeSection,
      authStatus,
      experiences,
      selected,
      spreadsheetId,
      isSheetsInitialized,
      isDriveInitialized,
      driveFiles,
      isLoading,
      isSheetLoading,
      isExperienceLoading,
      isDriveLoading,
      isUploadLoading,
      isRefreshLoading,
      isDeleteLoading,
      editingIndex,
      deletingFileIds,
      isViewModeLoading,
      isPptCreating,
      currentPath,
      selectedImages,
      imagePreviews,
      showImageModal,
      pptHistory,
      selectedImageForModal,
      imageLoadingStates,
      selectedExperience,
      showTemplateModal,
      selectedTemplateForModal,
      showExperienceModal,
      showModal,
      form,
      formRef,
      driveViewMode,
      portfolioFolderId,
      presentationId,
      slides,
      accessToken,
      selectedExperiences,
      templateDescriptions: uiLogic.templateDescriptions,
      // 함수들
      showSection: (section) => uiLogic.showSection(section, setActiveSection),
      logout,
      showAddExperienceModal: () => uiLogic.showAddExperienceModal(setForm, setSelectedImages, setImagePreviews, setEditingIndex, setShowModal),
      selectAllExperiences: (select) => uiLogic.selectAllExperiences(select, experiences, setSelected),
      deleteSelectedExperiences,
      refreshSheetsData,
      openExperienceModal: (experience) => uiLogic.openExperienceModal(experience, setSelectedExperience, setShowExperienceModal),
      openImageModal: (imageUrl, title) => uiLogic.openImageModal(imageUrl, title, setSelectedImageForModal, setShowImageModal),
      setImageLoadingState: (imageKey, isLoading) => uiLogic.setImageLoadingState(imageKey, isLoading, setImageLoadingStates),
      retryImageLoad: (imgElement, originalUrl, retryCount) => uiLogic.retryImageLoad(imgElement, originalUrl, retryCount, uiLogic.setImageLoadingState, uiLogic.setImageErrorState),
      toggleSelect: (idx) => uiLogic.toggleSelect(idx, selected, setSelected),
      setSelectedExperiences,
      openTemplateModal: (templateName) => uiLogic.openTemplateModal(templateName, setSelectedTemplateForModal, setShowTemplateModal),
      handleTemplateCancel: () => uiLogic.handleTemplateCancel(setShowTemplateModal, setSelectedTemplateForModal),
      handleTemplateUse,
      closeModal: () => uiLogic.closeModal(setShowModal, setForm, setSelectedImages, setImagePreviews, setEditingIndex, setOriginalPeriod),
      saveExperience,
      closeImageModal: () => uiLogic.closeImageModal(setShowImageModal, setSelectedImageForModal),
      closeExperienceModal: () => uiLogic.closeExperienceModal(setSelectedExperience, setShowExperienceModal),
      showEditExperienceModal: (index) => uiLogic.showEditExperienceModal(index, experiences, setForm, setImagePreviews, setEditingIndex, setShowModal, setOriginalPeriod),
      deleteIndividualExperience,
      handleImageSelect: (event) => uiLogic.handleImageSelect(event, setSelectedImages, setImagePreviews),
      handleDroppedFiles: (files) => uiLogic.handleDroppedFiles(files, setSelectedImages, setImagePreviews),
      removeImage: (index) => uiLogic.removeImage(index, setSelectedImages, setImagePreviews),
      formatPeriod: experienceLogic.formatPeriod,
      createSheet,
      deleteSheet,
      switchViewMode,
      goBack,
      handleDriveFileUpload,
      handleDriveRefresh,
      handleDriveFileDelete,
      enterFolder,
      downloadFile,
      loadPptHistory,
      loadPptForEdit,
      getTextFromElement: presentationLogic.getTextFromElement,
      updateElementTextAndLocal: (pId, elementId, newText, token) => presentationLogic.updateElementTextAndLocal(pId, elementId, newText, token, setSlides),
      updateElementStyle: presentationLogic.updateElementStyle,
      // 상태 setter 함수들
      setActiveSection,
      setSlides,
      setForm,
      setSelectedImageForModal,
      setShowImageModal
    };
}

export { useAppLogic };