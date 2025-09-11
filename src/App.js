import React, { useState, useRef, useEffect } from 'react';
import GoogleSheetsService from './services/googleSheetsService';
import GoogleDriveService from './services/googleDriveService';
import GoogleAuthService from './services/googleAuthService';

const SECTION_LIST = [
  'main', 'drive', 'portal', 'pptMaker', 'myPage'
];

function App() {
  // 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // localStorage에서 로그인 상태 복원
    const savedLoginState = localStorage.getItem('isLoggedIn');
    return savedLoginState === 'true';
  });
  const [activeSection, setActiveSection] = useState('main');
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
  const [authStatus, setAuthStatus] = useState('disconnected');
  const [selectedImages, setSelectedImages] = useState([]); // 선택된 이미지 파일들
  const [imagePreviews, setImagePreviews] = useState([]); // 이미지 미리보기 URL들
  const [showImageModal, setShowImageModal] = useState(false); // 이미지 확대 모달
  const [selectedImageForModal, setSelectedImageForModal] = useState(null); // 모달에 표시할 이미지
  const formRef = useRef();
  
  // 통합 인증 서비스 인스턴스
  const authService = useRef(new GoogleAuthService());
  const sheetsService = useRef(null);
  const driveService = useRef(null);

  // 섹션 전환
  function showSection(section) {
    setActiveSection(section);
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
          // 토큰 갱신 시도
          await authService.current.requestToken();
          console.log('토큰 갱신 완료');
        } catch (tokenError) {
          console.log('토큰 갱신 실패, 인증 상태는 유지하되 서비스 초기화는 건너뜁니다:', tokenError);
          // 토큰 갱신 실패 시에도 로그인 상태는 유지
          setAuthStatus('disconnected');
          // 서비스 초기화는 건너뛰고 로그인 상태만 유지
          return;
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
        console.log('인증이 완료되지 않았습니다.');
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
            console.log('기존 스프레드시트가 존재하지 않습니다. 새로 생성합니다...');
            currentSpreadsheetId = null;
          } else {
            console.log('기존 스프레드시트가 유효합니다.');
          }
        } catch (error) {
          console.log('기존 스프레드시트 확인 중 오류, 새로 생성합니다:', error);
          currentSpreadsheetId = null;
        }
      }
      
      if (!currentSpreadsheetId) {
        console.log('새 포트폴리오 시트 파일 생성 중...');
        
        try {
          // 기존 포트폴리오 시트 파일 검색
          const existingFiles = await driveService.current.listFiles(50);
          const portfolioFile = existingFiles.find(file => 
            file.name === '포트폴리오 이력' && 
            file.mimeType === 'application/vnd.google-apps.spreadsheet'
          );
          
          if (portfolioFile) {
            console.log('기존 포트폴리오 시트 파일 발견:', portfolioFile.id);
            // 기존 파일 ID 저장
            currentSpreadsheetId = portfolioFile.id;
            saveLoginState(true, currentSpreadsheetId);
          } else {
            console.log('기존 파일이 없어서 새로 생성합니다...');
            const spreadsheet = await sheetsService.current.createSpreadsheet('포트폴리오 이력');
            currentSpreadsheetId = spreadsheet.spreadsheetId;
            saveLoginState(true, currentSpreadsheetId);
            await sheetsService.current.setupHeaders(currentSpreadsheetId);
            console.log('새 스프레드시트 생성 완료:', currentSpreadsheetId);
          }
        } catch (error) {
          console.error('기존 파일 확인 중 오류, 새로 생성합니다:', error);
          const spreadsheet = await sheetsService.current.createSpreadsheet('포트폴리오 이력');
          currentSpreadsheetId = spreadsheet.spreadsheetId;
          saveLoginState(true, currentSpreadsheetId);
          await sheetsService.current.setupHeaders(currentSpreadsheetId);
          console.log('새 스프레드시트 생성 완료:', currentSpreadsheetId);
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
  async function loadDriveFiles() {
    if (!driveService.current) return;
    
    try {
      console.log('드라이브 파일 불러오기 시작');
      const files = await driveService.current.listFiles(20);
      console.log('드라이브 파일:', files);
      setDriveFiles(files);
    } catch (error) {
      console.error('드라이브 파일 로드 오류:', error);
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
      
      // 로그인 상태 저장
      saveLoginState(true);
      
      // 메인 페이지로 이동
      setActiveSection('main');
      
      // 인증 완료 후 서비스들 초기화
      await initializeServices();
      
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
      
      // 로컬 상태 정리
      saveLoginState(false);
      setActiveSection('main');
      setIsSheetsInitialized(false);
      setIsDriveInitialized(false);
      setAuthStatus('disconnected');
      
      // 서비스 인스턴스 정리
      sheetsService.current = null;
      driveService.current = null;
      
      // localStorage에서 스프레드시트 ID도 제거
      localStorage.removeItem('spreadsheetId');
    }
  }

  // 이력 추가 모달
  function showAddExperienceModal() {
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
            setForm({ title: '', startDate: '', endDate: '', description: '' });
    setSelectedImages([]);
    setImagePreviews([]);
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
      
      try
      {
        setIsLoading(true);
        
        let imageUrls = [];
        
        // 이미지들이 선택된 경우 구글 드라이브에 업로드
        if (selectedImages.length > 0) {
          for (const imageFile of selectedImages) {
            const imageUrl = await uploadImageToDrive(imageFile);
            imageUrls.push(imageUrl);
          }
        }
        
        // 기간 포맷팅
        const period = formatPeriod(form.startDate, form.endDate);
        
        // 로컬 상태 업데이트 (기간 포함)
        const newExperience = { 
          ...form, 
          period, // 포맷팅된 기간 추가
          imageUrls 
        };
        setExperiences([...experiences, newExperience]);
        
        // 구글 시트에 저장
        if (spreadsheetId && sheetsService.current) {
          const sheetData = sheetsService.current.formatExperienceForSheet(newExperience);
          await sheetsService.current.appendData(spreadsheetId, 'A:E', [sheetData]);
        }
        
        closeModal();
      }catch (error) {
        console.error('이력 저장 오류:', error);
        const errorMessage = sheetsService.current?.formatErrorMessage(error) || '이력 저장에 실패했습니다.';
        alert(errorMessage);
      } finally {
        setIsLoading(false);
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

  // 이미지 확대 모달 닫기
  function closeImageModal() {
    setShowImageModal(false);
    setSelectedImageForModal(null);
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
  async function uploadImageToDrive(imageFile) {
    if (!driveService.current) {
      throw new Error('구글 드라이브 서비스가 초기화되지 않았습니다.');
    }

    try {
      // 이미지 파일을 드라이브에 업로드
      const uploadResult = await driveService.current.uploadFile(
        `portfolio_${Date.now()}_${imageFile.name}`,
        imageFile,
        imageFile.type
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

      // 공개 링크 반환 - 직접 이미지 표시가 가능한 형식 사용
      return `https://drive.google.com/uc?export=view&id=${uploadResult.id}`;
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
      setIsLoading(true);
      
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
      setIsLoading(false);
    }
  }

  // 파일 업로드 핸들러
  async function handleDriveFileUpload(event) {
    const file = event.target.files[0];
    if (!file || !driveService.current) return;
    
    try {
      setIsLoading(true);
      await driveService.current.uploadFile(file.name, file, file.type);
      await loadDriveFiles();
      alert('파일이 업로드되었습니다!');
    } catch (error) {
      const errorMessage = driveService.current?.formatErrorMessage(error) || '파일 업로드에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  // 파일 삭제 핸들러
  async function handleDriveFileDelete(fileId) {
    if (!window.confirm('정말로 이 파일을 삭제하시겠습니까?') || !driveService.current) return;
    
    try {
      setIsLoading(true);
      await driveService.current.deleteFile(fileId);
      await loadDriveFiles();
      alert('파일이 삭제되었습니다!');
    } catch (error) {
      const errorMessage = driveService.current?.formatErrorMessage(error) || '파일 삭제에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  // 구글 시트 데이터 새로고침
  async function refreshSheetsData() {
    try {
      setIsLoading(true);
      await loadExperiencesFromSheets();
      alert('구글 시트 데이터가 새로고침되었습니다!');
    } catch (error) {
      console.error('시트 데이터 새로고침 오류:', error);
      alert('데이터 새로고침에 실패했습니다: ' + (error?.message || error));
    } finally {
      setIsLoading(false);
    }
  }

  // 페이지 로드 시 로그인 상태 복원 및 초기화
    // 페이지 로드 시 로그인 상태 복원 및 초기화
    useEffect(() => {
      // 페이지 로드 시 토큰 초기화
      const clearTokens = () => {
        // 구글 토큰 관련 쿠키 및 로컬 스토리지 정리
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // 구글 관련 로컬 스토리지 정리
        Object.keys(localStorage).forEach(key => {
          if (key.includes('google') || key.includes('gapi') || key.includes('token')) {
            localStorage.removeItem(key);
          }
        });
        
        // 로그인 상태를 false로 설정
        setIsLoggedIn(false);
        localStorage.setItem('isLoggedIn', 'false');
        
        console.log('토큰 초기화 완료');
      };
      
      // 페이지 로드 시 토큰 초기화 실행
      clearTokens();
      
    }, []);
  // useEffect(() => {
  //   if (isLoggedIn && !isSheetsInitialized && !isDriveInitialized) {
  //     // 이미 로그인된 상태라면 서비스 초기화
  //     const initializeServices = async () => {
  //       try {
  //         setIsLoading(true);
  //         console.log('페이지 로드 시 서비스 초기화 시작...');

  //         // 통합 인증 시스템 초기화
  //         await initializeGoogleAuth();

  //       } catch (error) {
  //         console.error('서비스 초기화 오류:', error);
  //         // 초기화 실패 시에도 로그아웃하지 않고 에러 상태만 표시
  //         setAuthStatus('error');
  //         setIsSheetsInitialized(false);
  //         setIsDriveInitialized(false);
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     };
  //     initializeServices();
  //   }
  // }, [isLoggedIn, isSheetsInitialized, isDriveInitialized]);


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
                  {isLoading && (
                    <div className="mt-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">로그인 중...</span>
                      </div>
                      <p className="mt-2 text-muted">로그인 중...</p>
                    </div>
                  )}
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
                          <button className="btn btn-outline-dark me-2" onClick={() => selectAllExperiences(true)}>전체 선택</button>
                          <button className="btn btn-outline-dark me-2" onClick={() => selectAllExperiences(false)}>전체 해제</button>
                          <button className="btn btn-outline-danger" onClick={deleteSelectedExperiences} disabled={selected.length === 0}>선택 삭제</button>
                        </div>
                        <div>
                          <button className="btn btn-outline-primary me-2" onClick={refreshSheetsData}>
                            <i className="fas fa-sync-alt"></i> 시트 새로고침
                          </button>
                          <button className="btn btn-dark" id="nextButton" disabled={selected.length === 0}>다음</button>
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
                            <div className="list-group-item" key={idx}>
                              <div className="d-flex align-items-center">
                                <div className="me-3 d-flex flex-column" style={{ gap: '5px' }}>
                                  {(exp.imageUrls && exp.imageUrls.length > 0) ? (
                                    <>
                                      {exp.imageUrls.slice(0, 3).map((imageUrl, imgIdx) => (
                                        <div 
                                          key={imgIdx} 
                                          style={{ 
                                            width: '60px', 
                                            height: '60px', 
                                            overflow: 'hidden', 
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            border: '2px solid transparent',
                                            transition: 'border-color 0.2s'
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                          onClick={() => openImageModal(imageUrl, `${exp.title} - 이미지 ${imgIdx + 1}`)}
                                        >
                                          <img 
                                            src={imageUrl} 
                                            alt={`${exp.title} 이미지 ${imgIdx + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      ))}
                                      {exp.imageUrls.length > 3 && (
                                        <div className="text-center" style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                                          +{exp.imageUrls.length - 3}
                                        </div>
                                      )}
                                    </>
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
                                        color: '#6c757d'
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
                                <div className="form-check ms-3">
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
              {/* 구글 드라이브 섹션 */}
              {activeSection === 'drive' && (
                <div id="driveSection" className="content-section">
                  <div className="mac-window">
                    <h2>구글 드라이브</h2>
                    <div className="mac-window-content">
                      {/* 드라이브 연동 상태 */}
                      <div className="drive-status mb-4">
                        <div className={`status-indicator ${isDriveInitialized ? 'connected' : 'disconnected'}`}>
                          <i className={`fas ${isDriveInitialized ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                          <span>{isDriveInitialized ? '구글 드라이브 연동됨' : '구글 드라이브 연동 중...'}</span>
                        </div>
                        {!isDriveInitialized && (
                          <div className="drive-help">
                            <small className="text-muted">
                              구글 드라이브 연동이 필요합니다. 구글 계정으로 로그인해주세요.
                            </small>
                          </div>
                        )}
                      </div>
                      {/* 파일 목록 */}
                      {isDriveInitialized && (
                        <div className="drive-files">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4>내 파일</h4>
                            <div>
                              <label htmlFor="drive-upload-input" className="btn btn-outline-success btn-sm me-2">
                                <i className="fas fa-upload"></i> 업로드
                              </label>
                              <input
                                id="drive-upload-input"
                                type="file"
                                style={{ display: 'none' }}
                                onChange={handleDriveFileUpload}
                              />
                              <button className="btn btn-outline-primary btn-sm" onClick={loadDriveFiles}>
                                <i className="fas fa-sync-alt"></i> 새로고침
                              </button>
                            </div>
                          </div>
                          <div className="file-list">
                            {driveFiles.length === 0 ? (
                              <div className="empty-state">
                                <i className="fas fa-folder-open fa-3x mb-3"></i>
                                <p>파일이 없습니다.</p>
                              </div>
                            ) : (
                              driveFiles.map((file, index) => (
                                <div key={file.id} className="file-item list-group-item">
                                  <div className="d-flex align-items-center">
                                    <i className={`fas ${file.mimeType === 'application/vnd.google-apps.folder' ? 'fa-folder' : 'fa-file'} me-3`}></i>
                                    <div className="flex-grow-1">
                                      <h6 className="mb-1">{file.name}</h6>
                                      <small className="text-muted">
                                        {file.mimeType} • {new Date(file.createdTime).toLocaleDateString()}
                                      </small>
                                    </div>
                                    <div className="file-actions d-flex align-items-center">
                                      <a href={`https://drive.google.com/file/d/${file.id}/view`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary me-2">
                                        다운로드
                                      </a>
                                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDriveFileDelete(file.id)}>
                                        <i className="fas fa-trash-alt"></i> 삭제
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
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
                      <h2>PPT 기록</h2>
                      <div id="pptHistory" className="mac-list">
                        <div className="empty-state">
                          <i className="fas fa-history fa-3x mb-3"></i>
                          <p>아직 제작한 PPT가 없습니다.</p>
                        </div>
                      </div>
                    </div>
                    <div className="mac-window">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h2>이력 관리</h2>
                        <button className="btn btn-outline-primary btn-sm" onClick={refreshSheetsData}>
                          <i className="fas fa-sync-alt"></i> 시트 새로고침
                        </button>
                      </div>
                      <div id="experienceManagement" className="mac-list">
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
                            <div className="list-group-item" key={idx}>
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
                                            transition: 'border-color 0.2s'
                                          }}
                                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                                          onClick={() => openImageModal(imageUrl, `${exp.title} - 이미지 ${imgIdx + 1}`)}
                                        >
                                          <img 
                                            src={imageUrl} 
                                            alt={`${exp.title} 이미지 ${imgIdx + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      ))}
                                      {exp.imageUrls.length > 3 && (
                                        <div className="text-center" style={{ fontSize: '0.8rem', color: '#6c757d' }}>
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
                                        color: '#6c757d'
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
                                <div className="text-muted">
                                  <small>구글 시트에서 로드됨</small>
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
                <h5 className="modal-title">새 이력 추가</h5>
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
                          <label className="form-label small text-muted">시작일</label>
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
                          <label className="form-label small text-muted">종료일</label>
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
                          <small className="text-muted">
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
                      <small className="text-muted">최대 파일 크기: 5MB, 지원 형식: JPG, PNG, GIF</small>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>취소</button>
                  <button type="submit" className="btn btn-primary">저장</button>
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
              <div className="modal-body text-center p-0">
                <img 
                  src={selectedImageForModal.url} 
                  alt={selectedImageForModal.title}
                  className="img-fluid"
                  style={{ maxHeight: '80vh', maxWidth: '100%' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    alert('이미지를 불러올 수 없습니다.');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
