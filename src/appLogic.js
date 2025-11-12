import React, { useState, useRef, useEffect } from 'react';
import GoogleSheetsService from './services/googleSheetsService';
import GoogleDriveService from './services/googleDriveService';
import GoogleAuthService from './services/googleAuthService';
import { useExperienceLogic } from './logic/experience/experienceLogic';
import { usePresentationLogic } from './logic/presentation/presentationLogic';
import { useUILogic } from './logic/ui/uiLogic';

export const SECTION_LIST = ['main', 'drive', 'History', 'pptMaker', 'myPage'];

function useAppLogic()
{
    // 상태 관리
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeSection, setActiveSection] = useState(() =>
    {
      // localStorage에서 저장된 섹션 복원
      return localStorage.getItem('activeSection') || 'main';
    });

    // App.js 상단 상태 관리 섹션에 추가
    const [originalPeriod, setOriginalPeriod] = useState(null); // 기존 설정 기간을 저장
    const [showModal, setShowModal] = useState(false);
    const [experiences, setExperiences] = useState([]);
    const [form, setForm] = useState({ title: '', startDate: '', endDate: '', description: '' });
    const [selected, setSelected] = useState([]);
    const [spreadsheetId, setSpreadsheetId] = useState(() =>
    {
      // localStorage에서 스프레드시트 ID 복원
      return localStorage.getItem('spreadsheetId') || null;
    });
    const [expSortBy, setExpSortBy] = useState('createdAt');
    const [expSortOrder, setExpSortOrder] = useState('desc');
    const [pptSortBy, setPptSortBy] = useState('createdTime');
    const [pptSortOrder, setPptSortOrder] = useState('desc');
    const [driveSortBy, setDriveSortBy] = useState('name');
    const [driveSortOrder, setDriveSortOrder] = useState('asc');

    const [isSheetsInitialized, setIsSheetsInitialized] = useState(false);
    const [isDriveInitialized, setIsDriveInitialized] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false); // 서비스 초기화 중 상태
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

    // PPT 생성 진행 상황을 위한 상태
    const [pptProgress, setPptProgress] = useState(0);
    const [pptMessages, setPptMessages] = useState([]); // 스크롤링 메시지 배열
    const [pptCurrentSlide, setPptCurrentSlide] = useState(0);
    const [pptTotalSlides, setPptTotalSlides] = useState(0);
    const [pptCurrentImage, setPptCurrentImage] = useState(0);
    const [pptTotalImages, setPptTotalImages] = useState(0);
    
    // PPT 진행 상황 업데이트 함수
    const updatePptProgress = (progress, message, slide = 0, totalSlides = 0, image = 0, totalImages = 0) =>
      {
        setPptProgress(progress);
        setPptCurrentSlide(slide);
        setPptTotalSlides(totalSlides);
        setPptCurrentImage(image);
        setPptTotalImages(totalImages);
        
        // 메시지를 배열에 추가 (최대 7개 유지)
        setPptMessages(prev =>
          {
            const newMessage =
            {
                id: Date.now() + Math.random(),
                text: message,
                timestamp: Date.now()
            };
            const newMessages = [...prev, newMessage];
            return newMessages.length > 7 ? newMessages.slice(-7) : newMessages;
        });
    };
    
    const [currentPath, setCurrentPath] = useState([]); // 현재 경로 추적
    const [authStatus, setAuthStatus] = useState('disconnected');
    const [selectedImages, setSelectedImages] = useState([]); // 선택된 이미지 파일들
    const [imagePreviews, setImagePreviews] = useState([]); // 이미지 미리보기 URL들
    const [existingImageUrls, setExistingImageUrls] = useState([]); // 기존 이미지 URL들 (수정 모드에서 삭제 추적용)
    const [showImageModal, setShowImageModal] = useState(false);
    const [pptHistory, setPptHistory] = useState([]); // PPT 생성 기록 // 이미지 확대 모달
    const [selectedImageForModal, setSelectedImageForModal] = useState(null); // 모달에 표시할 이미지
    const [imageLoadingStates, setImageLoadingStates] = useState(new Map()); // 이미지 로딩 상태 추적
    const [selectedExperience, setSelectedExperience] = useState(null); // 선택된 이력
    const [showTemplateModal, setShowTemplateModal] = useState(false); // 템플릿 모달 표시 상태
    const [selectedTemplateForModal, setSelectedTemplateForModal] = useState(null); // 모달에서 선택된 템플릿
    const [selectedThemeColor, setSelectedThemeColor] = useState('light'); // 선택된 테마 색상 (light/dark)
    const [showExperienceModal, setShowExperienceModal] = useState(false); // 이력 상세 모달 표시 여부
    const [accessToken, setAccessToken] = useState('');
    const [slides, setSlides] = useState([]);
    const [presentationId, setPresentationId] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedExperiences, setSelectedExperiences] = useState([]);
    const [selectedBgImage, setSelectedBgImage] = useState(null);
    const [bgImagePreview, setBgImagePreview] = useState(null);
    const [driveViewMode, setDriveViewMode] = useState(() =>
    {
      // localStorage에서 저장된 뷰 모드 복원
      return localStorage.getItem('driveViewMode') || 'all';
    });// 'all' 또는 'portfolio'

    const [portfolioFolderId, setPortfolioFolderId] = useState(() =>
    {
      // localStorage에서 저장된 포트폴리오 폴더 ID 복원
      return localStorage.getItem('portfolioFolderId') || null;
    }); // 포트폴리오 폴더 ID
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(() => {
      return window.location.pathname === '/privacy-policy.html';
    }); // 개인정보처리방침 표시 여부
    const [showTermsOfService, setShowTermsOfService] = useState(() => {
      return window.location.pathname === '/terms-of-service.html';
    }); // 사용자 약관 표시 여부
    const [pptHistoryCurrentPage, setPptHistoryCurrentPage] = useState(1);
    const [experienceCurrentPage, setExperienceCurrentPage] = useState(1);
    const [pptMakerExperienceCurrentPage, setPptMakerExperienceCurrentPage] = useState(1);
    const pptHistoryItemsPerPage = 8;
    const experienceItemsPerPage = 6;
    const pptMakerExperienceItemsPerPage = 6;
    const formRef = useRef();
  
    // 통합 인증 서비스 인스턴스
    const authService = useRef(new GoogleAuthService());
    const sheetsService = useRef(null);
    const driveService = useRef(null);
  
    // 분리된 로직들 초기화
    // 통합된 로직들 (services에 통합된 것들은 제거)
    const experienceLogic = useExperienceLogic();
    const presentationLogic = usePresentationLogic();
    const uiLogic = useUILogic(driveService.current);

    // 서비스들 초기화
    async function initializeServices() {
      try {
        setIsInitializing(true);

        // 인증 상태 확인
        if (!authService.current.isAuthenticated()) {
          // 토큰이 없으면 서비스 초기화를 건너뜀
          setAuthStatus('disconnected');
          setIsSheetsInitialized(false);
          setIsDriveInitialized(false);
          return;
        }

        // 서비스 인스턴스 생성 (의존성 주입)
        sheetsService.current = new GoogleSheetsService(authService.current);
        driveService.current = new GoogleDriveService(authService.current);


        // 기존 스프레드시트가 있는지 확인하고 없으면 생성
        let currentSpreadsheetId = spreadsheetId;

        if (currentSpreadsheetId) {

          try {
            // 기존 시트가 실제로 존재하는지 확인
            const exists = await sheetsService.current.checkSpreadsheetExists(currentSpreadsheetId);
            if (!exists) {
              currentSpreadsheetId = null;
              setSpreadsheetId(null);
              localStorage.removeItem('spreadsheetId');
            } else {
            }
          } catch (error) {
            currentSpreadsheetId = null;
            setSpreadsheetId(null);
            localStorage.removeItem('spreadsheetId');
          }
        }

        if (!currentSpreadsheetId) {

          try {
            const portfolioFolder = await driveService.current.findPortfolioFolder();

            if (portfolioFolder) {

              // 포트폴리오 이력 폴더 안에서 기존 시트 파일 검색
              const existingFiles = await driveService.current.listFiles(50, portfolioFolder.id);
              const portfolioFile = existingFiles.find(file =>
                  file.name === '포트폴리오 이력' &&
                  file.mimeType === 'application/vnd.google-apps.spreadsheet'
              );

              if (portfolioFile) {
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
            }

          } catch (error) {
            console.error('기존 파일 확인 중 오류:', error);
          }
        }

        // 서비스 초기화 상태 설정
        setIsSheetsInitialized(true);
        setIsDriveInitialized(true);

        // 기존 데이터 로드 (시트 생성 후에만 실행)
        if (currentSpreadsheetId) {
          // 시트 ID 상태를 먼저 업데이트
          setSpreadsheetId(currentSpreadsheetId);

          // 새로 생성된 시트에서 데이터 로드 (통합된 sheetsService 사용)
          if (sheetsService.current) {
            await sheetsService.current.loadExperiencesFromSheets(currentSpreadsheetId, setExperiences, null, false); // 이미지 프리로딩 제거
          }
          await loadDriveFiles();
        }

        // 폴더 구조 프리로딩 (이미지 업로드 속도 향상을 위해)
        // driveService가 완전히 초기화된 후에 실행
        const preloadFolders = () => {
          if (driveService.current) {
            experienceLogic.preloadFolderStructure(driveService)
              .then(() => {
              })
              .catch(error => {
                console.warn('폴더 구조 프리로딩 실패 (무시됨):', error);
              });
          } else {
            // driveService가 아직 초기화되지 않았으면 500ms 후 다시 시도
            setTimeout(preloadFolders, 500);
          }
        };
        
        // 1초 후에 프리로딩 시작
        setTimeout(preloadFolders, 1000);

        // 기존 이미지 파일들에 공개 권한 설정 (백그라운드에서 실행, 중복 방지)
        if (driveService.current && !driveService.current._permissionSettingScheduled) {
          const currentDriveService = driveService.current; // 안전한 참조 저장
          currentDriveService._permissionSettingScheduled = true;
          currentDriveService.setExistingImagesPublic()
            .then(count => {
              // 로그는 googleDriveService에서 출력하므로 중복 제거
              
              // 권한 설정 완료 - 이미지는 필요할 때 로딩됨
            })
            .catch(error => {
              console.warn('기존 이미지 공개 권한 설정 실패 (무시됨):', error);
            })
            .finally(() => {
              // driveService.current가 여전히 존재하는지 확인 후 속성 설정
              if (driveService.current) {
                driveService.current._permissionSettingScheduled = false;
              }
            });
        }


      } catch (error) {
        console.error('서비스 초기화 오류:', error);
        const errorMessage = error?.message || '서비스 초기화에 실패했습니다.';
        alert(errorMessage);
        setIsSheetsInitialized(false);
        setIsDriveInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    }

    // 통합 인증 시스템 초기화 (통합된 authService 사용)
    async function initializeGoogleAuth() {
      return await authService.current.initializeGoogleAuth(setAuthStatus, setIsSheetsInitialized, setIsDriveInitialized, initializeServices);
    }

    // GIS 기반 로그인 (단일 팝업에서 로그인+권한 처리) (통합된 authService 사용)
    async function handleGISLogin() {
      // 로그인 버튼 스피너 시작
      setIsLoading(true);
      
      // 팝업이 뜨는 시점을 감지하여 스피너 중지
      const handlePopupOpened = () => {
        setIsLoading(false);
        window.removeEventListener('loginPopupOpened', handlePopupOpened);
      };
      
      window.addEventListener('loginPopupOpened', handlePopupOpened);
      
      // 최대 3초 후에는 강제로 스피너 중지 (안전장치)
      setTimeout(() => {
        setIsLoading(false);
        window.removeEventListener('loginPopupOpened', handlePopupOpened);
      }, 3000);
      
      await authService.current.handleGISLogin(setIsLoading, 
        (loggedIn, spreadsheetIdValue) => authService.current.saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId),
        setActiveSection, initializeServices, setAccessToken);
    }

    // 로그아웃 (통합된 authService 사용)
    function logout() {
      authService.current.logout(
        (loggedIn, spreadsheetIdValue) => authService.current.saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId),
        setActiveSection, setPortfolioFolderId, setIsSheetsInitialized, setIsDriveInitialized, setAuthStatus, sheetsService, driveService);
    }

    // 로그인 상태 저장 (통합된 authService 사용)
    function saveLoginState(loggedIn, spreadsheetIdValue = null) {
      authService.current.saveLoginState(loggedIn, spreadsheetIdValue, setIsLoggedIn, setSpreadsheetId);
    }

    // 이력 저장
    async function saveExperience(e) {
      await experienceLogic.saveExperience(e, form, selectedImages, editingIndex, experiences, spreadsheetId, sheetsService, driveService, authService, setExperiences, setIsExperienceLoading, 
        () => uiLogic.closeModal(setShowModal, setForm, setSelectedImages, setImagePreviews, setEditingIndex, setOriginalPeriod), existingImageUrls);
    }

    // 선택된 이력 삭제
    async function deleteSelectedExperiences() {
      await experienceLogic.deleteSelectedExperiences(selected, experiences, sheetsService, spreadsheetId, isSheetsInitialized, driveService, portfolioFolderId, setExperiences, setSelected, setIsExperienceLoading);
    }

    // 개별 이력 삭제
    async function deleteIndividualExperience(indexToDelete) {
      await experienceLogic.deleteIndividualExperience(indexToDelete, experiences, sheetsService, spreadsheetId, driveService, portfolioFolderId, setExperiences, setSelected, setIsExperienceLoading);
    }

    // 드라이브 파일 목록 로드 (통합된 driveService 사용)
    async function loadDriveFiles(parentId = null) {
      if (!driveService.current) {
        return;
      }
      await driveService.current.loadDriveFiles(driveViewMode, portfolioFolderId, spreadsheetId, sheetsService, setDriveFiles, setIsDriveLoading, setSpreadsheetId, parentId);
    }

    // 파일 다운로드 (Access Token 사용) (통합된 driveService 사용)
    async function handleDriveFileDownload(file) {
      await driveService.current.handleDriveFileDownload(file, authService.current, setIsLoading);
    }

    // 파일 업로드 핸들러 (통합된 driveService 사용)
    async function handleDriveFileUpload(event) {
      await driveService.current.handleDriveFileUpload(event, currentPath, loadDriveFiles, setIsUploadLoading);
    }

    // 파일 삭제 핸들러 (통합된 driveService 사용)
    async function handleDriveFileDelete(fileId, isFromPptHistory = false) {
      await driveService.current.handleDriveFileDelete(fileId, isFromPptHistory, currentPath, loadDriveFiles, loadPptHistory, setDeletingFileIds);
    }

    // 뷰 모드 전환 (통합된 driveService 사용)
    async function switchViewMode(mode) {
      await driveService.current.switchViewMode(mode, setDriveViewMode, setCurrentPath, loadDriveFiles, setIsViewModeLoading);
    }

    // 드라이브 새로고침 (통합된 driveService 사용)
    async function handleDriveRefresh() {
      await driveService.current.handleDriveRefresh(currentPath, loadDriveFiles, setIsRefreshLoading);
    }

    // 폴더 진입 (통합된 driveService 사용)
    async function enterFolder(folderId, folderName) {
      await driveService.current.enterFolder(folderId, folderName, portfolioFolderId, setPortfolioFolderId, setDriveViewMode, setCurrentPath, loadDriveFiles, setIsViewModeLoading);
    }

    // 뒤로가기 (통합된 driveService 사용)
    async function goBack() {
      await driveService.current.goBack(currentPath, setCurrentPath, loadDriveFiles, setIsViewModeLoading, driveViewMode, portfolioFolderId);
    }

    // 파일 다운로드 (통합된 driveService 사용)
    async function downloadFile(file) {
      await driveService.current.downloadFile(file, authService.current);
    }

    // 파일을 새 탭에서 열기 (통합된 driveService 사용)
    async function openFileInNewTab(file) {
      await driveService.current.openFileInNewTab(file, authService.current);
    }

    // 파일 크기 포맷팅 (통합된 driveService 사용)
    function formatFileSize(bytes) {
      return driveService.current.formatFileSize(bytes);
    }

    // 파일 타입 표시 (통합된 driveService 사용)
    function getFileTypeDisplay(file) {
      return driveService.current.getFileTypeDisplay(file);
    }

    // 이미지 URL 변환 (통합된 driveService 사용)
    function convertImageUrl(imageUrl) {
      return driveService.current.convertImageUrl(imageUrl);
    }

    // 썸네일용 이미지 URL 변환 (빠른 로딩)
    function convertImageUrlToThumbnail(imageUrl) {
      return driveService.current.convertImageUrlToThumbnail(imageUrl);
    }

    // 고화질용 이미지 URL 변환 (확대 모달용)
    function convertImageUrlToFullSize(imageUrl) {
      return driveService.current.convertImageUrlToFullSize(imageUrl);
    }


    // 시트에서 이력 데이터 로드 (통합된 sheetsService 사용)
    async function loadExperiencesFromSheets(spreadsheetIdToUse = null) {
      if (!sheetsService.current) {
        return;
      }
      await sheetsService.current.loadExperiencesFromSheets(spreadsheetIdToUse || spreadsheetId, setExperiences, null, false);
    }

    // 구글 시트 데이터 새로고침 (통합된 sheetsService 사용)
    async function refreshSheetsData() {
      if (!sheetsService.current) {
        return;
      }
      await sheetsService.current.refreshSheetsData(loadExperiencesFromSheets, setIsExperienceLoading);
    }

    // 시트 생성 (통합된 sheetsService 사용)
    async function createSheet() {
      if (!sheetsService.current) {
        return;
      }
      await sheetsService.current.createSheet(driveService, setPortfolioFolderId, setSpreadsheetId, loadDriveFiles, setIsSheetLoading);
    }

    // 시트 삭제 (통합된 sheetsService 사용)
    async function deleteSheet() {
      if (!sheetsService.current) {
        return;
      }
      await sheetsService.current.deleteSheet(spreadsheetId, driveService, portfolioFolderId, setSpreadsheetId, setPortfolioFolderId, setExperiences, loadDriveFiles, setIsSheetLoading);
    }

    // PPT 기록 조회
    async function loadPptHistory() {
      await presentationLogic.loadPptHistory(driveService, setPptHistory, setIsLoading);
    }

    // PPT 수정을 위한 슬라이드 데이터 로드
    async function loadPptForEdit(pptId) {
      await presentationLogic.loadPptForEdit(pptId, authService, presentationLogic.getPresentationData, setSlides, setPresentationId, setActiveSection, setIsLoading);
    }

    // 템플릿 선택 → 프레젠테이션 생성 + 이력 반영 (presentationLogic 사용)
    async function handleTemplateSelect(templateName, token) {
      await presentationLogic.handleTemplateSelect(templateName, token, {
        selectedExperiences,
        driveService,
        authService,
        setSelectedTemplate,
        setIsPptCreating,
        setPptMessages,
        updatePptProgress,
        setPresentationId,
        setSlides,
        loadPptHistory,
        setActiveSection,
        setAccessToken,
        accessToken,
        selectedThemeColor,
        selectedBgImage
      });
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
      
      // PPT 생성 후 배경 이미지 상태 초기화
      setBgImagePreview(null);
      setSelectedBgImage(null);
    }

    // 테마 색상 선택 함수
    function handleThemeColorSelect(themeColor) {
      setSelectedThemeColor(themeColor);
    }

    // 배경 이미지 핸들러
    const handleBgImageSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('배경 이미지 파일 크기는 5MB 이하여야 합니다.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setBgImagePreview(e.target.result);
            setSelectedBgImage(file);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleBgImageDrop = (files) => {
        const file = files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('배경 이미지 파일 크기는 5MB 이하여야 합니다.');
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setBgImagePreview(e.target.result);
            setSelectedBgImage(file);
        };
        reader.readAsDataURL(file);
    };

    const removeBgImage = () => {
        setBgImagePreview(null);
        setSelectedBgImage(null);
    };

    // 포트폴리오 폴더 ID 설정
    async function setPortfolioFolder() {
      if (!driveService.current) return;

      try {
        // 기존 폴더가 있는지 확인만 (생성하지 않음)
        const portfolioFolder = await driveService.current.findFolder('포트폴리오 이력');
        if (portfolioFolder) {
          setPortfolioFolderId(portfolioFolder.id);
          localStorage.setItem('portfolioFolderId', portfolioFolder.id);
        } else {
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

    const sortPptHistory = (history, sortBy, sortOrder) => {
        if (!history || history.length === 0) return [];
        const sorted = [...history];
        const isAsc = sortOrder === 'asc';
        const field = sortBy;

        sorted.sort((a, b) => {
            let valA;
            let valB;

            if (field === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();

                if (valA < valB) return isAsc ? -1 : 1;
                if (valA > valB) return isAsc ? 1 : -1;
                return 0;
            } else if (field === 'createdTime' || field === 'modifiedTime') {
                valA = new Date(a[field] || 0).getTime();
                valB = new Date(b[field] || 0).getTime();
                return isAsc ? valA - valB : valB - valA;
            }
            return 0;
        });
        return sorted;
    };

    const sortExperiences = (expList, sortBy, sortOrder) => {
        if (!expList || expList.length === 0) return [];
        const sorted = [...expList];
        const isAsc = sortOrder === 'asc';
        const field = sortBy;

        sorted.sort((a, b) => {
            let valA;
            let valB;

            if (field === 'title') {
                valA = a.title.toLowerCase();
                valB = b.title.toLowerCase();

                if (valA < valB) return isAsc ? -1 : 1;
                if (valA > valB) return isAsc ? 1 : -1;
                return 0;
            } else if (field === 'startDate') {
                const periodA = a.period || '';
                const periodB = b.period || '';
                
                const dateMatchA = periodA.match(/(\d{4})\.(\d{2})\.(\d{2})/);
                const dateMatchB = periodB.match(/(\d{4})\.(\d{2})\.(\d{2})/);
                
                if (dateMatchA && dateMatchB) {
                    const dateA = new Date(`${dateMatchA[1]}-${dateMatchA[2]}-${dateMatchA[3]}`);
                    const dateB = new Date(`${dateMatchB[1]}-${dateMatchB[2]}-${dateMatchB[3]}`);
                    valA = !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
                    valB = !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
                } else {
                    valA = dateMatchA ? new Date(`${dateMatchA[1]}-${dateMatchA[2]}-${dateMatchA[3]}`).getTime() : 0;
                    valB = dateMatchB ? new Date(`${dateMatchB[1]}-${dateMatchB[2]}-${dateMatchB[3]}`).getTime() : 0;
                }

                return isAsc ? valA - valB : valB - valA;
            } else if (field === 'createdAt') {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);

                valA = !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
                valB = !isNaN(dateB.getTime()) ? dateB.getTime() : 0;

                return isAsc ? valA - valB : valB - valA;
            }
            return 0;
        });
        return sorted;
    };

    const sortedPptHistory = sortPptHistory(pptHistory, pptSortBy, pptSortOrder);
    const sortedExperiences = sortExperiences(experiences, expSortBy, expSortOrder);

    // 마이페이지 섹션이 활성화될 때 PPT 기록과 이력 목록 로드
    useEffect(() => {
      if (activeSection === 'myPage' && isDriveInitialized) {
        loadPptHistory();
        // 이력 목록도 자동으로 새로고침
        if (isSheetsInitialized) {
          loadExperiencesFromSheets(null);
        }
      }
    }, [activeSection, isDriveInitialized, isSheetsInitialized]);

    // 페이지 로드 시 로그인 상태 복원 및 초기화
    useEffect(() => {
      const initializeApp = async () => {
        // 중복 실행 방지
        if (window._appInitializing) {
          return;
        }
        
        try {
          window._appInitializing = true;

          // localStorage에서 로그인 상태 확인
          const savedLoginState = localStorage.getItem('isLoggedIn');
          const savedSpreadsheetId = localStorage.getItem('spreadsheetId');

          if (savedLoginState === 'true' && savedSpreadsheetId) {

            // 로그인 상태를 먼저 설정
            setIsLoggedIn(true);
            setSpreadsheetId(savedSpreadsheetId);

            // 통합 인증 시스템 초기화
            await initializeGoogleAuth();
          } else {
            // 로그인 상태가 없으면 명시적으로 false로 설정
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error('앱 초기화 오류:', error);
          // 초기화 실패 시 로그인 상태를 false로 설정
          setIsLoggedIn(false);
          setAuthStatus('error');
        } finally {
          window._appInitializing = false;
        }
      };

      initializeApp();
    }, []);

    // GIS 기반 로그인 버튼 렌더링
    useEffect(() => {
      if (!isLoggedIn && !showPrivacyPolicy && !showTermsOfService) {
        // 약간의 지연을 두어 DOM이 렌더링된 후 버튼 생성
        const timer = setTimeout(() => {
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
        }, 100);

        return () => clearTimeout(timer);
      }
    }, [isLoggedIn, showPrivacyPolicy, showTermsOfService]);

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

    // 개인정보처리방침 페이지 상태 변경 시 URL 업데이트
    useEffect(() => {
      if (showPrivacyPolicy) {
        window.history.pushState({ page: 'privacy-policy' }, '', '/privacy-policy.html');
      } else if (window.location.pathname === '/privacy-policy.html') {
        window.history.pushState({}, '', '/');
      }
    }, [showPrivacyPolicy]);

    // 사용자 약관 페이지 상태 변경 시 URL 업데이트
    useEffect(() => {
      if (showTermsOfService) {
        window.history.pushState({ page: 'terms-of-service' }, '', '/terms-of-service.html');
      } else if (window.location.pathname === '/terms-of-service.html') {
        window.history.pushState({}, '', '/');
      }
    }, [showTermsOfService]);

    // 브라우저 뒤로가기/앞으로가기 버튼 처리
    useEffect(() => {
      const handlePopState = (event) => {
        const pathname = window.location.pathname;
        
        if (pathname === '/privacy-policy.html') {
          setShowPrivacyPolicy(true);
          setShowTermsOfService(false);
        } else if (pathname === '/terms-of-service.html') {
          setShowTermsOfService(true);
          setShowPrivacyPolicy(false);
        } else {
          setShowPrivacyPolicy(false);
          setShowTermsOfService(false);
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }, [setShowPrivacyPolicy, setShowTermsOfService]);

    // 모든 상태와 함수들을 반환
    return {
      // 상태들
      isLoggedIn,
      activeSection,
      authStatus,
      experiences: sortedExperiences,
      selected,
      spreadsheetId,
      isSheetsInitialized,
      isDriveInitialized,
      isInitializing,
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
      // PPT 진행 상황 상태들
      pptProgress,
      pptMessages,
      pptCurrentSlide,
      pptTotalSlides,
      pptCurrentImage,
      pptTotalImages,
      currentPath,
      selectedImages,
      imagePreviews,
      showImageModal,
      pptHistory: sortedPptHistory,
      selectedImageForModal,
      imageLoadingStates,
      selectedExperience,
      showTemplateModal,
      selectedTemplateForModal,
      selectedThemeColor,
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
      pptHistoryCurrentPage,
      experienceCurrentPage,
      pptMakerExperienceCurrentPage,
      pptHistoryItemsPerPage,
      experienceItemsPerPage,
      pptMakerExperienceItemsPerPage,
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
      setImageErrorState: (imageKey) => uiLogic.setImageErrorState(imageKey, setImageLoadingStates),
      retryImageLoad: (imgElement, originalUrl, retryCount) => uiLogic.retryImageLoad(imgElement, originalUrl, retryCount, (imageKey, isLoading) => uiLogic.setImageLoadingState(imageKey, isLoading, setImageLoadingStates), (imageKey) => uiLogic.setImageErrorState(imageKey, setImageLoadingStates), driveService.current),
      toggleSelect: (idx) => uiLogic.toggleSelect(idx, selected, setSelected),
      setSelectedExperiences,
      openTemplateModal: (templateName) => uiLogic.openTemplateModal(templateName, setSelectedTemplateForModal, setShowTemplateModal),
      handleTemplateCancel: () => uiLogic.handleTemplateCancel(setShowTemplateModal, setSelectedTemplateForModal),
      handleTemplateUse,
      handleThemeColorSelect,
      closeModal: () => {
        uiLogic.closeModal(setShowModal, setForm, setSelectedImages, setImagePreviews, setEditingIndex, setOriginalPeriod);
        setExistingImageUrls([]);
      },
      saveExperience,
      closeImageModal: () => uiLogic.closeImageModal(setShowImageModal, setSelectedImageForModal),
      closeExperienceModal: () => uiLogic.closeExperienceModal(setSelectedExperience, setShowExperienceModal),
      showEditExperienceModal: (index) => uiLogic.showEditExperienceModal(index, experiences, setForm, setImagePreviews, setEditingIndex, setShowModal, setOriginalPeriod, setExistingImageUrls),
      deleteIndividualExperience,
      handleImageSelect: (event) => uiLogic.handleImageSelect(event, setSelectedImages, setImagePreviews),
      handleDroppedFiles: (files) => uiLogic.handleDroppedFiles(files, setSelectedImages, setImagePreviews),
      removeImage: (index) => uiLogic.removeImage(index, setSelectedImages, setImagePreviews, existingImageUrls, setExistingImageUrls, imagePreviews),
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
      openFileInNewTab,
      formatFileSize,
      getFileTypeDisplay,
      convertImageUrl,
      convertImageUrlToThumbnail,
      convertImageUrlToFullSize,
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
      setShowImageModal,
      // 서비스들
      driveService: driveService.current,
      // 약관 및 정책 페이지 관련
      showPrivacyPolicy,
      showTermsOfService,
      setShowPrivacyPolicy,
      setShowTermsOfService,
      // 페이지네이션 함수들
      getPaginatedItems: (items, currentPage, itemsPerPage) => uiLogic.getPaginatedItems(items, currentPage, itemsPerPage),
      getTotalPages: (items, itemsPerPage) => uiLogic.getTotalPages(items, itemsPerPage),
      goToPptHistoryPage: (page) => uiLogic.goToPage(page, setPptHistoryCurrentPage, uiLogic.getTotalPages(pptHistory, pptHistoryItemsPerPage)),
      goToPptHistoryNextPage: () => uiLogic.goToNextPage(pptHistoryCurrentPage, uiLogic.getTotalPages(pptHistory, pptHistoryItemsPerPage), setPptHistoryCurrentPage),
      goToPptHistoryPrevPage: () => uiLogic.goToPrevPage(pptHistoryCurrentPage, setPptHistoryCurrentPage),
      goToExperiencePage: (page) => uiLogic.goToPage(page, setExperienceCurrentPage, uiLogic.getTotalPages(experiences, experienceItemsPerPage)),
      goToExperienceNextPage: () => uiLogic.goToNextPage(experienceCurrentPage, uiLogic.getTotalPages(experiences, experienceItemsPerPage), setExperienceCurrentPage),
      goToExperiencePrevPage: () => uiLogic.goToPrevPage(experienceCurrentPage, setExperienceCurrentPage),
      goToPptMakerExperiencePage: (page) => uiLogic.goToPage(page, setPptMakerExperienceCurrentPage, uiLogic.getTotalPages(experiences, pptMakerExperienceItemsPerPage)),
      goToPptMakerExperienceNextPage: () => uiLogic.goToNextPage(pptMakerExperienceCurrentPage, uiLogic.getTotalPages(experiences, pptMakerExperienceItemsPerPage), setPptMakerExperienceCurrentPage),
      goToPptMakerExperiencePrevPage: () => uiLogic.goToPrevPage(pptMakerExperienceCurrentPage, setPptMakerExperienceCurrentPage),
      setPptHistoryCurrentPage,
      setExperienceCurrentPage,
      setPptMakerExperienceCurrentPage,
      selectedBgImage,
      bgImagePreview,
      handleBgImageSelect,
      handleBgImageDrop,
      removeBgImage,
      pptSortBy,
      setPptSortBy,
      pptSortOrder,
      setPptSortOrder,
      expSortBy,
      setExpSortBy,
      expSortOrder,
      setExpSortOrder,
      driveSortBy,
      setDriveSortBy,
      driveSortOrder,
      setDriveSortOrder,
      handleDriveFileDownload
    };
}

export { useAppLogic };