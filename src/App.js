// src/App.js
import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import TopNav from "./TopNav";

/* 상단 네비게이션 아이템 */
const NAV_ITEMS = [
    { id: "main", label: "메인",          icon: "fas fa-home" },
    { id: "drive", label: "구글 드라이브", icon: "fab fa-google-drive" },
    { id: "portal", label: "학교 포털",     icon: "fas fa-university" },
    { id: "pptMaker", label: "PPT 제작",    icon: "fas fa-file-powerpoint" },
    { id: "myPage", label: "마이페이지",    icon: "fas fa-user" },
];

/** Apple TV+ 스타일 캐러셀 (순수 React) */
function HeroCarousel({ onSelect }) {
    const slides = [
        {
            key: "pptMaker",
            eyebrow: "Make",
            title: "포트폴리오 PPT 제작",
            subtitle: "템플릿으로 빠르게, 더 세련되게",
            cta: "지금 시작하기",
            bg: "linear-gradient(135deg,#0F1115 0%, #171B22 50%, #0E0F13 100%)",
            accent: "linear-gradient(90deg,#e2e2e2, #f5f5f5)",
        },
        {
            key: "drive",
            eyebrow: "Sync",
            title: "구글 드라이브 연동",
            subtitle: "파일 업로드부터 공유까지 한 번에",
            cta: "드라이브 열기",
            bg: "linear-gradient(135deg,#0F1115 0%, #151922 55%, #0E0F13 100%)",
            accent: "linear-gradient(90deg,#d9e2ff, #eff3ff)",
        },
        {
            key: "portal",
            eyebrow: "Campus",
            title: "학교 포털 바로가기",
            subtitle: "학사 일정과 공지 확인",
            cta: "포털로 이동",
            bg: "linear-gradient(135deg,#0F1115 0%, #161b21 50%, #0F1218 100%)",
            accent: "linear-gradient(90deg,#e9e9e9,#f7f7f7)",
        },
        {
            key: "myPage",
            eyebrow: "Profile",
            title: "마이페이지",
            subtitle: "내 기록과 제작 이력 한눈에",
            cta: "보러 가기",
            bg: "linear-gradient(135deg,#0F1115 0%, #171B22 55%, #0E0F13 100%)",
            accent: "linear-gradient(90deg,#e2e2e2, #f5f5f5)",
        },
    ];

    const [index, setIndex] = useState(0);
    const timerRef = useRef(null);

    const next = () => setIndex((p) => (p + 1) % slides.length);
    const prev = () => setIndex((p) => (p - 1 + slides.length) % slides.length);
    const goto = (i) => setIndex(i);

    const start = () => {
        if (timerRef.current) return;
        timerRef.current = setInterval(() => {
            setIndex((p) => (p + 1) % slides.length);
        }, 5500);
    };
    const stop = () => {
        if (!timerRef.current) return;
        clearInterval(timerRef.current);
        timerRef.current = null;
    };

    /* 자동 슬라이드 시작/정리 */
    useEffect(() => {
        start();
        return () => stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const slide = slides[index];

    return (
        <div
            className="hero-carousel"
            style={{
                position: "relative",
                width: "100%",
                borderRadius: 20,
                overflow: "hidden",
                background: slide.bg,
                boxShadow: "0 20px 60px rgba(0,0,0,.45)",
            }}
            onMouseEnter={stop}
            onMouseLeave={start}
        >
            <div
                className="hero-slide"
                style={{
                    minHeight: 380,
                    padding: "56px clamp(20px, 4vw, 72px)",
                    display: "grid",
                    alignItems: "center",
                    gridTemplateColumns: "1.2fr 0.8fr",
                }}
            >
                <div>
                    <div
                        style={{
                            color: "#9099A6",
                            fontSize: 14,
                            letterSpacing: ".18em",
                            textTransform: "uppercase",
                            marginBottom: 10,
                        }}
                    >
                        {slide.eyebrow}
                    </div>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: "clamp(28px, 4.2vw, 48px)",
                            lineHeight: 1.15,
                            background: slide.accent,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {slide.title}
                    </h2>
                    <p style={{ color: "#B8C0CC", marginTop: 12, fontSize: "clamp(14px, 1.8vw, 16px)" }}>
                        {slide.subtitle}
                    </p>

                    <button
                        onClick={() => onSelect(slide.key)}
                        style={{
                            marginTop: 22,
                            padding: "12px 18px",
                            borderRadius: 12,
                            background: "#ffffff",
                            color: "#0E0F13",
                            border: 0,
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 10px 24px rgba(0,0,0,.25)",
                        }}
                    >
                        {slide.cta}
                    </button>
                </div>

                <div
                    style={{
                        alignSelf: "stretch",
                        borderRadius: 16,
                        background: "rgba(255,255,255,.02)",
                        border: "1px solid rgba(255,255,255,.08)",
                        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.02)",
                        backdropFilter: "blur(6px)",
                    }}
                />
            </div>

            <button aria-label="이전" onClick={prev} style={arrowStyle("left")}>
                ‹
            </button>
            <button aria-label="다음" onClick={next} style={arrowStyle("right")}>
                ›
            </button>

            <div
                style={{
                    position: "absolute",
                    bottom: 16,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 10,
                }}
            >
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goto(i)}
                        aria-label={`슬라이드 ${i + 1}`}
                        style={{
                            width: index === i ? 18 : 8,
                            height: 8,
                            borderRadius: 999,
                            border: 0,
                            background: index === i ? "#ffffff" : "rgba(255,255,255,.35)",
                            cursor: "pointer",
                            transition: "all .25s ease",
                        }}
                    />
                ))}
            </div>

            {/* 진행 바 */}
            <div className="hero-progress">
                <span style={{ transform: `scaleX(${(index + 1) / slides.length})` }} />
            </div>
        </div>
    );
}

const arrowStyle = (side) => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 10,
    width: 44,
    height: 44,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    fontSize: 28,
    lineHeight: "40px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(0,0,0,.25)",
});

/** 메인 App */
export default function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeSection, setActiveSection] = useState("main");
    const [showModal, setShowModal] = useState(false);
    const [experiences, setExperiences] = useState([]);
    const [form, setForm] = useState({ title: "", period: "", description: "" });
    const [selected, setSelected] = useState([]);
    const formRef = useRef();

    const showSection = (section) => setActiveSection(section);

    function handleCredentialResponse() {
        setIsLoggedIn(true);
        setActiveSection("main");
    }

    function logout() {
        if (window.confirm("로그아웃 하시겠습니까?")) {
            setIsLoggedIn(false);
            setActiveSection("main");
        }
    }

    function showAddExperienceModal() {
        setShowModal(true);
    }
    function closeModal() {
        setShowModal(false);
        setForm({ title: "", period: "", description: "" });
    }
    function saveExperience(e) {
        e.preventDefault();
        if (form.title && form.period && form.description) {
            setExperiences([...experiences, { ...form }]);
            closeModal();
        }
    }
    function selectAllExperiences(select) {
        if (select) setSelected(experiences.map((_, i) => i));
        else setSelected([]);
    }
    function toggleSelect(idx) {
        setSelected(selected.includes(idx) ? selected.filter((i) => i !== idx) : [...selected, idx]);
    }

    /* 구글 로그인 버튼 렌더링 */
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
                        client_id: "315917737558-2qd5q4as4qbh03vru788h5ccrci9bbed.apps.googleusercontent.com",
                        callback: handleCredentialResponse,
                        auto_select: false,
                    });
                    window.google.accounts.id.renderButton(document.getElementById("googleSignInDiv"), {
                        theme: "outline",
                        size: "large",
                        width: 320,
                    });
                }
            };
            return () => document.body.removeChild(script);
        }
    }, [isLoggedIn]);

    /* 스크롤 시 상단바 스타일 토글 (HeroCarousel가 아닌 App에서!) */
    useEffect(() => {
        if (!isLoggedIn) return;

        const el = document.querySelector(".topnav, .mac-titlebar");
        if (!el) return;

        const onScroll = () => {
            if (window.scrollY > 8) el.classList.add("is-scrolled");
            else el.classList.remove("is-scrolled");
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [isLoggedIn]);

    return (
        <div>
            {/* 로그인 페이지 */}
            {!isLoggedIn && (
                <section id="loginPage" className="start-hero theme-apple">
                    <div className="hero-blob a" />
                    <div className="hero-blob b" />

                    <div className="hero-left">
                        <div className="brand">
                            <h1 className="brand-title">Portra</h1>
                            <p className="brand-sub">포트폴리오 메이커</p>
                        </div>

                        <ul className="feature-list">
                            <li>
                                <i className="fas fa-check-circle" />
                                간편한 이력 관리
                            </li>
                            <li>
                                <i className="fas fa-check-circle" />
                                전문적인 PPT 템플릿
                            </li>
                            <li>
                                <i className="fas fa-check-circle" />
                                구글 드라이브 연동
                            </li>
                        </ul>
                    </div>

                    <div className="hero-right">
                        <div className="login-card">
                            <h2 className="login-title">시작하기</h2>
                            <div id="googleSignInDiv" className="gsi-anchor" />
                            <p className="login-hint">
                                Google 계정으로 안전하게 로그인해
                                <br />
                                나만의 포트폴리오를 만들어 보세요.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* 앱 */}
            {isLoggedIn && (
                <div id="mainPage" className="theme-ink">
                    {/* 상단바 */}
                    <TopNav items={NAV_ITEMS} active={activeSection} onSelect={showSection} onLogout={logout} />

                    <div className="mac-container">
                        <div className="mac-content" style={{ width: "100%" }}>
                            {/* 메인(캐러셀) */}
                            {activeSection === "main" && (
                                <div className="content-section content-main">
                                    <div className="container-xl">
                                        <HeroCarousel onSelect={showSection} />
                                        <div className="mac-grid mac-grid-2">
                                            <div className="mac-card" onClick={showAddExperienceModal}>
                                                <i className="fas fa-plus-circle"></i>
                                                <h3>이력 등록</h3>
                                                <p>새로운 경험을 추가하세요</p>
                                            </div>
                                            <div className="mac-card" onClick={() => showSection("pptMaker")}>
                                                <i className="fas fa-file-powerpoint"></i>
                                                <h3>PPT 제작</h3>
                                                <p>포트폴리오 만들기</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PPT 제작 */}
                            {activeSection === "pptMaker" && (
                                <div id="pptMakerSection" className="content-section">
                                    <div className="mac-window">
                                        <h2>포트폴리오 내용 선택</h2>
                                        <div className="mac-window-content">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div>
                                                    <button className="btn btn-outline-dark me-2" onClick={() => selectAllExperiences(true)}>
                                                        전체 선택
                                                    </button>
                                                    <button className="btn btn-outline-dark" onClick={() => selectAllExperiences(false)}>
                                                        전체 해제
                                                    </button>
                                                </div>
                                                <button className="btn btn-dark" id="nextButton" disabled={selected.length === 0}>
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

                            {/* 구글 드라이브 */}
                            {activeSection === "drive" && (
                                <div id="driveSection" className="content-section">
                                    <div className="mac-window">
                                        <h2>구글 드라이브</h2>
                                        <div className="mac-window-content text-center p-5">
                                            <i className="fab fa-google-drive fa-3x mb-3 text-primary"></i>
                                            <h3 className="mb-3">구글 드라이브로 이동</h3>
                                            <p className="mb-4">구글 드라이브에서 파일을 관리하세요.</p>
                                            <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="btn btn-primary">
                                                구글 드라이브 열기
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 학교 포털 */}
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

                            {/* 마이페이지 */}
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
                </div>
            )}

            {/* 모달 */}
            {showModal && (
                <div className="modal fade show" style={{ display: "block", background: "rgba(0,0,0,0.5)" }} tabIndex="-1">
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