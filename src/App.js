import React, { useState, useRef, useEffect } from 'react';
import GoogleSheetsService from './services/googleSheetsService';
import GoogleDriveService from './services/googleDriveService';
import GoogleAuthService from './services/googleAuthService';

const SECTION_LIST = [
  'main', 'drive', 'portal', 'pptMaker', 'myPage'
];

function App() {
  // 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    // localStorage에서 저장된 섹션 복원
    return localStorage.getItem('activeSection') || 'main';
  });
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

  // 섹션 전환
  function showSection(section) {
    setActiveSection(section);
    localStorage.setItem('activeSection', section);
  }

  // 통합 인증 시스템 초기화
  async function initializeGoogleAuth() {

    try {
      console.log('통합 인증 시스템 초기화 시작...');

      // 인증 상태 변경 리스너 등록
      authService.current.addAuthStateListener((isAuthenticated) => {
        setAuthStatus(isAuthenticated ? 'connected' : 'disconnected');
        console.log('인증 상태 변경:', isAuthenticated);
      });

      // 에러 리스너 등록
      authService.current.addErrorListener((error) => {
        console.error('인증 에러 발생:', error);
        setAuthStatus('error');
      });

      // 통합 인증 초기화
      await authService.current.initialize();
      console.log('통합 인증 시스템 초기화 완료');

      // 인증 상태 확인 및 토큰 갱신 시도
      if (!authService.current.isAuthenticated()) {
        console.log('인증 상태가 유효하지 않습니다. 토큰 갱신을 시도합니다...');
        try {
          // 토큰 갱신 시도 (팝업 없이)
          await authService.current.refreshToken();
          console.log('토큰 갱신 완료');
        } catch (tokenError) {
          console.log('토큰 갱신 실패:', tokenError);

          // interaction_required 오류는 정상적인 상황으로 처리
          if (tokenError.message === 'interaction_required') {
            console.log('사용자 상호작용이 필요한 상황입니다. 로그인 상태는 유지합니다.');


            // 토큰 갱신이 실패해도 기존 토큰이 있다면 서비스 초기화를 시도
            if (authService.current.hasExistingToken()) {
              console.log('기존 토큰이 있습니다. 서비스 초기화를 시도합니다.');
            } else {
              console.log('기존 토큰이 없습니다. 서비스 초기화를 건너뜁니다.');
              // 토큰이 없으면 서비스 초기화를 건너뜀 (로그인 상태는 유지)
              setAuthStatus('disconnected');
              setIsSheetsInitialized(false);
              setIsDriveInitialized(false);
              return;
            }
          } else {
            // 다른 오류는 서비스 초기화를 건너뜀
            setAuthStatus('disconnected');
            setIsSheetsInitialized(false);
            setIsDriveInitialized(false);
            return;
          }
        }
      }

      // 인증 완료 후 서비스들 초기화
      await initializeServices();

    } catch (error) {
      console.error('통합 인증 시스템 초기화 오류:', error);
      setAuthStatus('error');
      throw error;
    }
  }

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
        await loadExperiencesFromSheets(currentSpreadsheetId);
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

  // 시트에서 이력 데이터 로드
  async function loadExperiencesFromSheets(spreadsheetIdToUse = null) {
    const targetSpreadsheetId = spreadsheetIdToUse || spreadsheetId;

    if (!targetSpreadsheetId || !sheetsService.current) return;

    try {
      const sheetData = await sheetsService.current.readData(targetSpreadsheetId, 'A:E');
      const experiences = sheetsService.current.formatSheetToExperience(sheetData);
      setExperiences(experiences);
      
      // 이미지 프리로딩 (백그라운드에서 미리 로딩)
      experiences.forEach(exp => {
        if (exp.imageUrls && exp.imageUrls.length > 0) {
          exp.imageUrls.forEach(imageUrl => {
            preloadImage(imageUrl).catch(err => {
              console.log('이미지 프리로딩 실패 (무시됨):', imageUrl, err);
            });
          });
        }
      });
    } catch (error) {
      console.error('이력 데이터 로드 오류:', error);
      // 시트가 존재하지 않는 경우 로그만 출력하고 새로 생성하지 않음
      if (error.message.includes('찾을 수 없습니다') || error.status === 404) {
        console.log('시트가 존재하지 않습니다. 시트를 다시 생성해주세요.');
        // 사용자에게 알림
        alert('포트폴리오 시트가 삭제되었습니다. 로그아웃 후 다시 로그인해주세요.');
      }
    }
  }

  // 드라이브 파일 목록 로드
  async function loadDriveFiles(parentId = null) {
    if (!driveService.current) return;

    try {
      setIsDriveLoading(true);
      console.log('드라이브 파일 불러오기 시작, 뷰 모드:', driveViewMode, '부모 ID:', parentId);

      // 시트가 있다면 실제로 존재하는지 확인
      if (spreadsheetId && sheetsService.current) {
        try {
          const exists = await sheetsService.current.checkSpreadsheetExists(spreadsheetId);
          if (!exists) {
            console.log('저장된 시트가 존재하지 않습니다. 상태를 초기화합니다.');
            setSpreadsheetId(null);
            localStorage.removeItem('spreadsheetId');
          }
        } catch (error) {
          console.log('시트 존재 확인 중 오류:', error);
          setSpreadsheetId(null);
          localStorage.removeItem('spreadsheetId');
        }
      }

      let files;
      if (parentId) {
        // 특정 폴더 내 파일 로드
        files = await driveService.current.listFiles(50, parentId);
        console.log('폴더 내 파일:', files);
      } else if (driveViewMode === 'portfolio' && portfolioFolderId) {
        // 포트폴리오 폴더 내 파일만 로드
        files = await driveService.current.listFiles(50, portfolioFolderId);
        console.log('포트폴리오 폴더 파일:', files);
      } else {
        // 전체 파일 로드
        files = await driveService.current.listFiles(20);
        console.log('전체 드라이브 파일:', files);
      }

      setDriveFiles(files);
    } catch (error) {
      console.error('드라이브 파일 로드 오류:', error);
    } finally {
      setIsDriveLoading(false);
    }
  }

  // 로그인 상태 저장
  function saveLoginState(loggedIn, spreadsheetIdValue = null) {
    setIsLoggedIn(loggedIn);
    localStorage.setItem('isLoggedIn', loggedIn.toString());

    if (spreadsheetIdValue) {
      setSpreadsheetId(spreadsheetIdValue);
      localStorage.setItem('spreadsheetId', spreadsheetIdValue);
    }

    // 로그아웃 시에는 스프레드시트 ID도 제거
    if (!loggedIn) {
      localStorage.removeItem('spreadsheetId');
      setSpreadsheetId(null);
    }
  }

  // GIS 기반 로그인 (단일 팝업에서 로그인+권한 처리)
  async function handleGISLogin() {
    try {
      setIsLoading(true);
      console.log('GIS 기반 로그인 시작...');

      // 통합 인증 시스템 초기화
      await authService.current.initialize();
      console.log('인증 시스템 초기화 완료');

      // 단일 팝업에서 로그인과 권한 요청
      await authService.current.requestToken();
      console.log('GIS 로그인 및 권한 요청 완료');

      // 로그인 상태 저장 (이미 isLoggedIn이 true로 설정되어 있으므로 스프레드시트 ID만 전달)
      saveLoginState(true);

      // 메인 페이지로 이동 (저장된 섹션이 있으면 그대로 유지)
      const savedSection = localStorage.getItem('activeSection') || 'main';
      setActiveSection(savedSection);

      // 인증 완료 후 서비스들 초기화
      await initializeServices();

      // 액세스 토큰 설정
      try {
        const token = authService.current.getAccessToken();
        setAccessToken(token);
      } catch (error) {
        console.log('토큰 가져오기 실패:', error);
      }

    } catch (error) {
      console.error('GIS 로그인 오류:', error);
      const errorMessage = error?.message || '로그인에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  // 로그아웃
  function logout() {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      // 통합 인증 서비스에서 로그아웃
      authService.current.logout();

      // 로컬 상태 정리 (saveLoginState에서 스프레드시트 ID도 제거됨)
      saveLoginState(false);
      setActiveSection('main');
      localStorage.setItem('activeSection', 'main');
      localStorage.setItem('driveViewMode', 'all');
      localStorage.removeItem('portfolioFolderId');
      setPortfolioFolderId(null);
      setIsSheetsInitialized(false);
      setIsDriveInitialized(false);
      setAuthStatus('disconnected');

      // 서비스 인스턴스 정리
      sheetsService.current = null;
      driveService.current = null;
    }
  }

  // 이력 추가 모달
  function showEditExperienceModal(index) {
    const expToEdit = experiences[index];

    // 폼 상태를 선택된 이력 데이터로 채웁니다.
    setForm({
      title: expToEdit.title,
      startDate: expToEdit.startDate,
      endDate: expToEdit.endDate,
      description: expToEdit.description
    });

    // 이미지 처리는 더 복잡하므로 여기서는 폼 데이터만 채웁니다.
    // 실제 구현에서는 이미지 URL을 preview 상태로 변환하는 로직이 필요합니다.

    setEditingIndex(index); // 수정 모드임을 표시
    setShowModal(true);
  }

  function showAddExperienceModal() {
    // 상태 초기화 (폼, 이미지, 편집 인덱스 등)
    setForm({ title: '', startDate: '', endDate: '', description: '' });
    setSelectedImages([]);
    setImagePreviews([]);
    setEditingIndex(null); // 수정 모드 아님을 확실히 지정

    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setForm({ title: '', startDate: '', endDate: '', description: '' });
    setSelectedImages([]);
    setImagePreviews([]);
    setEditingIndex(null);
  }

  // 기간 포맷팅 함수
  function formatPeriod(startDate, endDate) {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 시작일과 종료일이 같은 경우 (하루짜리)
    if (start.toDateString() === end.toDateString()) {
      const year = start.getFullYear();
      const month = String(start.getMonth() + 1).padStart(2, '0');
      const day = String(start.getDate()).padStart(2, '0');
      return `${year}.${month}.${day}`;
    }

    // 여러 기간인 경우
    const startYear = start.getFullYear();
    const startMonth = String(start.getMonth() + 1).padStart(2, '0');
    const startDay = String(start.getDate()).padStart(2, '0');
    const endYear = end.getFullYear();
    const endMonth = String(end.getMonth() + 1).padStart(2, '0');
    const endDay = String(end.getDate()).padStart(2, '0');

    return `${startYear}.${startMonth}.${startDay} - ${endYear}.${endMonth}.${endDay}`;
  }

  // 날짜 유효성 검사 함수
  function validateDates(startDate, endDate) {
    if (!startDate || !endDate) return false;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // 시작일이 종료일보다 늦으면 안됨
    if (start > end) {
      alert('시작일은 종료일보다 이전이어야 합니다.');
      return false;
    }

    // 미래 날짜 체크 (선택사항)
    const today = new Date();
    if (start > today) {
      alert('시작일은 오늘 이전이어야 합니다.');
      return false;
    }

    return true;
  }

  // 이력 저장
  async function saveExperience(e) {
    e.preventDefault();
    if (form.title && form.startDate && form.endDate && form.description) {
      // 날짜 유효성 검사
      if (!validateDates(form.startDate, form.endDate)) {
        return;
      }

      try {
        setIsExperienceLoading(true);

        let newImageUrls = [];
        // 1. 새 이미지가 있다면 드라이브에 업로드
        if (selectedImages.length > 0) {
          for (const imageFile of selectedImages) {
            const imageUrl = await uploadImageToDrive(imageFile, form.title);
            newImageUrls.push(imageUrl);
          }
        }

        const period = formatPeriod(form.startDate, form.endDate);
        let experienceToSave;

        if (editingIndex !== null) {
          // ⭐ 수정 모드 (Editing Mode)
          const existingImageUrls = experiences[editingIndex].imageUrls || [];

          experienceToSave = {
            ...form,
            period,
            // 기존 이미지 URL에 새로 업로드한 이미지 URL을 합칩니다.
            imageUrls: existingImageUrls.concat(newImageUrls)
          };

          const rowNumber = editingIndex + 2;
          if (spreadsheetId && sheetsService.current) {
            const sheetData = sheetsService.current.formatExperienceForSheet(experienceToSave);
            await sheetsService.current.updateData(spreadsheetId, `A${rowNumber}:E${rowNumber}`, [sheetData]);
          }
          setExperiences(prev => prev.map((exp, i) => i === editingIndex ? experienceToSave : exp));

        } else {
          // ⭐ 등록 모드 (Creation Mode)
          experienceToSave = {
            ...form,
            period,
            imageUrls: newImageUrls // 새 이력은 새로 업로드한 이미지 URL만 가집니다.
          };

          // 1. 구글 시트 추가
          if (spreadsheetId && sheetsService.current) {
            const sheetData = sheetsService.current.formatExperienceForSheet(experienceToSave);
            await sheetsService.current.appendData(spreadsheetId, 'A:E', [sheetData]);
          }

          // 2. ⭐ 로컬 상태에 새 이력 추가 (정확히 새 이력 객체만 추가) ⭐
          // 이 코드가 이력을 성공적으로 추가하고 화면에 남아있도록 보장합니다.
          setExperiences(prev => [...prev, experienceToSave]);
        }

        closeModal();
      } catch (error) {
        console.error('이력 저장/수정 오류:', error);
        const errorMessage = sheetsService.current?.formatErrorMessage(error) || '이력 저장/수정에 실패했습니다.';
        alert(errorMessage);
      } finally {
        setIsExperienceLoading(false);
      }
    }
  }

  // 전체 선택/해제
  function selectAllExperiences(select) {
    if (select) {
      setSelected(experiences.map((_, i) => i));
    } else {
      setSelected([]);
    }
  }

  // 체크박스 변경
  function toggleSelect(idx) {
    setSelected(selected.includes(idx)
        ? selected.filter(i => i !== idx)
        : [...selected, idx]
    );
  }

  // 이미지 선택 핸들러
  function handleImageSelect(event) {
    const files = Array.from(event.target.files);

    // 각 파일에 대해 검증 및 처리
    files.forEach(file => {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        alert(`파일 ${file.name}의 크기는 5MB 이하여야 합니다.`);
        return;
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        alert(`파일 ${file.name}은 이미지 파일이 아닙니다.`);
        return;
      }

      // 이미지 미리보기 URL 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImages(prev => [...prev, file]);
        setImagePreviews(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });

    // input 초기화 (같은 파일을 다시 선택할 수 있도록)
    event.target.value = '';
  }

  // 이미지 제거
  function removeImage(index) {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  }

  // 이미지 확대 모달 표시
  function openImageModal(imageUrl, title) {
    setSelectedImageForModal({ url: imageUrl, title });
    setShowImageModal(true);
  }

  // 이력 상세 모달 열기
  function openExperienceModal(experience) {
    setSelectedExperience(experience);
    setShowExperienceModal(true);
  }

  // 이력 상세 모달 닫기
  function closeExperienceModal() {
    setSelectedExperience(null);
    setShowExperienceModal(false);
  }

  // 이미지 확대 모달 닫기
  function closeImageModal() {
    setShowImageModal(false);
    setSelectedImageForModal(null);
  }

  // 이미지 URL 변환 캐시 (무한 재귀 방지)
  const imageUrlCache = new Map();
  
  // 이미지 프리로딩 캐시 (이미 로딩된 이미지 추적)
  const preloadedImages = new Set();
  
  // 이미지 프리로딩 함수 (백그라운드에서 미리 로딩)
  function preloadImage(imageUrl) {
    if (preloadedImages.has(imageUrl)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        preloadedImages.add(imageUrl);
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }
  
  // 이미지 로딩 상태 관리 함수들
  function setImageLoadingState(imageKey, isLoading) {
    setImageLoadingStates(prev => {
      const newMap = new Map(prev);
      if (isLoading) {
        newMap.set(imageKey, 'loading');
      } else {
        newMap.delete(imageKey);
      }
      return newMap;
    });
  }

  function setImageErrorState(imageKey) {
    setImageLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(imageKey, 'error');
      return newMap;
    });
  }

  // 이미지 로딩 재시도 함수 (최적화됨)
  async function retryImageLoad(imgElement, originalUrl, retryCount = 0) {
    const maxRetries = 2; // 재시도 횟수 감소
    const imageKey = `${originalUrl}_${imgElement.alt}`;
    
    // 이미 프리로딩된 이미지인지 확인
    if (preloadedImages.has(originalUrl)) {
      imgElement.src = originalUrl;
      return;
    }
    
    const fileId = originalUrl.match(/[-\w]{25,}/)?.[0];
    const alternativeUrls = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`, // 가장 빠른 썸네일
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`, // 더 작은 썸네일
      `https://drive.google.com/uc?export=view&id=${fileId}`
    ];
    
    if (retryCount >= maxRetries) {
      console.error('이미지 로딩 실패 - 모든 재시도 소진:', originalUrl);
      setImageErrorState(imageKey);
      imgElement.style.display = 'none';
      return;
    }
    
    const currentUrl = retryCount === 0 ? originalUrl : alternativeUrls[retryCount - 1];
    console.log(`이미지 로딩 재시도 ${retryCount + 1}/${maxRetries + 1}:`, currentUrl);
    
    // 로딩 상태 설정
    setImageLoadingState(imageKey, true);
    
    // 새로운 이미지 객체로 테스트 (타임아웃 설정)
    const testImg = new Image();
    let timeoutId;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      setImageLoadingState(imageKey, false);
    };
    
    // 3초 타임아웃 설정 (더 빠른 응답)
    timeoutId = setTimeout(() => {
      console.log('이미지 로딩 타임아웃:', currentUrl);
      cleanup();
      setTimeout(() => retryImageLoad(imgElement, originalUrl, retryCount + 1), 300); // 더 빠른 재시도
    }, 3000);
    
    testImg.onload = () => {
      cleanup();
      preloadedImages.add(currentUrl); // 성공한 URL을 캐시에 추가
      imgElement.src = currentUrl;
      console.log('이미지 로딩 성공:', currentUrl);
    };
    
    testImg.onerror = () => {
      cleanup();
      setTimeout(() => retryImageLoad(imgElement, originalUrl, retryCount + 1), 300); // 더 빠른 재시도
    };
    
    testImg.src = currentUrl;
  }

  // 기존 이미지 URL을 올바른 형식으로 변환
  async function convertImageUrl(imageUrl) {
    // 캐시에서 확인
    if (imageUrlCache.has(imageUrl)) {
      return imageUrlCache.get(imageUrl);
    }

    // 이미 Base64 데이터 URL이거나 직접 접근 URL인 경우 그대로 반환
    if (imageUrl.startsWith('data:') || imageUrl.includes('uc?export=view&id=')) {
      imageUrlCache.set(imageUrl, imageUrl);
      return imageUrl;
    }

    // 구글 드라이브 파일 ID 추출
    const fileIdMatch = imageUrl.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
      console.warn('구글 드라이브 파일 ID를 찾을 수 없습니다:', imageUrl);
      imageUrlCache.set(imageUrl, imageUrl);
      return imageUrl;
    }

    const fileId = fileIdMatch[0];
    
    // 썸네일 크기로 최적화된 URL 우선 사용 (로딩 속도 향상)
    const possibleUrls = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`, // 썸네일 크기로 최적화
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
      `https://lh3.googleusercontent.com/d/${fileId}`,
      `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
    ];
    
    // 첫 번째 URL을 기본으로 사용 (썸네일 크기로 빠른 로딩)
    const directUrl = possibleUrls[0];
    console.log('이미지 URL 변환 (최적화):', imageUrl, '→', directUrl);
    
    imageUrlCache.set(imageUrl, directUrl);
    return directUrl;
  }

  // 구글 계정 이름 가져오기
  async function getGoogleAccountName() {
    try {
      const gapiClient = authService.current.getAuthenticatedGapiClient();
      
      // Google People API를 사용하여 사용자 정보 가져오기
      const response = await gapiClient.people.people.get({
        resourceName: 'people/me',
        personFields: 'names'
      });
      
      const names = response.result.names;
      if (names && names.length > 0) {
        // 첫 번째 이름 반환 (일반적으로 주 이름)
        return names[0].displayName || names[0].givenName || '사용자';
      }
      
      return '사용자';
    } catch (error) {
      console.error('구글 계정 이름 가져오기 실패:', error);
      return '사용자';
    }
  }

  // PPT 기록 조회
  async function loadPptHistory() {
    if (!driveService.current) return;
    
    try {
      setIsLoading(true);
      
      // 포트폴리오 폴더 확인/생성
      const portfolioFolder = await driveService.current.ensurePortfolioFolder();
      
      // PPT 폴더 찾기
      const pptFolder = await driveService.current.findFolder('PPT', portfolioFolder.id);
      
      if (!pptFolder) {
        console.log('PPT 폴더가 없습니다.');
        setPptHistory([]);
        return;
      }
      
      // PPT 폴더에서 PPT 파일들 조회
      const files = await driveService.current.getFilesInFolder(pptFolder.id);
      
      // PPT 파일만 필터링 (Google Slides 파일)
      const pptFiles = files.filter(file => 
        file.mimeType === 'application/vnd.google-apps.presentation'
      );
      
      // 생성일 기준으로 최신순 정렬
      const sortedPptFiles = pptFiles.sort((a, b) => 
        new Date(b.createdTime) - new Date(a.createdTime)
      );
      
      setPptHistory(sortedPptFiles);
      console.log('PPT 기록 로드됨:', sortedPptFiles);
      
    } catch (error) {
      console.error('PPT 기록 조회 오류:', error);
      alert('PPT 기록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }

  // 드롭된 파일 처리
  function handleDroppedFiles(files) {
    files.forEach(file => {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        alert(`파일 ${file.name}의 크기는 5MB 이하여야 합니다.`);
        return;
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith('image/')) {
        alert(`파일 ${file.name}은 이미지 파일이 아닙니다.`);
        return;
      }

      // 이미지 미리보기 URL 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImages(prev => [...prev, file]);
        setImagePreviews(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
  }

  // 이미지를 구글 드라이브에 업로드하고 공개 링크 생성
  async function uploadImageToDrive(imageFile, experienceTitle) {
    if (!driveService.current) {
      throw new Error('구글 드라이브 서비스가 초기화되지 않았습니다.');
    }

    try {
      // 포트폴리오 이력 폴더와 이미지 폴더 확인/생성
      const portfolioFolder = await driveService.current.ensurePortfolioFolder();
      const imageFolder = await driveService.current.ensureImageFolder(portfolioFolder.id);

      // 이력별 이미지 폴더 생성 또는 찾기
      const experienceFolder = await driveService.current.ensureExperienceImageFolder(experienceTitle, imageFolder.id);

      // 해당 이력 폴더의 기존 파일 목록 가져오기
      const existingFiles = await driveService.current.getFilesInFolder(experienceFolder.id);
      
      // 순차적 번호가 포함된 파일명 생성
      const finalFileName = driveService.current.generateSequentialFileName(imageFile.name, existingFiles);
      console.log(`원본 파일명: ${imageFile.name} → 최종 파일명: ${finalFileName}`);

      // 이미지 파일을 해당 이력 폴더에 업로드
      const uploadResult = await driveService.current.uploadFile(
          finalFileName,
          imageFile,
          imageFile.type,
          experienceFolder.id
      );

      if (!uploadResult.id) {
        throw new Error('이미지 업로드에 실패했습니다.');
      }

      // 파일을 공개로 설정 (링크 공유 가능하게)
      const gapiClient = authService.current.getAuthenticatedGapiClient();
      await gapiClient.drive.permissions.create({
        fileId: uploadResult.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });

      // 권한 설정 후 충분한 대기 시간 (권한 변경이 반영되도록)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 썸네일 크기로 최적화된 URL 반환 (빠른 로딩)
      const directUrl = `https://drive.google.com/thumbnail?id=${uploadResult.id}&sz=w400`;
      console.log('생성된 이미지 URL (최적화):', directUrl);
      return directUrl;
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      throw new Error('이미지를 구글 드라이브에 업로드하는데 실패했습니다.');
    }
  }

  // 선택된 이력 삭제
  async function deleteSelectedExperiences() {
    if (selected.length === 0 || !sheetsService.current) return;

    if (!window.confirm('선택된 이력을 삭제하시겠습니까?')) return;

    try {
      setIsExperienceLoading(true);

      // 선택된 이력들을 구글 시트에서 삭제
      if (spreadsheetId && isSheetsInitialized) {
        // 선택된 행들을 역순으로 정렬하여 삭제 (인덱스가 변경되지 않도록)
        const sortedSelected = [...selected].sort((a, b) => b - a);

        for (const index of sortedSelected) {
          // 헤더 + 선택된 인덱스 + 1 (시트는 1부터 시작)
          const rowNumber = index + 2;
          await sheetsService.current.deleteData(spreadsheetId, `A${rowNumber}:E${rowNumber}`);
        }
      }

      // 로컬 상태에서도 삭제
      const newExperiences = experiences.filter((_, idx) => !selected.includes(idx));
      setExperiences(newExperiences);
      setSelected([]);

    } catch (error) {
      console.error('이력 삭제 오류:', error);
      const errorMessage = sheetsService.current?.formatErrorMessage(error) || '이력 삭제에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsExperienceLoading(false);
    }
  }

  // 개별 이력 삭제
  async function deleteIndividualExperience(indexToDelete) {
    const expToDelete = experiences[indexToDelete];

    if (!window.confirm(`"${expToDelete.title}" 이력을 정말로 삭제하시겠습니까?`)) {
      return;
    }

    try {
      setIsExperienceLoading(true);

      if (spreadsheetId && sheetsService.current) {
        // 헤더(1행) + 인덱스(0부터 시작) + 1 = 실제 시트 행 번호
        const rowNumber = indexToDelete + 2;

        // 시트에서 해당 행 삭제
        await sheetsService.current.deleteData(spreadsheetId, `A${rowNumber}:E${rowNumber}`);
      }

      // 로컬 상태에서도 삭제
      const newExperiences = experiences.filter((_, idx) => idx !== indexToDelete);
      setExperiences(newExperiences);

      // 선택된 목록도 갱신 (선택된 이력이 삭제되었을 경우를 대비)
      setSelected([]);

      alert('이력이 삭제되었습니다!');

    } catch (error) {
      console.error('개별 이력 삭제 오류:', error);
      const errorMessage = sheetsService.current?.formatErrorMessage(error) || '이력 삭제에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsExperienceLoading(false);
    }
  }

  // 파일 다운로드 (Access Token 사용)
  async function handleDriveFileDownload(file) {
    if (!driveService.current || !authService.current) return;
    try {
      setIsLoading(true);
      const accessToken = authService.current.getAccessToken();
      // 구글 문서류(import가 필요한 유형)는 export, 일반 파일은 alt=media
      const isGoogleDoc = file.mimeType?.includes('application/vnd.google-apps');
      const exportMap = {
        'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.google-apps.drawing': 'image/png',
      };

      const url = isGoogleDoc
          ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMap[file.mimeType] || 'application/pdf')}`
          : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
      const blob = await res.blob();

      // 파일명/확장자 보정
      let filename = file.name;
      if (isGoogleDoc) {
        const extMap = {
          'application/vnd.google-apps.document': '.docx',
          'application/vnd.google-apps.spreadsheet': '.xlsx',
          'application/vnd.google-apps.presentation': '.pptx',
          'application/vnd.google-apps.drawing': '.png',
        };
        if (!/\.[a-z0-9]+$/i.test(filename)) filename += (extMap[file.mimeType] || '.pdf');
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      const msg = driveService.current?.formatErrorMessage?.(e) || e.message || '다운로드 오류';
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  }


  // 파일 업로드 핸들러
  async function handleDriveFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !driveService.current) return;

    try {
      setIsUploadLoading(true);
      await driveService.current.uploadFile(file.name, file, file.type);
      
      // 현재 경로를 유지하면서 파일 목록 새로고침
      const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      await loadDriveFiles(currentParentId);
      
      alert('파일이 업로드되었습니다!');
    } catch (error) {
      const errorMessage = driveService.current?.formatErrorMessage(error) || '파일 업로드에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsUploadLoading(false);
    }
  }

  // 파일 삭제 핸들러
  async function handleDriveFileDelete(fileId) {
    if (!window.confirm('정말로 이 파일을 삭제하시겠습니까?') || !driveService.current) return;

    try {
      // 해당 파일 ID를 삭제 중 상태에 추가
      setDeletingFileIds(prev => new Set([...prev, fileId]));
      await driveService.current.deleteFile(fileId);
      
      // 현재 경로를 유지하면서 파일 목록 새로고침
      const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      await loadDriveFiles(currentParentId);
      
      alert('파일이 삭제되었습니다!');
    } catch (error) {
      const errorMessage = driveService.current?.formatErrorMessage(error) || '파일 삭제에 실패했습니다.';
      alert(errorMessage);
    } finally {
      // 해당 파일 ID를 삭제 중 상태에서 제거
      setDeletingFileIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }

  // 구글 시트 데이터 새로고침
  async function refreshSheetsData() {
    try {
      setIsExperienceLoading(true);
      await loadExperiencesFromSheets();
    } catch (error) {
      console.error('시트 데이터 새로고침 오류:', error);
      alert('데이터 새로고침에 실패했습니다: ' + (error?.message || error));
    } finally {
      setIsExperienceLoading(false);
    }
  }

  // 시트 생성
  async function createSheet() {
    if (!sheetsService.current || !driveService.current) return;

    try {
      setIsSheetLoading(true);

      // 포트폴리오 이력 폴더 생성 또는 찾기
      const portfolioFolder = await driveService.current.ensurePortfolioFolder();
      setPortfolioFolderId(portfolioFolder.id);
      localStorage.setItem('portfolioFolderId', portfolioFolder.id);

      // 이미지 폴더도 생성
      await driveService.current.ensureImageFolder(portfolioFolder.id);

      // 시트 생성
      const spreadsheet = await sheetsService.current.createSpreadsheet('포트폴리오 이력', portfolioFolder.id);
      const newSpreadsheetId = spreadsheet.spreadsheetId;

      // 상태 업데이트
      setSpreadsheetId(newSpreadsheetId);
      localStorage.setItem('spreadsheetId', newSpreadsheetId);

      // 헤더 설정
      await sheetsService.current.setupHeaders(newSpreadsheetId);

      // 파일 목록 새로고침
      await loadDriveFiles();

      alert('포트폴리오 시트와 폴더가 생성되었습니다!');
    } catch (error) {
      console.error('시트 생성 오류:', error);
      alert('시트 생성에 실패했습니다: ' + (error?.message || error));
    } finally {
      setIsSheetLoading(false);
    }
  }

  // 시트 삭제
  async function deleteSheet() {
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
          console.log('포트폴리오 이력 폴더도 삭제됨');
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

  // 뷰 모드 전환
  async function switchViewMode(mode) {
    try {
      setIsViewModeLoading(true);
      setDriveViewMode(mode);
      localStorage.setItem('driveViewMode', mode);
      setCurrentPath([]); // 경로 초기화
      await loadDriveFiles();
    } finally {
      setIsViewModeLoading(false);
    }
  }

  // 드라이브 새로고침
  async function handleDriveRefresh() {
    try {
      setIsRefreshLoading(true);
      
      // 현재 경로를 유지하면서 파일 목록 새로고침
      const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
      await loadDriveFiles(currentParentId);
    } finally {
      setIsRefreshLoading(false);
    }
  }

  // 프레젠테이션 생성
  async function createPresentation(title, token) {
    const res = await fetch('https://slides.googleapis.com/v1/presentations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title })
    });

    const data = await res.json();
    console.log('Created presentation ID:', data.presentationId);
    return data.presentationId;
  }

  // 슬라이드 추가 (TITLE_AND_BODY)
  async function addSlide(presentationId, token) {
    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            createSlide: {
              slideLayoutReference: {
                predefinedLayout: 'TITLE_AND_BODY'
              }
            }
          }
        ]
      })
    });
  }

  // 첫 슬라이드에 제목/부제목 설정 (레이아웃 변경 없이)
  async function makeTitleAndBody(presId, slideId, token, title, subtitle) {
    try {
      // 슬라이드 데이터를 가져와서 텍스트 요소들을 찾기
      const slideData = await getPresentationData(presId, token);
      const slide = slideData.slides.find(s => s.objectId === slideId);
      
      if (!slide || !slide.pageElements) {
        console.error('슬라이드 또는 페이지 요소를 찾을 수 없습니다.');
        return;
      }

      console.log('슬라이드 요소들:', slide.pageElements);

      // 제목과 부제목 요소 찾기
      let titleElement = null;
      let subtitleElement = null;

      for (const element of slide.pageElements) {
        if (element.shape && element.shape.shapeType === 'TEXT_BOX') {
          // 첫 번째 텍스트 박스를 제목으로, 두 번째를 부제목으로 사용
          if (!titleElement) {
            titleElement = element;
          } else if (!subtitleElement) {
            subtitleElement = element;
          }
        }
      }

      const textRequests = [];

      // 제목 설정
      if (titleElement && title) {
        console.log('제목 설정:', title, '요소 ID:', titleElement.objectId);
        textRequests.push({
          insertText: {
            objectId: titleElement.objectId,
            insertionIndex: 0,
            text: title
          }
        });
      }

      // 부제목 설정
      if (subtitleElement && subtitle) {
        console.log('부제목 설정:', subtitle, '요소 ID:', subtitleElement.objectId);
        textRequests.push({
          insertText: {
            objectId: subtitleElement.objectId,
            insertionIndex: 0,
            text: subtitle
          }
        });
      }

      if (textRequests.length > 0) {
        await fetch(`https://slides.googleapis.com/v1/presentations/${presId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: textRequests })
        });
        console.log('제목과 부제목이 성공적으로 설정되었습니다.');
      } else {
        console.log('설정할 텍스트 요소를 찾을 수 없습니다.');
      }

    } catch (error) {
      console.error('makeTitleAndBody 오류:', error);
    }
  }

  async function getPresentationData(presentationId, token) {
    const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log('Slides data:', data);
    return data;
  }

  async function updateElementText(presentationId, elementId, newText, token) {
    const requests = [
      {
        insertText: {
          objectId: elementId,
          insertionIndex: 0,
          text: newText
        }
      },
      {
        deleteText: {
          objectId: elementId,
          textRange: { type: 'ALL' }
        }
      },
      {
        insertText: {
          objectId: elementId,
          insertionIndex: 0,
          text: newText
        }
      }
    ];

    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
  }

  //스타일 변경을 위한 함수 추가
  async function updateElementStyle(presentationId, elementId, styleObj, token) {
    const requests = [
      {
        updateTextStyle: {
          objectId: elementId,
          style: styleObj,
          fields: Object.keys(styleObj).join(','),
          textRange: { type: 'ALL' }
        }
      }
    ];


    await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
  }

  // 이미지를 슬라이드에 추가
  async function addImageToSlide(presentationId, slideId, imageUrl, token, position = { x: 0, y: 0, width: 300, height: 200 }) {
    try {
      const response = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              createImage: {
                objectId: `image_${Date.now()}`,
                url: imageUrl,
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: {
                      magnitude: position.width,
                      unit: 'PT'
                    },
                    height: {
                      magnitude: position.height,
                      unit: 'PT'
                    }
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: position.x,
                    translateY: position.y,
                    unit: 'PT'
                  }
                }
              }
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('이미지 추가 오류:', errorData);
        throw new Error(`이미지 추가 실패: ${errorData.error?.message || '알 수 없는 오류'}`);
      }

      const result = await response.json();
      console.log('이미지가 성공적으로 추가되었습니다:', result);
      return result;
    } catch (error) {
      console.error('이미지 추가 중 오류 발생:', error);
      throw error;
    }
  }

// API로 텍스트 수정하고 성공하면 로컬 slides 상태도 안전히 갱신하는 헬퍼
  async function updateElementTextAndLocal(pId, elementId, newText, token) {
    await updateElementText(pId, elementId, newText, token);


    setSlides(prevSlides => {
      return prevSlides.map(slide => {
        if (!slide.pageElements) return slide;
        const hasEl = slide.pageElements.some(pe => pe.objectId === elementId);
        if (!hasEl) return slide;


        const newPageElements = slide.pageElements.map(pe => {
          if (pe.objectId !== elementId) return pe;
          const newShape = {
            ...pe.shape,
            text: {
              ...pe.shape?.text,
              textElements: [{ textRun: { content: newText } }]
            }
          };
          return { ...pe, shape: newShape };
        });


        return { ...slide, pageElements: newPageElements };
      });
    });
  }


  function getTextFromElement(el) {
    if (!el.shape || !el.shape.text || !el.shape.text.textElements) return '';
    return el.shape.text.textElements.map(te => te.textRun?.content || '').join('');
  }

  async function downloadPptxFromDrive(presentationId, token) {
    const mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${presentationId}/export?mimeType=${encodeURIComponent(mime)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error('Export 실패: ' + text);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presentation_${presentationId}.pptx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function findFirstPlaceholder(shapeList, type /* 'TITLE' | 'BODY' */) {
    for (const el of shapeList) {
      if (el.shape && el.shape.placeholder && el.shape.placeholder.type === type) {
        return el.objectId;
      }
    }
    return null;
  }

  function getTextFromElement(el) {
    if (
        el.shape &&
        el.shape.text &&
        el.shape.text.textElements
    ) {
      return el.shape.text.textElements
          .map(te => te.textRun?.content || '')
          .join('');
    }
    return '';
  }

  // 템플릿 모달 표시
  function openTemplateModal(templateName) {
    setSelectedTemplateForModal(templateName);
    setShowTemplateModal(true);
  }

  // 템플릿 모달에서 사용 버튼 클릭
  async function handleTemplateUse() {
    setShowTemplateModal(false);
    await handleTemplateSelect(selectedTemplateForModal);
  }

  // 템플릿 모달에서 취소 버튼 클릭
  function handleTemplateCancel() {
    setShowTemplateModal(false);
    setSelectedTemplateForModal(null);
  }

  // 템플릿 설명 객체
  const templateDescriptions = {
    basic: {
      name: '기본 템플릿',
      description: '깔끔하고 전문적인 레이아웃으로 구성된 템플릿입니다. 각 이력사항을 개별 슬라이드로 구성하여 명확하고 간결하게 표현할 수 있습니다.',
      features: ['깔끔한 디자인', '이력별 개별 슬라이드', '전문적인 레이아웃', '이미지와 텍스트 조화'],
      previewImages: [
        `${process.env.PUBLIC_URL}/template/img/sample1.png`,
        `${process.env.PUBLIC_URL}/template/img/sample2.png`,
        `${process.env.PUBLIC_URL}/template/img/sample3.png`
      ]
    },
    timeline: {
      name: '타임라인 템플릿',
      description: '시간의 흐름에 따라 이력사항을 구성하는 템플릿입니다. 연도별로 정리된 타임라인과 함께 각 이력의 상세 내용을 보여줍니다.',
      features: ['시간순 구성', '타임라인 시각화', '연도별 정리', '발전 과정 표현'],
      previewImages: []
    },
    grid: {
      name: '그리드 템플릿',
      description: '격자 형태로 이력사항을 배치하는 템플릿입니다. 여러 이력을 한눈에 볼 수 있어 비교하기 쉽고 시각적으로 정리된 느낌을 줍니다.',
      features: ['격자형 레이아웃', '한눈에 보기', '비교 용이', '시각적 정리'],
      previewImages: []
    }
  };

  // 템플릿 선택 → 프레젠테이션 생성 + 이력 반영
  async function handleTemplateSelect(templateName) {
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
    if (!accessToken) {
      try {
        const token = await authService.current.getAccessToken();
        setAccessToken(token);
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
      const presId = await createPresentation(finalFileName, accessToken);
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
      let data = await getPresentationData(presId, accessToken);
      if (data.slides?.length > 0) {
        // 구글 계정에서 사용자 이름 가져오기
        let userName = '사용자';
        try {
          userName = await authService.current.getUserInfo();
        } catch (error) {
          console.warn('사용자 이름 가져오기 실패, 기본값 사용:', error);
        }
        
        await makeTitleAndBody(presId, data.slides[0].objectId, accessToken, cleanTitle, userName);
      }

      // 3) 템플릿별 슬라이드 추가
      if (templateName === 'basic') {
        for (let i = 0; i < selectedExperiences.length; i++) {
          await addSlide(presId, accessToken);
        }
      } else if (templateName === 'timeline') {
        await addSlide(presId, accessToken);
        await addSlide(presId, accessToken);
        for (let i = 0; i < selectedExperiences.length; i++) {
          await addSlide(presId, accessToken);
        }
      } else if (templateName === 'grid') {
        await addSlide(presId, accessToken);
        await addSlide(presId, accessToken);
      }

      // 4) 최신 데이터 가져오기
      data = await getPresentationData(presId, accessToken);
      const slidesArr = data.slides || [];

      // 5) 텍스트 채우기
      if (slidesArr[0]) {
        const s0 = slidesArr[0];
        const titleShapeId = findFirstPlaceholder(s0.pageElements, 'TITLE');
        const bodyShapeId  = findFirstPlaceholder(s0.pageElements, 'BODY');

        // 표지 제목: 원본 제목 (날짜 제외)
        if (titleShapeId) await updateElementText(presId, titleShapeId, title, accessToken);
        
        // 표지 본문: 구글 계정 이름
        if (bodyShapeId) {
          const userName = await getGoogleAccountName();
          await updateElementText(presId, bodyShapeId, userName, accessToken);
        }
      }

      let idx = 1;
      for (const exp of selectedExperiences) {
        if (!slidesArr[idx]) break;
        const s = slidesArr[idx];
        const titleShapeId = findFirstPlaceholder(s.pageElements, 'TITLE');
        const bodyShapeId  = findFirstPlaceholder(s.pageElements, 'BODY');

        if (titleShapeId) await updateElementText(presId, titleShapeId, exp.title, accessToken);
        if (bodyShapeId)  await updateElementText(presId, bodyShapeId, `${exp.period}\n\n${exp.description}`, accessToken);
        
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
              
              await addImageToSlide(presId, s.objectId, imageUrl, accessToken, imagePosition);
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
      const refreshed = await getPresentationData(presId, accessToken);
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

  // 폴더 진입
  async function enterFolder(folderId, folderName) {
    try {
      setIsViewModeLoading(true);
      
      // 포트폴리오 폴더인지 확인
      if (folderName === '포트폴리오 이력') {
        // 포트폴리오 폴더 ID가 설정되어 있으면 해당 ID와 비교
        if (portfolioFolderId && folderId === portfolioFolderId) {
          // 포트폴리오 폴더인 경우 작업영역을 포트폴리오 폴더로 전환
          setDriveViewMode('portfolio');
          setCurrentPath([]); // 경로 초기화
          await loadDriveFiles(); // 포트폴리오 폴더 내용 로드
        } else {
          // 포트폴리오 폴더 ID가 설정되지 않은 경우, 폴더 이름으로만 확인
          // 이 경우 포트폴리오 폴더 ID를 설정하고 작업영역 전환
          setPortfolioFolderId(folderId);
          localStorage.setItem('portfolioFolderId', folderId);
          setDriveViewMode('portfolio');
          setCurrentPath([]); // 경로 초기화
          await loadDriveFiles(); // 포트폴리오 폴더 내용 로드
        }
      } else {
        // 일반 폴더인 경우 기존 로직 유지
        setCurrentPath(prev => [...prev, { id: folderId, name: folderName }]);
        await loadDriveFiles(folderId);
      }
    } finally {
      setIsViewModeLoading(false);
    }
  }

  // 뒤로가기
  async function goBack() {
    if (currentPath.length === 0) return;

    try {
      setIsViewModeLoading(true);
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);

      if (newPath.length === 0) {
        // 루트로 돌아가기
        await loadDriveFiles();
      } else {
        // 이전 폴더로 돌아가기
        const parentFolderId = newPath[newPath.length - 1].id;
        await loadDriveFiles(parentFolderId);
      }
    } finally {
      setIsViewModeLoading(false);
    }
  }

  // 파일 다운로드
  async function downloadFile(file) {
    if (!driveService.current) return;

    try {
      // 구글 문서 파일인지 확인 (Google Docs, Sheets, Slides 등)
      const isGoogleDoc = file.mimeType && file.mimeType.includes('application/vnd.google-apps');

      if (isGoogleDoc) {
        // 구글 문서 파일은 export API 사용
        await downloadGoogleDoc(file);
      } else {
        // 일반 파일은 직접 다운로드
        await downloadRegularFile(file);
      }
    } catch (error) {
      console.error('파일 다운로드 오류:', error);
      alert('파일 다운로드에 실패했습니다: ' + (error?.message || error));
    }
  }

  // 구글 문서 파일 다운로드
  async function downloadGoogleDoc(file) {
    try {
      const accessToken = authService.current?.getAccessToken();
      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다.');
      }

      // MIME 타입에 따른 export 형식 결정
      let exportMimeType;
      let fileExtension;

      switch (file.mimeType) {
        case 'application/vnd.google-apps.spreadsheet':
          exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = '.xlsx';
          break;
        case 'application/vnd.google-apps.document':
          exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          fileExtension = '.docx';
          break;
        case 'application/vnd.google-apps.presentation':
          exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          fileExtension = '.pptx';
          break;
        case 'application/vnd.google-apps.drawing':
          exportMimeType = 'image/png';
          fileExtension = '.png';
          break;
        default:
          exportMimeType = 'application/pdf';
          fileExtension = '.pdf';
      }

      const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${exportMimeType}`;

      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export 실패: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name + fileExtension;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 메모리 정리
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('구글 문서 다운로드 오류:', error);
      throw error;
    }
  }

  // 일반 파일 다운로드
  async function downloadRegularFile(file) {
    try {
      const accessToken = authService.current?.getAccessToken();
      if (!accessToken) {
        throw new Error('인증 토큰이 없습니다.');
      }

      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`다운로드 실패: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 메모리 정리
      window.URL.revokeObjectURL(objectUrl);

    } catch (error) {
      console.error('일반 파일 다운로드 오류:', error);
      throw error;
    }
  }

  // 뷰 모드 변경 시 파일 목록 다시 로드
  useEffect(() => {
    if (isDriveInitialized) {
      loadDriveFiles();
    }
  }, [driveViewMode, portfolioFolderId]);

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

  // 드라이브 섹션이 활성화될 때 포트폴리오 폴더 ID 설정
  useEffect(() => {
    if (activeSection === 'drive' && isDriveInitialized && !portfolioFolderId) {
      setPortfolioFolder();
    }
  }, [activeSection, isDriveInitialized, portfolioFolderId]);

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
        closeImageModal();
      }
    };

    if (showImageModal) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showImageModal]);

  // OAuth 권한 부여는 GSI에서 처리되므로 제거됨

  // 실제 화면 렌더링
  return (
      <div>
        {/* 로그인 페이지 */}
        {!isLoggedIn && (
            <div id="loginPage" className="vh-100" style={{ backgroundColor: 'lightblue' }}>
              <div className="row h-100 g-0">
                <div className="col-8 intro-section">
                  <div className="d-flex flex-column justify-content-center h-100 p-5">
                    <h1 className="display-1 fw-bold mb-2">Portra</h1>
                    <h2 className="h3 mb-4 text-white-50">포트폴리오 메이커</h2>
                    <div className="features">
                      <div className="feature-item mb-3">
                        <i className="fas fa-check-circle me-2"></i>
                        간편한 이력 관리
                      </div>
                      <div className="feature-item mb-3">
                        <i className="fas fa-check-circle me-2"></i>
                        전문적인 PPT 템플릿
                      </div>
                      <div className="feature-item mb-3">
                        <i className="fas fa-check-circle me-2"></i>
                        구글 드라이브 연동
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-4 login-section">
                  <div className="d-flex flex-column justify-content-center align-items-center h-100">
                    <div className="login-box text-center">
                      <h2 className="mb-4">시작하기</h2>
                      <div id="googleSignInDiv"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* 메인 페이지 */}
        {isLoggedIn && (
            <div id="mainPage">
              <div className="mac-titlebar">
                <div className="mac-title">Portra</div>
              </div>
              <div className="mac-container">
                <div className="mac-sidebar">
                  {SECTION_LIST.map(section => (
                      <div
                          key={section}
                          className={`sidebar-item${activeSection === section ? ' active' : ''}${section === 'myPage' ? '' : ''}`}
                          onClick={() => showSection(section)}
                      >
                        {section === 'main' && (<><i className="fas fa-home"></i> <span>메인페이지</span></>)}
                        {section === 'drive' && (<><i className="fab fa-google-drive"></i> <span>구글 드라이브</span></>)}
                        {section === 'portal' && (<><i className="fas fa-university"></i> <span>학교 포털</span></>)}
                        {section === 'pptMaker' && (<><i className="fas fa-file-powerpoint"></i> <span>PPT 제작</span></>)}
                        {section === 'myPage' && (<><i className="fas fa-user"></i> <span>마이페이지</span></>)}
                      </div>
                  ))}
                  <div className="sidebar-item mt-auto" onClick={logout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>로그아웃</span>
                  </div>
                </div>
                <div className="mac-content">
                  {/* 메인 섹션 */}
                  {activeSection === 'main' && (
                      <div id="mainSection" className="content-section">
                        {/* 통합 인증 상태 */}
                        <div className="auth-status mb-4">
                          <div className={`status-indicator ${authStatus === 'connected' ? 'connected' : authStatus === 'error' ? 'error' : 'disconnected'}`}>
                            <i className={`fas ${authStatus === 'connected' ? 'fa-check-circle' : authStatus === 'error' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}`}></i>
                            {/*<span>*/}
                            {/*  {authStatus === 'connected' ? '구글 서비스 연동됨' : */}
                            {/*   authStatus === 'error' ? '구글 서비스 연동 오류' : */}
                            {/*   '구글 서비스 연동 중...'}*/}
                            {/*</span>*/}
                          </div>
                          {/*{spreadsheetId && (*/}
                          {/*  <div className="spreadsheet-info">*/}
                          {/*    <small>스프레드시트 ID: {spreadsheetId}</small>*/}
                          {/*    <br />*/}
                          {/*    <small>총 이력 수: {experiences.length}개</small>*/}
                          {/*  </div>*/}
                          {/*)}*/}
                          {/*{authStatus === 'disconnected' && (*/}
                          {/*  <div className="auth-help">*/}
                          {/*    <small className="text-muted">*/}
                          {/*      구글 서비스 연동이 필요합니다. 구글 계정으로 로그인해주세요.*/}
                          {/*    </small>*/}
                          {/*  </div>*/}
                          {/*)}*/}
                        </div>

                        <div className="mac-grid">
                          <div className="mac-card" onClick={showAddExperienceModal}>
                            <i className="fas fa-plus-circle"></i>
                            <h3>이력 등록</h3>
                            <p>새로운 경험을 추가하세요</p>
                          </div>
                          <div className="mac-card" onClick={() => showSection('pptMaker')}>
                            <i className="fas fa-file-powerpoint"></i>
                            <h3>PPT 제작</h3>
                            <p>포트폴리오 만들기</p>
                          </div>
                        </div>
                      </div>
                  )}
                  {/* PPT 제작 섹션 */}
                  {activeSection === 'pptMaker' && (
                      <div id="pptMakerSection" className="content-section">
                        <div className="mac-window">
                          <h2>포트폴리오 내용 선택</h2>
                          <div className="mac-window-content">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div>
                                <button className="btn btn-outline-dark me-2" onClick={() => selectAllExperiences(true)} disabled={isExperienceLoading}>전체 선택</button>
                                <button className="btn btn-outline-dark me-2" onClick={() => selectAllExperiences(false)} disabled={isExperienceLoading}>전체 해제</button>
                                <button className="btn btn-outline-danger" onClick={deleteSelectedExperiences} disabled={selected.length === 0 || isExperienceLoading}>
                                  {isExperienceLoading ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        삭제 중...
                                      </>
                                  ) : (
                                      '선택 삭제'
                                  )}
                                </button>
                              </div>
                              <div>
                                <button className="btn btn-outline-primary me-2" onClick={refreshSheetsData} disabled={isExperienceLoading}>
                                  {isExperienceLoading ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        새로고침 중...
                                      </>
                                  ) : (
                                      <>
                                        <i className="fas fa-sync-alt"></i> 시트 새로고침
                                      </>
                                  )}
                                </button>
                                <button
                                    className="btn btn-dark"
                                    id="nextButton"
                                    disabled={selected.length === 0 || isExperienceLoading}
                                    onClick={() => {
                                      const picked = selected
                                          .sort((a,b)=>a-b)
                                          .map(i => experiences[i]);
                                      setSelectedExperiences(picked);
                                      setActiveSection('templateSelection'); // 템플릿 선택 탭으로 전환
                                    }}
                                >
                                  다음
                                </button>
                              </div>
                            </div>
                            <div id="experienceList" className="mac-list">
                              {experiences.length === 0 ? (
                                  <div className="empty-state">
                                    <i className="fas fa-clipboard-list fa-3x mb-3"></i>
                                    <p>등록된 이력이 없습니다.</p>
                                    <button className="btn btn-outline-primary" onClick={refreshSheetsData}>
                                      <i className="fas fa-sync-alt"></i> 구글 시트에서 불러오기
                                    </button>
                                  </div>
                              ) : (
                                  experiences.map((exp, idx) => (
                                      <div className="list-group-item" key={idx} style={{ cursor: 'pointer' }} onClick={() => openExperienceModal(exp)}>
                                        <div className="d-flex align-items-center">
                                          <div className="me-3" style={{ width: '60px', height: '60px', flexShrink: 0 }}>
                                            {(exp.imageUrls && exp.imageUrls.length > 0) ? (
                                                <div
                                                    style={{
                                                      width: '60px',
                                                      height: '60px',
                                                      overflow: 'hidden',
                                                      borderRadius: '4px',
                                                      cursor: 'pointer',
                                                      border: '2px solid transparent',
                                                      transition: 'border-color 0.2s',
                                                      position: 'relative'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                                    onClick={() => openImageModal(exp.imageUrls[0], `${exp.title} - 이미지 1`)}
                                                >
                                                  {imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'loading' && (
                                                    <div style={{
                                                      position: 'absolute',
                                                      top: '50%',
                                                      left: '50%',
                                                      transform: 'translate(-50%, -50%)',
                                                      color: '#007bff',
                                                      fontSize: '12px'
                                                    }}>
                                                      <i className="fas fa-spinner fa-spin"></i>
                                                    </div>
                                                  )}
                                                  {imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'error' && (
                                                    <div style={{
                                                      position: 'absolute',
                                                      top: '50%',
                                                      left: '50%',
                                                      transform: 'translate(-50%, -50%)',
                                                      color: '#dc3545',
                                                      fontSize: '12px'
                                                    }}>
                                                      <i className="fas fa-exclamation-triangle"></i>
                                                    </div>
                                                  )}
                                                  <img
                                                      src={exp.imageUrls[0]}
                                                      alt={`${exp.title} 이미지 1`}
                                                      loading="lazy"
                                                      decoding="async"
                                                      style={{ 
                                                        width: '100%', 
                                                        height: '100%', 
                                                        objectFit: 'cover',
                                                        opacity: imageLoadingStates.get(`${exp.imageUrls[0]}_${exp.title} 이미지 1`) === 'loading' ? 0.5 : 1
                                                      }}
                                                      onLoad={() => setImageLoadingState(`${exp.imageUrls[0]}_${exp.title} 이미지 1`, false)}
                                                      onError={async (e) => {
                                                        // 이미 변환 시도 중인지 확인 (무한 재귀 방지)
                                                        if (e.target.dataset.converting === 'true') {
                                                          return;
                                                        }
                                                        
                                                        try {
                                                          e.target.dataset.converting = 'true';
                                                          console.log('이미지 로딩 실패, 재시도 시작:', exp.imageUrls[0]);
                                                          await retryImageLoad(e.target, exp.imageUrls[0]);
                                                        } catch (error) {
                                                          console.error('이미지 로딩 재시도 실패:', error);
                                                          e.target.style.display = 'none';
                                                        } finally {
                                                          e.target.dataset.converting = 'false';
                                                        }
                                                      }}
                                                  />
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                      width: '60px',
                                                      height: '60px',
                                                      backgroundColor: '#f8f9fa',
                                                      border: '2px dashed #dee2e6',
                                                      borderRadius: '4px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      color: 'white'
                                                    }}
                                                    title="이미지 없음"
                                                >
                                                  <i className="fas fa-image" style={{ fontSize: '1.5rem' }}></i>
                                                </div>
                                            )}
                                          </div>
                                          <div className="flex-grow-1">
                                            <h6 className="mb-1">{exp.title}</h6>
                                            <p className="mb-1"><small>{exp.period}</small></p>
                                            <p className="mb-0">{exp.description}</p>
                                          </div>
                                          <div className="form-check ms-3" onClick={(e) => e.stopPropagation()}>
                                            <input className="form-check-input" type="checkbox" checked={selected.includes(idx)} onChange={() => toggleSelect(idx)} />
                                          </div>
                                        </div>
                                      </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  )}

                  {/* 템플릿 선택 섹션 */}
                  {activeSection === 'templateSelection' && (
                      <div id="templateSelection" className="mac-content">
                        <h2>{isPptCreating ? '포트폴리오 생성중입니다' : '템플릿을 선택하세요'}</h2>
                        {isPptCreating ? (
                          <div className="text-center p-5">
                            <div className="spinner-border text-primary mb-3" role="status" style={{width: '3rem', height: '3rem'}}>
                              <span className="visually-hidden">로딩중...</span>
                            </div>
                            <p className="text-muted">잠시만 기다려주세요. 이력과 이미지를 슬라이드에 추가하고 있습니다.</p>
                          </div>
                        ) : (
                          <div className="template-grid">
                            <div className="mac-card" onClick={() => openTemplateModal('basic')}>
                              <h3>기본 템플릿</h3>
                              <p>깔끔하고 전문적인 레이아웃</p>
                            </div>
                            <div className="mac-card" onClick={() => openTemplateModal('timeline')}>
                              <h3>타임라인 템플릿</h3>
                              <p>시간 흐름에 따른 구성</p>
                            </div>
                            <div className="mac-card" onClick={() => openTemplateModal('grid')}>
                              <h3>그리드 템플릿</h3>
                              <p>균형 잡힌 구성</p>
                            </div>
                          </div>
                        )}
                      </div>
                  )}

                  {/* PPT 편집기 섹션 */}
                  <div className="App">
                    {activeSection === 'editor' && (
                        <div className="content-section">
                          <div className="ppt-editor">
                            <div className="editor-toolbar">
                              <button onClick={() => window.open(`https://docs.google.com/presentation/d/${presentationId}/edit`, '_blank')}>Google Slides에서 열기</button>
                            </div>


                            <div className="editor-canvas">
                              {slides.map((slide, sIdx) => (
                                  <div key={slide.objectId || sIdx} className="editor-slide">
                                    <div className="slide-header">슬라이드 {sIdx + 1}</div>
                                    <div className="slide-body">
                                      {slide.pageElements?.map((el) => {
                                        const elText = getTextFromElement(el);
                                        const elId = el.objectId;


                                        return (
                                            <div key={elId} className="text-box">
                                              <input
                                                  type="text"
                                                  className="text-input"
                                                  value={elText}
                                                  onChange={e => {
                                                    setSlides(prev => prev.map(sl => {
                                                      if (sl.objectId !== slide.objectId) return sl;
                                                      return {
                                                        ...sl,
                                                        pageElements: sl.pageElements.map(pe => {
                                                          if (pe.objectId !== elId) return pe;
                                                          const newShape = {
                                                            ...pe.shape,
                                                            text: {
                                                              ...pe.shape?.text,
                                                              textElements: [{ textRun: { content: e.target.value } }]
                                                            }
                                                          };
                                                          return { ...pe, shape: newShape };
                                                        })
                                                      };
                                                    }));
                                                  }}
                                                  onBlur={async e => {
                                                    try {
                                                      await updateElementTextAndLocal(presentationId, elId, e.target.value, accessToken);
                                                    } catch (err) {
                                                      console.error('슬라이드 텍스트 업데이트 실패', err);
                                                      alert('텍스트 업데이트 실패: ' + (err.message || err));
                                                    }
                                                  }}
                                              />

                                              <div className="text-controls">
                                                <select
                                                    onChange={async (ev) => {
                                                      const fontFamily = ev.target.value;
                                                      if (!fontFamily) return;
                                                      try {
                                                        await updateElementStyle(presentationId, elId, { fontFamily }, accessToken);
                                                      } catch (err) {
                                                        console.error(err);
                                                        alert('글꼴 변경 실패');
                                                      }
                                                    }}
                                                >
                                                  <option value="">글꼴</option>
                                                  <option value="Arial">Arial</option>
                                                  <option value="Noto Sans KR">Noto Sans KR</option>
                                                  <option value="Roboto">Roboto</option>
                                                  <option value="Times New Roman">Times New Roman</option>
                                                </select>


                                                <input
                                                    type="number"
                                                    placeholder="크기(pt)"
                                                    onBlur={async (ev) => {
                                                      const size = Number(ev.target.value);
                                                      if (!size || size <= 0) return;
                                                      try {
                                                        await updateElementStyle(presentationId, elId, { fontSize: { magnitude: size, unit: 'PT' } }, accessToken);
                                                      } catch (err) {
                                                        console.error(err);
                                                        alert('글자 크기 변경 실패');
                                                      }
                                                    }}
                                                />
                                                <input
                                                    type="color"
                                                    onChange={async (ev) => {
                                                      const hex = ev.target.value;
                                                      const r = parseInt(hex.slice(1, 3), 16) / 255;
                                                      const g = parseInt(hex.slice(3, 5), 16) / 255;
                                                      const b = parseInt(hex.slice(5, 7), 16) / 255;
                                                      const colorObj = { foregroundColor: { opaqueColor: { rgbColor: { red: r, green: g, blue: b } } } };
                                                      try {
                                                        await updateElementStyle(presentationId, elId, colorObj, accessToken);
                                                      } catch (err) {
                                                        console.error(err);
                                                        alert('글자 색상 변경 실패');
                                                      }
                                                    }}
                                                />
                                              </div>
                                            </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                              ))}
                            </div>
                          </div>
                        </div>
                    )}
                  </div>



                  {/* 구글 드라이브 섹션 */}
                  {activeSection === 'drive' && (
                      <div id="driveSection" className="content-section">
                        <div className="mac-window">
                          <h2>구글 드라이브</h2>
                          <div className="mac-window-content">
                            {/* 드라이브 연동 상태 - 연동 실패 시에만 표시 */}
                            {!isDriveInitialized && (
                              <div className="drive-status mb-4">
                                <div className="status-indicator disconnected">
                                  <i className="fas fa-exclamation-circle"></i>
                                  <span>구글 드라이브가 연동되지 않음</span>
                                </div>
                                <div className="drive-help">
                                  <small style={{ color: 'white' }}>
                                    구글 드라이브 연동이 필요합니다. 구글 계정으로 로그인해주세요.
                                  </small>
                                </div>
                              </div>
                            )}

                            {/* 시트 관리 버튼 */}
                            {isDriveInitialized && (
                                <div className="sheet-management">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4>포트폴리오 시트 관리</h4>
                                    <div>
                                      {spreadsheetId ? (
                                          <button
                                              className="btn btn-outline-danger btn-sm"
                                              onClick={deleteSheet}
                                              disabled={isSheetLoading}
                                          >
                                            {isSheetLoading ? (
                                                <>
                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                  삭제 중...
                                                </>
                                            ) : (
                                                <>
                                                  <i className="fas fa-trash-alt"></i> 시트 삭제
                                                </>
                                            )}
                                          </button>
                                      ) : (
                                          <button
                                              className="btn btn-outline-success btn-sm"
                                              onClick={createSheet}
                                              disabled={isSheetLoading}
                                          >
                                            {isSheetLoading ? (
                                                <>
                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                  생성 중...
                                                </>
                                            ) : (
                                                <>
                                                  <i className="fas fa-plus"></i> 시트 생성
                                                </>
                                            )}
                                          </button>
                                      )}
                                    </div>
                                  </div>
                                  {!spreadsheetId && (
                                      <div className="alert alert-info" role="alert">
                                        <i className="fas fa-info-circle me-2"></i>
                                        시트파일이 없습니다. 새로 생성해주세요.
                                      </div>
                                  )}
                                </div>
                            )}

                            {/* 뷰 모드 선택 */}
                            {isDriveInitialized && (
                                <div className="view-mode-selector">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h4>파일 보기</h4>
                                    <div className="btn-group" role="group">
                                      <button
                                          type="button"
                                          className={`btn btn-sm ${driveViewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                                          onClick={() => switchViewMode('all')}
                                          disabled={isViewModeLoading}
                                      >
                                        <i className="fas fa-globe"></i> 전체 파일
                                      </button>
                                      <button
                                          type="button"
                                          className={`btn btn-sm ${driveViewMode === 'portfolio' ? 'btn-primary' : 'btn-outline-primary'}`}
                                          onClick={() => switchViewMode('portfolio')}
                                          disabled={!portfolioFolderId || isViewModeLoading}
                                          title={!portfolioFolderId ? '포트폴리오 폴더가 없습니다. 시트를 먼저 생성해주세요.' : '포트폴리오 폴더 보기'}
                                      >
                                        {!portfolioFolderId ? (
                                            <>
                                              <i className="fas fa-folder-plus"></i> 포트폴리오 폴더
                                            </>
                                        ) : (
                                            <>
                                              <i className="fas fa-folder"></i> 포트폴리오 폴더
                                            </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                            )}

                            {/* 구분선 */}
                            {isDriveInitialized && (
                                <hr style={{ border: 'none', height: '2px', background: 'linear-gradient(to right, #007bff, #6c757d, #007bff)', margin: '20px 0' }} />
                            )}

                            {/* 파일 목록 */}
                            {isDriveInitialized && (
                                <div className="drive-files">
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="d-flex align-items-center">
                                      {currentPath.length > 0 && (
                                          <button
                                              className="btn btn-outline-secondary btn-sm me-3"
                                              onClick={goBack}
                                              disabled={isViewModeLoading}
                                          >
                                            <i className="fas fa-arrow-left"></i> 뒤로가기
                                          </button>
                                      )}
                                      <h4>
                                        {currentPath.length > 0 ? currentPath[currentPath.length - 1].name :
                                            driveViewMode === 'all' ? '전체 파일' : '포트폴리오 폴더 내용'}
                                        {driveViewMode === 'portfolio' && portfolioFolderId && currentPath.length === 0 && (
                                            <small className="ms-2" style={{ color: 'white' }}>(포트폴리오 이력 폴더)</small>
                                        )}
                                      </h4>
                                    </div>
                                    <div>
                                      <label htmlFor="drive-upload-input" className={`btn btn-outline-success btn-sm me-2 ${isUploadLoading ? 'disabled' : ''}`} style={{ pointerEvents: isUploadLoading ? 'none' : 'auto' }}>
                                        {isUploadLoading ? (
                                            <>
                                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                              업로드 중...
                                            </>
                                        ) : (
                                            <>
                                              <i className="fas fa-upload"></i> 업로드
                                            </>
                                        )}
                                      </label>
                                      <input
                                          id="drive-upload-input"
                                          type="file"
                                          style={{ display: 'none' }}
                                          onChange={handleDriveFileUpload}
                                      />
                                      <button className="btn btn-outline-primary btn-sm" onClick={handleDriveRefresh} disabled={isRefreshLoading}>
                                        {isRefreshLoading ? (
                                            <>
                                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                              새로고침 중...
                                            </>
                                        ) : (
                                            <>
                                              <i className="fas fa-sync-alt"></i> 새로고침
                                            </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="file-list">
                                    {isDriveLoading ? (
                                        <div className="text-center p-4">
                                          <div className="spinner-border text-primary" role="status">
                                            <span className="visually-hidden">로딩중...</span>
                                          </div>
                                          <p className="mt-2" style={{ color: 'white' }}>파일 목록을 불러오는 중...</p>
                                        </div>
                                    ) : driveFiles.length === 0 ? (
                                        <div className="empty-state">
                                          <i className="fas fa-folder-open fa-3x mb-3"></i>
                                          <p>
                                            {driveViewMode === 'portfolio' ? '포트폴리오 폴더가 비어있습니다.' : '파일이 없습니다.'}
                                          </p>
                                        </div>
                                    ) : (
                                        <>
                                          {/* 폴더들 먼저 표시 */}
                                          {driveFiles
                                              .filter(file => file.mimeType === 'application/vnd.google-apps.folder')
                                              .map((file, index, array) => (
                                                  <div key={file.id}>
                                                    <div className="file-item list-group-item folder-item" style={{ cursor: 'pointer' }} onClick={() => enterFolder(file.id, file.name)}>
                                                      <div className="d-flex align-items-center">
                                                        <i className="fas fa-folder me-3" style={{ color: '#ffc107' }}></i>
                                                        <div className="flex-grow-1">
                                                          <h6 className="mb-1 folder-name">
                                                            {file.name}
                                                          </h6>
                                                          <small style={{ color: 'white' }}>
                                                            폴더 • {new Date(file.createdTime).toLocaleDateString()}
                                                          </small>
                                                        </div>
                                                        <div className="file-actions d-flex align-items-center">
                                                          <button
                                                              className="btn btn-sm btn-outline-danger"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDriveFileDelete(file.id);
                                                              }}
                                                              disabled={isDeleteLoading}
                                                          >
                                                            {isDeleteLoading ? (
                                                                <>
                                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                  삭제 중...
                                                                </>
                                                            ) : (
                                                                <>
                                                                  <i className="fas fa-trash-alt"></i> 삭제
                                                                </>
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    {/* 폴더들 사이 구분선 */}
                                                    {index < array.length - 1 && (
                                                        <hr style={{
                                                          border: 'none',
                                                          height: '1px',
                                                          background: 'linear-gradient(to right, transparent, #ffc107, transparent)',
                                                          margin: '8px 0'
                                                        }} />
                                                    )}
                                                  </div>
                                              ))}

                                          {/* 폴더와 파일 사이 구분선 */}
                                          {driveFiles.filter(file => file.mimeType === 'application/vnd.google-apps.folder').length > 0 &&
                                              driveFiles.filter(file => file.mimeType !== 'application/vnd.google-apps.folder').length > 0 && (
                                                  <hr style={{ border: 'none', height: '1px', background: '#e9ecef', margin: '15px 0' }} />
                                              )}

                                          {/* 파일들 표시 */}
                                          {driveFiles
                                              .filter(file => file.mimeType !== 'application/vnd.google-apps.folder')
                                              .map((file, index, array) => (
                                                  <div key={file.id}>
                                                    <div className="file-item list-group-item">
                                                      <div className="d-flex align-items-center">
                                                        <i className={`fas ${
                                                            file.mimeType === 'application/vnd.google-apps.spreadsheet' ? 'fa-file-excel' :
                                                                file.mimeType === 'application/vnd.google-apps.document' ? 'fa-file-word' :
                                                                    file.mimeType === 'application/vnd.google-apps.presentation' ? 'fa-file-powerpoint' :
                                                                        file.mimeType.startsWith('image/') ? 'fa-file-image' :
                                                                            'fa-file'
                                                        } me-3`} style={{
                                                          color: file.mimeType === 'application/vnd.google-apps.spreadsheet' ? '#28a745' :
                                                              file.mimeType === 'application/vnd.google-apps.document' ? '#007bff' :
                                                                  file.mimeType === 'application/vnd.google-apps.presentation' ? '#dc3545' :
                                                                      file.mimeType.startsWith('image/') ? '#6f42c1' : 'white'
                                                        }}></i>
                                                        <div className="flex-grow-1">
                                                          <h6
                                                              className="mb-1 file-name"
                                                              style={{ cursor: 'pointer', color: '#0d6efd' }}
                                                              onClick={() => downloadFile(file)}
                                                          >
                                                            {file.name}
                                                          </h6>
                                                          <small style={{ color: 'white' }}>
                                                            {file.mimeType === 'application/vnd.google-apps.spreadsheet' ? '스프레드시트' :
                                                                file.mimeType === 'application/vnd.google-apps.document' ? '문서' :
                                                                    file.mimeType === 'application/vnd.google-apps.presentation' ? '프레젠테이션' :
                                                                        file.mimeType.startsWith('image/') ? '이미지' : '파일'} •
                                                            {new Date(file.createdTime).toLocaleDateString()}
                                                          </small>
                                                        </div>
                                                        <div className="file-actions d-flex align-items-center">
                                                          <button
                                                              className="btn btn-sm btn-outline-danger"
                                                              onClick={() => handleDriveFileDelete(file.id)}
                                                              disabled={deletingFileIds.has(file.id)}
                                                          >
                                                            {deletingFileIds.has(file.id) ? (
                                                                <>
                                                                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                  삭제 중...
                                                                </>
                                                            ) : (
                                                                <>
                                                                  <i className="fas fa-trash-alt"></i> 삭제
                                                                </>
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    {/* 파일들 사이 구분선 */}
                                                    {index < array.length - 1 && (
                                                        <hr style={{
                                                          border: 'none',
                                                          height: '1px',
                                                          background: 'linear-gradient(to right, transparent, #dee2e6, transparent)',
                                                          margin: '8px 0'
                                                        }} />
                                                    )}
                                                  </div>
                                              ))}
                                        </>
                                    )}
                                  </div>
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                  )}
                  {/* 학교 포털 섹션 */}
                  {activeSection === 'portal' && (
                      <div id="portalSection" className="content-section">
                        <div className="mac-window">
                          <h2>학교 포털</h2>
                          <div className="mac-window-content text-center p-5">
                            <i className="fas fa-university fa-3x mb-3 text-primary"></i>
                            <h3 className="mb-3">학교 포털로 이동</h3>
                            <p className="mb-4">학교 포털에서 학사 정보를 확인하세요.</p>
                            <a href="#" className="btn btn-primary">학교 포털 열기</a>
                          </div>
                        </div>
                      </div>
                  )}
                  {/* 마이페이지 섹션 */}
                  {activeSection === 'myPage' && (
                      <div id="myPageSection" className="content-section">
                        <div className="mac-grid">
                          <div className="mac-window">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h2>PPT 기록</h2>
                              <button className="btn btn-outline-primary btn-sm" onClick={loadPptHistory}>
                                <i className="fas fa-sync-alt"></i> 새로고침
                              </button>
                            </div>
                            <div id="pptHistory" className="mac-list">
                              {isLoading ? (
                                <div className="text-center p-4">
                                  <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">로딩중...</span>
                                  </div>
                                  <p className="mt-2">PPT 기록을 불러오는 중...</p>
                                </div>
                              ) : pptHistory.length === 0 ? (
                                <div className="empty-state">
                                  <i className="fas fa-history fa-3x mb-3"></i>
                                  <p>아직 제작한 PPT가 없습니다.</p>
                                </div>
                              ) : (
                                pptHistory.map((ppt, index) => (
                                    <div
                                        key={ppt.id}
                                        className="list-group-item mac-list-item d-flex align-items-center"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() =>  window.open(`https://docs.google.com/presentation/d/${ppt.id}/edit`, '_blank')}   // 리스트 클릭 시 열기
                                    >
                                      <div className="me-3">
                                        <i className="fas fa-file-powerpoint text-primary fa-2x"></i>
                                      </div>
                                      <div className="flex-grow-1">
                                        <h6 className="mb-1 text-white">{ppt.name}</h6>
                                        <small className="text-white-50">
                                          생성일: {new Date(ppt.createdTime).toLocaleDateString()}
                                        </small>
                                      </div>
                                      <div className="d-flex align-items-center gap-2">
                                        {/* 수정 버튼 */}
                                        <button
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveSection('editor');
                                              setPresentationId(ppt.id);
                                            }}
                                        >
                                          <i className="fas fa-edit"></i> 수정
                                        </button>

                                        {/* 삭제 버튼 */}
                                        <button
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (window.confirm(`"${ppt.name}" 파일을 삭제하시겠습니까?`)) {
                                                handleDriveFileDelete(ppt.id);
                                              }
                                            }}
                                        >
                                          <i className="fas fa-trash-alt"></i> 삭제
                                        </button>
                                      </div>
                                    </div>
                                ))
                              )}
                            </div>
                          </div>
                          <div className="mac-window">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h2>이력 관리</h2>
                              <button className="btn btn-outline-primary btn-sm" onClick={refreshSheetsData} disabled={isExperienceLoading}>
                                {isExperienceLoading ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    새로고침 중...
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-sync-alt"></i> 시트 새로고침
                                  </>
                                )}
                              </button>
                            </div>
                            <div id="experienceManagement" className="mac-list">
                              {isExperienceLoading ? (
                                <div className="text-center p-4">
                                  <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">로딩중...</span>
                                  </div>
                                  <p className="mt-2">이력 목록을 불러오는 중...</p>
                                </div>
                              ) : experiences.length === 0 ? (
                                  <div className="empty-state">
                                    <i className="fas fa-clipboard-list fa-3x mb-3"></i>
                                    <p>등록된 이력이 없습니다.</p>
                                    <button className="btn btn-outline-primary" onClick={refreshSheetsData}>
                                      <i className="fas fa-sync-alt"></i> 구글 시트에서 불러오기
                                    </button>
                                  </div>
                              ) : (
                                  experiences.map((exp, idx) => (
                                      <div className="list-group-item" key={idx} style={{ cursor: 'pointer' }} onClick={() => openExperienceModal(exp)}>
                                        <div className="d-flex align-items-center">
                                          <div className="me-3 d-flex flex-column" style={{ gap: '5px' }}>
                                            {(exp.imageUrls && exp.imageUrls.length > 0) ? (
                                                <>
                                                  {exp.imageUrls.slice(0, 3).map((imageUrl, imgIdx) => (
                                                      <div
                                                          key={imgIdx}
                                                          style={{
                                                            width: '50px',
                                                            height: '50px',
                                                            overflow: 'hidden',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            border: '2px solid transparent',
                                                            transition: 'border-color 0.2s',
                                                            position: 'relative'
                                                          }}
                                                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            openImageModal(imageUrl, `${exp.title} - 이미지 ${imgIdx + 1}`);
                                                          }}
                                                      >
                                                        {imageLoadingStates.get(`${imageUrl}_${exp.title} 이미지 ${imgIdx + 1}`) === 'loading' && (
                                                          <div style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            color: '#007bff',
                                                            fontSize: '10px'
                                                          }}>
                                                            <i className="fas fa-spinner fa-spin"></i>
                                                          </div>
                                                        )}
                                                        {imageLoadingStates.get(`${imageUrl}_${exp.title} 이미지 ${imgIdx + 1}`) === 'error' && (
                                                          <div style={{
                                                            position: 'absolute',
                                                            top: '50%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            color: '#dc3545',
                                                            fontSize: '10px'
                                                          }}>
                                                            <i className="fas fa-exclamation-triangle"></i>
                                                          </div>
                                                        )}
                                                        <img
                                                            src={imageUrl}
                                                            alt={`${exp.title} 이미지 ${imgIdx + 1}`}
                                                            loading="lazy"
                                                            decoding="async"
                                                            style={{ 
                                                              width: '100%', 
                                                              height: '100%', 
                                                              objectFit: 'cover',
                                                              opacity: imageLoadingStates.get(`${imageUrl}_${exp.title} 이미지 ${imgIdx + 1}`) === 'loading' ? 0.5 : 1
                                                            }}
                                                            onLoad={() => setImageLoadingState(`${imageUrl}_${exp.title} 이미지 ${imgIdx + 1}`, false)}
                                                            onError={async (e) => {
                                                              // 이미 변환 시도 중인지 확인 (무한 재귀 방지)
                                                              if (e.target.dataset.converting === 'true') {
                                                                return;
                                                              }
                                                              
                                                              try {
                                                                e.target.dataset.converting = 'true';
                                                                console.log('이미지 로딩 실패, 재시도 시작:', imageUrl);
                                                                await retryImageLoad(e.target, imageUrl);
                                                              } catch (error) {
                                                                console.error('이미지 로딩 재시도 실패:', error);
                                                                e.target.style.display = 'none';
                                                              } finally {
                                                                e.target.dataset.converting = 'false';
                                                              }
                                                            }}
                                                        />
                                                      </div>
                                                  ))}
                                                  {exp.imageUrls.length > 3 && (
                                                      <div className="text-center" style={{ fontSize: '0.8rem', color: 'white' }}>
                                                        +{exp.imageUrls.length - 3}
                                                      </div>
                                                  )}
                                                </>
                                            ) : (
                                                <div
                                                    style={{
                                                      width: '50px',
                                                      height: '50px',
                                                      backgroundColor: '#f8f9fa',
                                                      border: '2px dashed #dee2e6',
                                                      borderRadius: '4px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'center',
                                                      color: 'white'
                                                    }}
                                                    title="이미지 없음"
                                                >
                                                  <i className="fas fa-image" style={{ fontSize: '1.2rem' }}></i>
                                                </div>
                                            )}
                                          </div>
                                          <div className="flex-grow-1">
                                            <h6 className="mb-1">{exp.title}</h6>
                                            <p className="mb-1"><small>{exp.period}</small></p>
                                            <p className="mb-0">{exp.description}</p>
                                          </div>
                                          <div className="d-flex align-items-center gap-2">
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  showEditExperienceModal(idx);
                                                }}
                                                disabled={isExperienceLoading}
                                            >
                                              <i className="fas fa-edit"></i> 수정
                                            </button>
                                            <button
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  deleteIndividualExperience(idx);
                                                }}
                                                disabled={isExperienceLoading}
                                            >
                                              <i className="fas fa-trash-alt"></i> 삭제
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                  ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* 이력 추가 모달 */}
        {showModal && (
            <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content mac-modal">
                  <div className="modal-header">
                    <h5 className="modal-title">{editingIndex !== null ? '이력 수정' : '새 이력 추가'}</h5>
                    <button type="button" className="btn-close" onClick={closeModal}></button>
                  </div>
                  <form onSubmit={saveExperience} ref={formRef}>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label">제목</label>
                        <input type="text" className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">기간</label>
                        <div className="period-container">
                          <div className="row">
                            <div className="col-6">
                              <label className="form-label small" style={{ color: 'white' }}>시작일</label>
                              <input
                                  type="date"
                                  className="form-control"
                                  required
                                  value={form.startDate}
                                  onChange={e => {
                                    const newStartDate = e.target.value;
                                    setForm({ ...form, startDate: newStartDate });

                                    // 시작일이 종료일보다 늦으면 종료일 초기화
                                    if (newStartDate && form.endDate && newStartDate > form.endDate) {
                                      setForm(prev => ({ ...prev, endDate: '' }));
                                    }
                                  }}
                              />
                            </div>
                            <div className="col-6">
                              <label className="form-label small" style={{ color: 'white' }}>종료일</label>
                              <input
                                  type="date"
                                  className="form-control"
                                  required
                                  value={form.endDate}
                                  onChange={e => {
                                    const newEndDate = e.target.value;
                                    setForm({ ...form, endDate: newEndDate });

                                    // 종료일이 시작일보다 이르면 경고
                                    if (newEndDate && form.startDate && newEndDate < form.startDate) {
                                      alert('종료일은 시작일보다 이후여야 합니다.');
                                      setForm(prev => ({ ...prev, endDate: '' }));
                                    }
                                  }}
                              />
                            </div>
                          </div>
                          {form.startDate && form.endDate && (
                              <div className="period-preview">
                                <small style={{ color: 'white' }}>
                                  선택된 기간: {formatPeriod(form.startDate, form.endDate)}
                                </small>
                              </div>
                          )}
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">설명</label>
                        <textarea className="form-control" rows="3" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">이미지 첨부</label>
                        <div
                            className="image-upload-container"
                            onClick={() => document.getElementById('imageInput').click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = '#007bff';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = '#dee2e6';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.borderColor = '#dee2e6';
                              const files = Array.from(e.dataTransfer.files);
                              handleDroppedFiles(files);
                            }}
                        >
                          <input
                              type="file"
                              id="imageInput"
                              className="file-input"
                              accept="image/*"
                              multiple
                              onChange={handleImageSelect}
                              style={{ display: 'none' }}
                          />
                          <i className="fas fa-cloud-upload-alt image-upload-icon"></i>
                          <div className="image-upload-text">클릭하여 이미지 선택 (여러 개 가능)</div>
                          <div className="image-upload-subtext">또는 이미지를 여기로 드래그하세요</div>
                        </div>
                        {imagePreviews.length > 0 && (
                            <div className="image-previews-container mt-3">
                              <h6 className="mb-2">선택된 이미지들:</h6>
                              <div className="row">
                                {imagePreviews.map((preview, index) => (
                                    <div key={index} className="col-md-4 col-sm-6 mb-2">
                                      <div className="image-preview-item position-relative">
                                        <img
                                            src={preview}
                                            alt={`이미지 ${index + 1}`}
                                            className="img-fluid rounded"
                                            style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-1"
                                            onClick={() => removeImage(index)}
                                            style={{ zIndex: 10 }}
                                        />
                                      </div>
                                    </div>
                                ))}
                              </div>
                            </div>
                        )}
                        <div className="image-size-info mt-2">
                          <small style={{ color: 'white' }}>최대 파일 크기: 5MB, 지원 형식: JPG, PNG, GIF</small>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isExperienceLoading}>취소</button>
                      <button type="submit" className="btn btn-primary" disabled={isExperienceLoading}>
                        {isExperienceLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              {editingIndex !== null ? '수정 중...' : '저장 중...'}
                            </>
                        ) : (
                            editingIndex !== null ? '수정' : '저장'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}

        {/* 이미지 확대 모달 */}
        {showImageModal && selectedImageForModal && (
            <div
                className="modal fade show"
                style={{ display: 'block', background: 'rgba(0,0,0,0.8)', zIndex: 9999 }}
                tabIndex="-1"
                onClick={closeImageModal}
            >
              <div className="modal-dialog modal-dialog-centered modal-xl" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content bg-transparent border-0">
                  <div className="modal-header border-0 bg-transparent">
                    <h5 className="modal-title text-white">{selectedImageForModal.title}</h5>
                    <button type="button" className="btn-close btn-close-white" onClick={closeImageModal}></button>
                  </div>
                  <div className="modal-body text-center p-0" style={{ position: 'relative' }}>
                    {imageLoadingStates.get(`${selectedImageForModal.url}_${selectedImageForModal.title}`) === 'loading' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#007bff',
                        fontSize: '24px',
                        zIndex: 10
                      }}>
                        <i className="fas fa-spinner fa-spin"></i>
                        <div style={{ fontSize: '14px', marginTop: '10px' }}>이미지 로딩 중...</div>
                      </div>
                    )}
                    {imageLoadingStates.get(`${selectedImageForModal.url}_${selectedImageForModal.title}`) === 'error' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#dc3545',
                        fontSize: '24px',
                        zIndex: 10
                      }}>
                        <i className="fas fa-exclamation-triangle"></i>
                        <div style={{ fontSize: '14px', marginTop: '10px' }}>이미지를 불러올 수 없습니다</div>
                      </div>
                    )}
                    <img
                        src={selectedImageForModal.url}
                        alt={selectedImageForModal.title}
                        className="img-fluid"
                        loading="eager"
                        decoding="async"
                        style={{ 
                          maxHeight: '80vh', 
                          maxWidth: '100%',
                          opacity: imageLoadingStates.get(`${selectedImageForModal.url}_${selectedImageForModal.title}`) === 'loading' ? 0.5 : 1
                        }}
                        onLoad={() => setImageLoadingState(`${selectedImageForModal.url}_${selectedImageForModal.title}`, false)}
                        onError={async (e) => {
                          // 이미 변환 시도 중인지 확인 (무한 재귀 방지)
                          if (e.target.dataset.converting === 'true') {
                            return;
                          }
                          
                          try {
                            e.target.dataset.converting = 'true';
                            console.log('모달 이미지 로딩 실패, 재시도 시작:', selectedImageForModal.url);
                            await retryImageLoad(e.target, selectedImageForModal.url);
                          } catch (error) {
                            console.error('모달 이미지 로딩 재시도 실패:', error);
                            e.target.style.display = 'none';
                            alert('이미지를 불러올 수 없습니다.');
                          } finally {
                            e.target.dataset.converting = 'false';
                          }
                        }}
                    />
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* 이력 상세 모달 */}
        {showExperienceModal && selectedExperience && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content mac-modal">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-clipboard-list me-2"></i>
                    {selectedExperience.title}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeExperienceModal}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6 className="mb-3" style={{ color: 'white' }}>기본 정보</h6>
                      <div className="mb-3">
                        <strong style={{ color: 'white' }}>제목:</strong>
                        <p className="mt-1" style={{ color: 'white' }}>{selectedExperience.title}</p>
                      </div>
                      <div className="mb-3">
                        <strong style={{ color: 'white' }}>기간:</strong>
                        <p className="mt-1" style={{ color: 'white' }}>{selectedExperience.period}</p>
                      </div>
                      <div className="mb-3">
                        <strong style={{ color: 'white' }}>설명:</strong>
                        <p className="mt-1" style={{ whiteSpace: 'pre-wrap', color: 'white' }}>{selectedExperience.description}</p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6 className="mb-3" style={{ color: 'white' }}>첨부 이미지</h6>
                      {selectedExperience.imageUrls && selectedExperience.imageUrls.length > 0 ? (
                        <div className="experience-images">
                          <div className="row g-2">
                            {selectedExperience.imageUrls.map((imageUrl, imgIdx) => (
                              <div key={imgIdx} className="col-6">
                                <div
                                  className="image-thumbnail"
                                  style={{
                                    width: '100%',
                                    height: '150px',
                                    overflow: 'hidden',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    border: '2px solid transparent',
                                    transition: 'border-color 0.2s',
                                    position: 'relative'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                  onClick={() => openImageModal(imageUrl, `${selectedExperience.title} - 이미지 ${imgIdx + 1}`)}
                                >
                                  {imageLoadingStates.get(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`) === 'loading' && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      color: '#007bff',
                                      fontSize: '16px'
                                    }}>
                                      <i className="fas fa-spinner fa-spin"></i>
                                    </div>
                                  )}
                                  {imageLoadingStates.get(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`) === 'error' && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      color: '#dc3545',
                                      fontSize: '16px'
                                    }}>
                                      <i className="fas fa-exclamation-triangle"></i>
                                    </div>
                                  )}
                                  <img
                                    src={imageUrl}
                                    alt={`${selectedExperience.title} 이미지 ${imgIdx + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      objectFit: 'cover',
                                      opacity: imageLoadingStates.get(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`) === 'loading' ? 0.5 : 1
                                    }}
                                    onLoad={() => setImageLoadingState(`${imageUrl}_${selectedExperience.title} 이미지 ${imgIdx + 1}`, false)}
                                    onError={async (e) => {
                                      if (e.target.dataset.converting === 'true') {
                                        return;
                                      }
                                      
                                      try {
                                        e.target.dataset.converting = 'true';
                                        console.log('이력 모달 이미지 로딩 실패, 재시도 시작:', imageUrl);
                                        await retryImageLoad(e.target, imageUrl);
                                      } catch (error) {
                                        console.error('이력 모달 이미지 로딩 재시도 실패:', error);
                                        e.target.style.display = 'none';
                                      } finally {
                                        e.target.dataset.converting = 'false';
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-center">
                            <small style={{ color: 'white' }}>
                              총 {selectedExperience.imageUrls.length}개의 이미지
                            </small>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-4" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <i className="fas fa-image fa-3x mb-3" style={{ color: '#6c757d' }}></i>
                          <p className="mb-0" style={{ color: '#6c757d' }}>첨부된 이미지가 없습니다</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeExperienceModal}>
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 템플릿 선택 모달 */}
        {showTemplateModal && selectedTemplateForModal && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content mac-modal">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-file-powerpoint me-2"></i>
                    {templateDescriptions[selectedTemplateForModal]?.name}
                  </h5>
                  <button type="button" className="btn-close" onClick={handleTemplateCancel}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-12">
                      <h6 className="mb-3" style={{ color: 'white' }}>템플릿 설명</h6>
                      <p className="mb-4" style={{ whiteSpace: 'pre-wrap', color: 'white' }}>
                        {templateDescriptions[selectedTemplateForModal]?.description}
                      </p>
                      
                      {/* 템플릿 미리보기 이미지 */}
                      {templateDescriptions[selectedTemplateForModal]?.previewImages && 
                       templateDescriptions[selectedTemplateForModal].previewImages.length > 0 && (
                        <div className="mb-4">
                          <h6 className="mb-3" style={{ color: 'white' }}>템플릿 미리보기</h6>
                          <div className="template-preview-container">
                            <div className="row g-3">
                              {templateDescriptions[selectedTemplateForModal].previewImages.map((imagePath, index) => (
                                <div key={index} className="col-md-4">
                                  <div className="template-preview-item">
                                    <img 
                                      src={imagePath} 
                                      alt={`템플릿 미리보기 ${index + 1}`}
                                      className="img-fluid rounded"
                                      style={{
                                        width: '100%',
                                        height: '200px',
                                        objectFit: 'cover',
                                        border: '2px solid #007bff',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s ease'
                                      }}
                                      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                      onClick={() => {
                                        setSelectedImageForModal({
                                          url: imagePath,
                                          title: `템플릿 미리보기 ${index + 1}`
                                        });
                                        setShowImageModal(true);
                                      }}
                                    />
                                    <div className="text-center mt-2">
                                      <small style={{ color: '#ccc' }}>미리보기 {index + 1}</small>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <h6 className="mb-3" style={{ color: 'white' }}>주요 특징</h6>
                      <div className="template-features">
                        {templateDescriptions[selectedTemplateForModal]?.features.map((feature, index) => (
                          <div key={index} className="feature-item mb-2 d-flex align-items-center">
                            <i className="fas fa-check-circle text-success me-2"></i>
                            <span style={{ color: 'white' }}>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleTemplateCancel}>
                    취소
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleTemplateUse}>
                    템플릿 사용
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default App;
