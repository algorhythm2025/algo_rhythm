import "./App.css";
import React, { useState, useRef, useEffect } from 'react';

const SECTION_LIST = [
  'main', 'drive', 'portal', 'pptMaker', 'myPage'
];

function App() {
  // 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeSection, setActiveSection] = useState('main');
  const [showModal, setShowModal] = useState(false);
  const [experiences, setExperiences] = useState([]);
  const [form, setForm] = useState({ title: '', period: '', description: '' });
  const [selected, setSelected] = useState([]);
  const formRef = useRef();
    // 추가: 테마/팔레트 상태
    const [theme, setTheme] = useState('dark');      // 'dark' | 'light'
    const [palette, setPalette] = useState('aurora'); // 'aurora' | 'plum' | 'sunset'

// 루트 html에 data-속성으로 반영
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-palette', palette);
    }, [theme, palette]);


    // 섹션 전환
  function showSection(section) {
    setActiveSection(section);
  }

  // 로그인 (구글 로그인 콜백 시 호출)
  function handleCredentialResponse(response) {
    setIsLoggedIn(true);
    setActiveSection('main');
  }

  // 로그아웃
  function logout() {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      setIsLoggedIn(false);
      setActiveSection('main');
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
  function saveExperience(e) {
    e.preventDefault();
    if (form.title && form.period && form.description) {
      setExperiences([...experiences, { ...form }]);
      closeModal();
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

  // 구글 로그인 버튼 렌더링 (GSI 위젯)
  useEffect(() => {
    if (!isLoggedIn) {
      // GSI 스크립트 동적 로드
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = () => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          window.google.accounts.id.initialize({
            client_id: '315917737558-2qd5q4as4qbh03vru788h5ccrci9bbed.apps.googleusercontent.com',
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
        document.body.removeChild(script);
      };
    }
  }, [isLoggedIn]);

  // 실제 화면 렌더링
  return (
    <div>
      {/* 로그인 페이지 */}
        {!isLoggedIn && (
            <main className="landing">
                {/* 왼쪽 */}
                <section className="hero">
                    <div className="hero__wrap">
                        <h1 className="hero__logo">Portra</h1>
                        <p className="hero__lead">3분 만에 완성하는 AI 포트폴리오</p>
                        <ul className="hero__features">
                            <li>간편한 이력 관리</li>
                            <li>전문적인 PPT 템플릿</li>
                            <li>구글 드라이브 연동</li>
                        </ul>
                    </div>
                </section>

                {/* 오른쪽 */}
                <section className="auth">
                    <div className="auth__card auth__card--elev">
                        <header className="auth__head">
                            <h2 className="auth__title">시작하기</h2>
                            <p className="auth__sub">Google로 로그인하여 Portra를 바로 사용해 보세요</p>
                        </header>

                        <div className="auth__actions">
                            <div id="googleSignInDiv" className="auth__google"></div>
                        </div>

                        <div className="auth__divider"><span>또는</span></div>

                        <ul className="auth__benefits">
                            <li>회원가입 없이 10초만에 시작</li>
                            <li>언제든지 로그아웃 및 데이터 삭제 가능</li>
                        </ul>

                        <p className="auth__meta">
                            계속 진행하면 <a href="#">서비스 약관</a> 및 <a href="#">개인정보 처리방침</a>에 동의하게 됩니다.
                        </p>
                    </div>
                </section>
            </main>
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
                {/* 스타일 스위처 (개발용) */}
                {/* 스타일 스위처 (개발용) */}
                <div className="style-switcher">
                    <button className="sw-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
                        {theme === 'dark' ? '🌙' : '☀︎'}
                    </button>

                    <div className="sw-pals">
                        <button
                            className={`sw-dot sw-dot--aurora ${palette==='aurora' ? 'is-active' : ''}`}
                            title="Aurora"
                            onClick={() => setPalette('aurora')}
                        />
                        <button
                            className={`sw-dot sw-dot--plum ${palette==='plum' ? 'is-active' : ''}`}
                            title="Plum"
                            onClick={() => setPalette('plum')}
                        />
                        <button
                            className={`sw-dot sw-dot--sunset ${palette==='sunset' ? 'is-active' : ''}`}
                            title="Sunset"
                            onClick={() => setPalette('sunset')}
                        />
                    </div>
                </div>

                <div className="sidebar-item mt-auto" onClick={logout}>
                <i className="fas fa-sign-out-alt"></i>
                <span>로그아웃</span>
              </div>
            </div>
            <div className="mac-content">
              {/* 메인 섹션 */}
              {activeSection === 'main' && (
                <div id="mainSection" className="content-section">
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
                          <button className="btn btn-outline-dark" onClick={() => selectAllExperiences(false)}>전체 해제</button>
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
                    <div className="mac-window-content text-center p-5">
                      <i className="fab fa-google-drive fa-3x mb-3 text-primary"></i>
                      <h3 className="mb-3">구글 드라이브로 이동</h3>
                      <p className="mb-4">구글 드라이브에서 파일을 관리하세요.</p>
                      <a href="https://drive.google.com" target="_blank" className="btn btn-primary">구글 드라이브 열기</a>
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
