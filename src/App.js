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
  const [form, setForm] = useState({ title: '', period: '', description: '' });
  const [selected, setSelected] = useState([]);
  const [spreadsheetId, setSpreadsheetId] = useState(() => {
    // localStorage에서 스프레드시트 ID 복원
    return localStorage.getItem('spreadsheetId') || null;
  });
  const [isSheetsInitialized, setIsSheetsInitialized] = useState(false);
  const [isDriveInitialized, setIsDriveInitialized] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef();
  const authService = useRef(new GoogleAuthService());
  const sheetsService = useRef(new GoogleSheetsService());
  const driveService = useRef(new GoogleDriveService());

  // 섹션 전환
  function showSection(section) {
    setActiveSection(section);
  }

  // 공통 구글 인증 초기화
  async function initializeGoogleAuth() {
    try {
      console.log('공통 구글 인증 초기화 시작...');
      
      await authService.current.initializeGapi();
      console.log('공통 GAPI 초기화 완료');
      
      await authService.current.initializeGis();
      console.log('공통 GIS 초기화 완료');
      
      await authService.current.requestToken();
      console.log('공통 토큰 요청 완료');
      
      console.log('공통 인증 초기화 완료');
      
    } catch (error) {
      console.error('공통 구글 인증 초기화 오류:', error);
      console.error('오류 상세:', error.message, error.stack);
      throw error;
    }
  }

  // 구글 시트 초기화
  async function initializeGoogleSheets() {
    try {
      console.log('구글 시트 초기화 시작...');
      
      // 공통 인증이 완료되었는지 확인
      if (!authService.current.isAuthenticated()) {
        console.log('공통 인증이 필요합니다.');
        return;
      }
      
      console.log('인증 상태 확인 완료');
      
      // GAPI 클라이언트에 토큰이 설정되어 있는지 확인
      if (window.gapi && window.gapi.client) {
        const token = window.gapi.client.getToken();
        console.log('GAPI 토큰 상태:', token ? '설정됨' : '설정되지 않음');
      }
      
      setIsSheetsInitialized(true);
      console.log('시트 초기화 완료');
      
      // 기존 스프레드시트가 있는지 확인하고 없으면 생성
      if (!spreadsheetId) {
        console.log('새 스프레드시트 생성 중...');
        const spreadsheet = await sheetsService.current.createSpreadsheet('포트폴리오 이력');
        saveLoginState(true, spreadsheet.spreadsheetId);
        await sheetsService.current.setupHeaders(spreadsheet.spreadsheetId);
        console.log('스프레드시트 생성 완료:', spreadsheet.spreadsheetId);
      }
      
      // 기존 데이터 로드
      await loadExperiencesFromSheets();
      console.log('데이터 로드 완료');
      
    } catch (error) {
      console.error('구글 시트 초기화 오류:', error);
      console.error('오류 상세:', error.message, error.stack);
      const errorMessage = sheetsService.current.formatErrorMessage(error);
      alert(errorMessage);
      setIsSheetsInitialized(false);
    }
  }

  // 시트에서 이력 데이터 로드
  async function loadExperiencesFromSheets() {
    if (!spreadsheetId) return;
    
    try {
      const sheetData = await sheetsService.current.readData(spreadsheetId, 'A:D');
      const experiences = sheetsService.current.formatSheetToExperience(sheetData);
      setExperiences(experiences);
    } catch (error) {
      console.error('이력 데이터 로드 오류:', error);
    }
  }

  // 구글 드라이브 초기화
  async function initializeGoogleDrive() {
    try {
      console.log('구글 드라이브 초기화 시작...');
      
      // 공통 인증이 완료되었는지 확인
      if (!authService.current.isAuthenticated()) {
        console.log('공통 인증이 필요합니다.');
        return;
      }
      
      console.log('드라이브 인증 상태 확인 완료');
      
      // GAPI 클라이언트에 토큰이 설정되어 있는지 확인
      if (window.gapi && window.gapi.client) {
        const token = window.gapi.client.getToken();
        console.log('드라이브 GAPI 토큰 상태:', token ? '설정됨' : '설정되지 않음');
      }
      
      setIsDriveInitialized(true);
      console.log('드라이브 초기화 완료');
      
      // 파일 목록 로드
      await loadDriveFiles();
      console.log('드라이브 파일 로드 완료');
      
    } catch (error) {
      console.error('구글 드라이브 초기화 오류:', error);
      console.error('오류 상세:', error.message, error.stack);
      const errorMessage = driveService.current.formatErrorMessage(error);
      alert(errorMessage);
      setIsDriveInitialized(false);
    }
  }

  // 드라이브 파일 목록 로드
  async function loadDriveFiles() {
    try {
      const files = await driveService.current.listFiles(20);
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

  // 로그인 (구글 로그인 콜백 시 호출)
  async function handleCredentialResponse(response) {
    try {
      setIsLoading(true);
      console.log('로그인 응답 받음:', response);
      
      // 로그인 상태 저장
      saveLoginState(true);
      
      // 메인 페이지로 먼저 이동
      setActiveSection('main');
      
      // 공통 인증 서비스 초기화
      await authService.current.initializeGapi();
      console.log('로그인 후 GAPI 초기화 완료');
      
      await authService.current.initializeGis();
      console.log('로그인 후 GIS 초기화 완료');
      
      // 토큰 요청
      await authService.current.requestToken();
      console.log('로그인 후 토큰 요청 완료');
      
      // 인증 상태 확인
      const isAuth = authService.current.isAuthenticated();
      console.log('로그인 후 인증 상태:', isAuth);
      
      if (isAuth) {
        // 시트와 드라이브 초기화
        await initializeGoogleSheets();
        await initializeGoogleDrive();
      } else {
        console.error('인증이 완료되지 않았습니다.');
        // 인증 실패해도 메인 페이지는 유지
        console.log('인증 실패했지만 메인 페이지 유지');
      }
      
    } catch (error) {
      console.error('로그인 후 초기화 오류:', error);
      const errorMessage = error?.message || '로그인 후 초기화에 실패했습니다.';
      console.log('오류 발생했지만 메인 페이지 유지:', errorMessage);
      // 오류가 발생해도 메인 페이지는 유지
    } finally {
      setIsLoading(false);
    }
  }

  // 로그인 후 서비스 초기화
  async function initializeServicesAfterLogin() {
    try {
      // GAPI 초기화
      await authService.current.initializeGapi();
      console.log('GAPI 초기화 완료');
      
      // GIS 초기화 (토큰 자동 설정)
      await authService.current.initializeGis();
      console.log('GIS 초기화 완료');
      
      // 토큰 요청 (자동으로)
      await authService.current.requestToken();
      console.log('토큰 요청 완료');
      
      // 토큰이 없으면 다시 요청
      if (!authService.current.getAccessToken()) {
        console.log('토큰이 없어서 다시 요청합니다...');
        await authService.current.requestToken();
      }
      
      console.log('최종 인증 상태:', authService.current.isAuthenticated());
      
      // 시트와 드라이브 초기화
      await initializeGoogleSheets();
      await initializeGoogleDrive();
      
    } catch (error) {
      console.error('서비스 초기화 오류:', error);
      throw error;
    }
  }

  // 로그아웃
  function logout() {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      saveLoginState(false);
      setActiveSection('main');
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
    setForm({ title: '', period: '', description: '' });
  }

  // 이력 저장
  async function saveExperience(e) {
    e.preventDefault();
    if (form.title && form.period && form.description) {
      try {
        setIsLoading(true);
        
        // 로컬 상태 업데이트
        const newExperience = { ...form };
        setExperiences([...experiences, newExperience]);
        
        // 구글 시트에 저장
        if (spreadsheetId && isSheetsInitialized) {
          const sheetData = sheetsService.current.formatExperienceForSheet(newExperience);
          await sheetsService.current.appendData(spreadsheetId, 'A:D', [sheetData]);
        }
        
        closeModal();
      } catch (error) {
        console.error('이력 저장 오류:', error);
        const errorMessage = sheetsService.current.formatErrorMessage(error);
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

  // 선택된 이력 삭제
  async function deleteSelectedExperiences() {
    if (selected.length === 0) return;
    
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
          await sheetsService.current.deleteData(spreadsheetId, `A${rowNumber}:D${rowNumber}`);
        }
      }
      
      // 로컬 상태에서도 삭제
      const newExperiences = experiences.filter((_, idx) => !selected.includes(idx));
      setExperiences(newExperiences);
      setSelected([]);
      
    } catch (error) {
      console.error('이력 삭제 오류:', error);
      const errorMessage = sheetsService.current.formatErrorMessage(error);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  // 페이지 로드 시 로그인 상태 복원 및 초기화
  useEffect(() => {
    if (isLoggedIn && !isSheetsInitialized && !isDriveInitialized) {
      // 이미 로그인된 상태라면 서비스 초기화
      const initializeServices = async () => {
        try {
          setIsLoading(true);
          console.log('페이지 로드 시 서비스 초기화 시작...');
          
          // 공통 인증 서비스 초기화
          await authService.current.initializeGapi();
          console.log('페이지 로드 후 GAPI 초기화 완료');
          
          await authService.current.initializeGis();
          console.log('페이지 로드 후 GIS 초기화 완료');
          
          // 토큰 요청
          await authService.current.requestToken();
          console.log('페이지 로드 후 토큰 요청 완료');
          
          // 인증 상태 확인
          const isAuth = authService.current.isAuthenticated();
          console.log('페이지 로드 후 인증 상태:', isAuth);
          
          if (isAuth) {
            // 시트와 드라이브 초기화
            await initializeGoogleSheets();
            await initializeGoogleDrive();
          } else {
            console.error('페이지 로드 후 인증이 완료되지 않았습니다.');
            saveLoginState(false);
            localStorage.removeItem('spreadsheetId');
          }
          
        } catch (error) {
          console.error('서비스 초기화 오류:', error);
          // 초기화 실패 시 로그아웃
          saveLoginState(false);
          localStorage.removeItem('spreadsheetId');
        } finally {
          setIsLoading(false);
        }
      };
      initializeServices();
    }
  }, [isLoggedIn, isSheetsInitialized, isDriveInitialized]);

  // 구글 로그인 버튼 렌더링 (GSI 위젯)
  useEffect(() => {
    if (!isLoggedIn) {
      // 기존 GSI 위젯 제거
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.cancel();
      }
      
      // GSI 스크립트 동적 로드
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          window.google.accounts.id.initialize({
            client_id: '158941918402-insbhffbmi221j6s3v4hghlle67t6rt2.apps.googleusercontent.com',
            callback: handleCredentialResponse,
            auto_select: false,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('googleSignInDiv'),
            { theme: 'outline', size: 'large', width: 300 }
          );
        }
      };
      return () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          window.google.accounts.id.cancel();
        }
        if (script.parentNode) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isLoggedIn]);

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
          {/* 로딩 오버레이 */}
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">로딩 중...</span>
                </div>
                <p className="mt-2">구글 시트와 연동 중...</p>
              </div>
            </div>
          )}
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
                  {/* 구글 시트 연동 상태 */}
                  <div className="sheets-status mb-4">
                    <div className={`status-indicator ${isSheetsInitialized ? 'connected' : 'disconnected'}`}>
                      <i className={`fas ${isSheetsInitialized ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                      <span>{isSheetsInitialized ? '구글 시트 연동됨' : '구글 시트 연동 중...'}</span>
                    </div>
                    {spreadsheetId && (
                      <div className="spreadsheet-info">
                        <small>스프레드시트 ID: {spreadsheetId}</small>
                        <br />
                        <small>총 이력 수: {experiences.length}개</small>
                      </div>
                    )}
                    {!isSheetsInitialized && (
                      <div className="sheets-help">
                        <small className="text-muted">
                          구글 시트 연동이 필요합니다. 구글 계정으로 로그인해주세요.
                        </small>
                      </div>
                    )}
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
                        <button className="btn btn-dark" id="nextButton" disabled={selected.length === 0}>다음</button>
                      </div>
                      <div id="experienceList" className="mac-list">
                        {experiences.length === 0 ? (
                          <div className="empty-state">
                            <i className="fas fa-clipboard-list fa-3x mb-3"></i>
                            <p>등록된 이력이 없습니다.</p>
                          </div>
                        ) : (
                          experiences.map((exp, idx) => (
                            <div className="list-group-item" key={idx}>
                              <div className="d-flex align-items-center">
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
                            <button className="btn btn-outline-primary btn-sm" onClick={loadDriveFiles}>
                              <i className="fas fa-sync-alt"></i> 새로고침
                            </button>
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
                                    <div className="file-actions">
                                      <a href={`https://drive.google.com/file/d/${file.id}/view`} target="_blank" className="btn btn-sm btn-outline-primary">
                                        <i className="fas fa-external-link-alt"></i>
                                      </a>
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
                      <h2>이력 관리</h2>
                      <div id="experienceManagement" className="mac-list">
                        {experiences.length === 0 ? (
                          <div className="empty-state">
                            <i className="fas fa-clipboard-list fa-3x mb-3"></i>
                            <p>등록된 이력이 없습니다.</p>
                          </div>
                        ) : (
                          experiences.map((exp, idx) => (
                            <div className="list-group-item" key={idx}>
                              <div className="d-flex align-items-center">
                                <div className="flex-grow-1">
                                  <h6 className="mb-1">{exp.title}</h6>
                                  <p className="mb-0"><small>{exp.period}</small></p>
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
                    <input type="text" className="form-control" placeholder="예: 2023.03 - 2023.12" required value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">설명</label>
                    <textarea className="form-control" rows="3" required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}></textarea>
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
    </div>
  );
}

export default App;
