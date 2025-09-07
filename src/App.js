import "./App.css";
import './bright.css';
import React, { useState, useRef, useEffect } from "react";

function FeatureCard({ emoji, icon, title, subtitle, onClick, accent = "violet" }) {
    return (
        <button className={`mac-card action lg accent-${accent}`} onClick={onClick}>
            <div className="card-row">
                <div className="card-icon">
                    {emoji ? <span className="card-emoji" role="img" aria-label={title}>{emoji}</span>
                        : <i className={icon}></i>}
                </div>
                <div className="card-text">
                    <div className="card-title">{title}</div>
                    <div className="card-sub">{subtitle}</div>
                </div>
            </div>
        </button>
    );
}

function App() {
    // 상태 관리
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeSection, setActiveSection] = useState("main");
    const [showModal, setShowModal] = useState(false);
    const [experiences, setExperiences] = useState([]);
    const [form, setForm] = useState({ title: "", period: "", description: "" });
    const [selected, setSelected] = useState([]);
    const formRef = useRef();

    // 테마/팔레트
    const [theme, setTheme] = useState("dark");       // 'dark' | 'light'
    const [palette, setPalette] = useState("aurora"); // 'aurora' | 'plum' | 'sunset'

    // html data-* 적용
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute("data-theme", theme);
        root.setAttribute("data-palette", palette);
    }, [theme, palette]);

    // 섹션 전환
    function showSection(section) {
        setActiveSection(section);
    }

    // 로그인 (구글 GSI 콜백)
    function handleCredentialResponse() {
        setIsLoggedIn(true);
        setActiveSection("main");
    }

    // 로그아웃
    function logout() {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            setIsLoggedIn(false);
            setActiveSection("main");
        }
    }

    // 이력 모달
    function showAddExperienceModal() {
        setShowModal(true);
    }
    function closeModal() {
        setShowModal(false);
        setForm({ title: "", period: "", description: "" });
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
        if (select) setSelected(experiences.map((_, i) => i));
        else setSelected([]);
    }

    // 체크박스 토글
    function toggleSelect(idx) {
        setSelected(
            selected.includes(idx)
                ? selected.filter((i) => i !== idx)
                : [...selected, idx]
        );
    }

    // 구글 로그인 버튼 렌더링 (GSI)
    useEffect(() => {
        if (!isLoggedIn) {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
            script.onload = () => {
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.initialize({
                        client_id:
                            "315917737558-2qd5q4as4qbh03vru788h5ccrci9bbed.apps.googleusercontent.com",
                        callback: handleCredentialResponse,
                        auto_select: false,
                    });
                    window.google.accounts.id.renderButton(
                        document.getElementById("googleSignInDiv"),
                        { theme: "outline", size: "large", width: 300 }
                    );
                }
            };
            return () => document.body.removeChild(script);
        }
    }, [isLoggedIn]);

    // 화면
    return (
        <div>
            {/* 로그인 전 랜딩 */}
            {!isLoggedIn && (
                <main className="landing">
                    {/* 왼쪽 Hero */}
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

                    {/* 오른쪽 Auth */}
                    <section className="auth">
                        <div className="auth__card auth__card--elev">
                            <header className="auth__head">
                                <h2 className="auth__title">시작하기</h2>
                                <p className="auth__sub">
                                    Google로 로그인하여 Portra를 바로 사용해 보세요
                                </p>
                            </header>

                            <div className="auth__actions">
                                <div id="googleSignInDiv" className="auth__google"></div>
                            </div>

                            <div className="auth__divider">
                                <span>또는</span>
                            </div>

                            <ul className="auth__benefits">
                                <li>회원가입 없이 10초만에 시작</li>
                                <li>언제든지 로그아웃 및 데이터 삭제 가능</li>
                            </ul>

                            <p className="auth__meta">
                                계속 진행하면 <a href="#">서비스 약관</a> 및{" "}
                                <a href="#">개인정보 처리방침</a>에 동의하게 됩니다.
                            </p>
                        </div>
                    </section>
                </main>
            )}

            {/* 로그인 후 메인 */}
            {isLoggedIn && (
                <div id="mainPage">
                    <div className="mac-titlebar">
                        <div className="mac-title">Portra</div>
                    </div>

                    {/* ★ 사이드바 제거한 단일 레이아웃 */}
                    <div className="mac-container no-sidebar">
                        <div className="mac-content mac-content--padded">
                            {/* 메인이 아닌 화면에서는 상단에 ‘메인으로’ 버튼 */}
                            {activeSection !== "main" && (
                                <div className="top-actions" style={{ marginBottom: 12 }}>
                                    <button
                                        className="btn btn-outline-dark btn-sm"
                                        onClick={() => setActiveSection("main")}
                                    >
                                        ← 메인으로
                                    </button>
                                </div>
                            )}

                            {/* 메인 카드 6개 */}
                            {activeSection === "main" && (
                                <div id="mainSection" className="content-section">

                                    {/* 컴팩트 히어로 바 */}
                                    <div className="home-hero">
                                        <div>
                                            <h2>무엇을 할까요?</h2>
                                            <p>아래 카드에서 원하는 작업을 선택하세요.</p>
                                        </div>
                                        <div className="chips">
                                            <span className="chip">최근 0</span>
                                            <span className="chip">이력 {experiences.length}</span>
                                            <span className="chip">템플릿 4</span>
                                        </div>
                                    </div>

                                    {/* 패널 안에 3×2 그리드 */}
                                    <div className="mac-window">
                                        <div className="mac-window-content">
                                            <div className="section-head">
                                                <h3>빠른 작업</h3>
                                            </div>

                                            <div className="cards-6 big">
                                                <FeatureCard
                                                    emoji="🏠" accent="violet"
                                                    title="메인페이지" subtitle="시작 화면으로 이동"
                                                    onClick={() => setActiveSection("main")}
                                                />
                                                <FeatureCard
                                                    emoji="🟩" accent="mint"
                                                    title="구글 드라이브" subtitle="파일 불러오기"
                                                    onClick={() => showSection("drive")}
                                                />
                                                <FeatureCard
                                                    emoji="🏫" accent="amber"
                                                    title="학교 포털" subtitle="학사 정보 확인"
                                                    onClick={() => showSection("portal")}
                                                />
                                                <FeatureCard
                                                    emoji="📑" accent="pink"
                                                    title="PPT 제작" subtitle="포트폴리오 만들기"
                                                    onClick={() => showSection("pptMaker")}
                                                />
                                                <FeatureCard
                                                    emoji="👤" accent="blue"
                                                    title="마이페이지" subtitle="이력/기록 관리"
                                                    onClick={() => showSection("myPage")}
                                                />
                                                <FeatureCard
                                                    emoji="➕" accent="lime"
                                                    title="이력 등록" subtitle="새로운 경험을 추가"
                                                    onClick={showAddExperienceModal}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PPT 제작 섹션 */}
                            {activeSection === "pptMaker" && (
                                <div id="pptMakerSection" className="content-section">
                                    <div className="mac-window">
                                        <h2>포트폴리오 내용 선택</h2>
                                        <div className="mac-window-content">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div>
                                                    <button
                                                        className="btn btn-outline-dark me-2"
                                                        onClick={() => selectAllExperiences(true)}
                                                    >
                                                        전체 선택
                                                    </button>
                                                    <button
                                                        className="btn btn-outline-dark"
                                                        onClick={() => selectAllExperiences(false)}
                                                    >
                                                        전체 해제
                                                    </button>
                                                </div>
                                                <button
                                                    className="btn btn-dark"
                                                    id="nextButton"
                                                    disabled={selected.length === 0}
                                                >
                                                    다음
                                                </button>
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
                                                                    <p className="mb-1">
                                                                        <small>{exp.period}</small>
                                                                    </p>
                                                                    <p className="mb-0">{exp.description}</p>
                                                                </div>
                                                                <div className="form-check ms-3">
                                                                    <input
                                                                        className="form-check-input"
                                                                        type="checkbox"
                                                                        checked={selected.includes(idx)}
                                                                        onChange={() => toggleSelect(idx)}
                                                                    />
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
                            {activeSection === "drive" && (
                                <div id="driveSection" className="content-section">
                                    <div className="mac-window">
                                        <h2>구글 드라이브</h2>
                                        <div className="mac-window-content text-center p-5">
                                            <i className="fab fa-google-drive fa-3x mb-3 text-primary"></i>
                                            <h3 className="mb-3">구글 드라이브로 이동</h3>
                                            <p className="mb-4">구글 드라이브에서 파일을 관리하세요.</p>
                                            <a
                                                href="https://drive.google.com"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-primary"
                                            >
                                                구글 드라이브 열기
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 학교 포털 섹션 */}
                            {activeSection === "portal" && (
                                <div id="portalSection" className="content-section">
                                    <div className="mac-window">
                                        <h2>학교 포털</h2>
                                        <div className="mac-window-content text-center p-5">
                                            <i className="fas fa-university fa-3x mb-3 text-primary"></i>
                                            <h3 className="mb-3">학교 포털로 이동</h3>
                                            <p className="mb-4">학교 포털에서 학사 정보를 확인하세요.</p>
                                            <a href="#" className="btn btn-primary">
                                                학교 포털 열기
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 마이페이지 섹션 */}
                            {activeSection === "myPage" && (
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
                                                                    <p className="mb-0">
                                                                        <small>{exp.period}</small>
                                                                    </p>
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

                    {/* 스타일 스위처(고정 위치) */}
                    <div className="style-switcher">
                        <button
                            className="sw-btn"
                            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                        >
                            {theme === "dark" ? "🌙" : "☀︎"}
                        </button>

                        <div className="sw-pals">
                            <button
                                className={`sw-dot sw-dot--aurora ${palette === "aurora" ? "is-active" : ""}`}
                                title="Aurora"
                                onClick={() => setPalette("aurora")}
                            />
                            <button
                                className={`sw-dot sw-dot--plum ${palette === "plum" ? "is-active" : ""}`}
                                title="Plum"
                                onClick={() => setPalette("plum")}
                            />
                            <button
                                className={`sw-dot sw-dot--sunset ${palette === "sunset" ? "is-active" : ""}`}
                                title="Sunset"
                                onClick={() => setPalette("sunset")}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 이력 추가 모달 */}
            {showModal && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
                    tabIndex="-1"
                >
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
                                        <input
                                            type="text"
                                            className="form-control"
                                            required
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">기간</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="예: 2023.03 - 2023.12"
                                            required
                                            value={form.period}
                                            onChange={(e) => setForm({ ...form, period: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">설명</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            required
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        취소
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        저장
                                    </button>
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
