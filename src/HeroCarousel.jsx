// src/HeroCarousel.jsx
import React, { useEffect, useMemo, useState } from "react";

// 슬라이드 데이터 (그대로 사용)
const makeSlides = (onGo) => ([
    {
        id: "main",
        title: "포트폴리오를 시작하세요",
        subtitle: "경험을 기록하고 멋진 포트폴리오로 정리해요.",
        cta: { label: "이력 등록", onClick: () => onGo("main") },
        bg: "/assets/hero/hero-1.jpg",
    },
    {
        id: "pptMaker",
        title: "PPT 제작",
        subtitle: "전문 템플릿으로 몇 분만에 완성.",
        cta: { label: "PPT 만들기", onClick: () => onGo("pptMaker") },
        bg: "/assets/hero/hero-2.jpg",
    },
    {
        id: "drive",
        title: "구글 드라이브 연동",
        subtitle: "파일을 자동으로 불러오고 관리해요.",
        cta: { label: "드라이브 열기", onClick: () => onGo("drive") },
        bg: "/assets/hero/hero-3.jpg",
    },
    {
        id: "portal",
        title: "학교 포털",
        subtitle: "학사 정보와 자료를 한 곳에서.",
        cta: { label: "포털 이동", onClick: () => onGo("portal") },
        bg: "/assets/hero/hero-4.jpg",
    },
    {
        id: "myPage",
        title: "마이페이지",
        subtitle: "나의 이력과 기록을 관리해요.",
        cta: { label: "내 기록 보기", onClick: () => onGo("myPage") },
        bg: "/assets/hero/hero-5.jpg",
    },
]);

// 공통 스타일
const containerStyle = {
    position: "relative",
    width: "100%",
    minHeight: "clamp(220px, 36vh, 360px)",          // 낮고 넓게: 과하지 않게
    borderRadius: 18,
    overflow: "hidden",
    background: "#0B0F14",
    boxShadow: "0 14px 50px rgba(0,0,0,.35)",
};

const slideStyle = (img, isActive) => ({
    position: "absolute",
    inset: 0,
    backgroundImage: `url('${img}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "saturate(.96) brightness(.9)",
    opacity: isActive ? 1 : 0,
    transition: "opacity .7s ease",
    pointerEvents: isActive ? "auto" : "none",
});

const scrimStyle = {
    position: "absolute",
    inset: 0,
    background:
        "linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.35) 42%, rgba(0,0,0,.10) 70%, rgba(0,0,0,0) 100%)",
};

const contentWrapStyle = {
    position: "relative",
    zIndex: 2,
    height: "100%",
    display: "grid",
    gridTemplateColumns: "1.15fr .85fr",  // 왼쪽 카피 비중 ↑
    alignItems: "center",
    color: "#fff",
    padding: "clamp(18px, 5vw, 48px)",
    textShadow: "0 1px 2px rgba(0,0,0,.35)",
};

const titleStyle = {
    fontSize: "clamp(26px, 4.6vw, 44px)",
    fontWeight: 700,
    letterSpacing: "-.02em",
    lineHeight: 1.16,
    margin: 0,
};

const subStyle = {
    color: "rgba(255,255,255,.86)",
    margin: "10px 0 0",
    fontSize: "clamp(13px, 1.4vw, 16px)",
};

const actionsStyle = {
    display: "flex",
    gap: 10,
    marginTop: 18,
};

const ctaStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.22)",
    background: "rgba(255,255,255,.055)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    backdropFilter: "saturate(160%) blur(8px)",
    WebkitBackdropFilter: "saturate(160%) blur(8px)",
    cursor: "pointer",
};

const dotsWrapStyle = {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 14,
    display: "flex",
    gap: 8,
};

const dotStyle = (active) => ({
    width: active ? 14 : 6,
    height: 6,
    borderRadius: 999,
    border: 0,
    background: active ? "#fff" : "rgba(255,255,255,.38)",
    transition: "all .25s ease",
    cursor: "pointer",
});

const arrowStyle = (side) => ({
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 14,
    width: 36,
    height: 36,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.04)",
    color: "#fff",
    fontSize: 22,
    lineHeight: "32px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(0,0,0,.25)",
    display: "grid",
    placeItems: "center",
});

export default function HeroCarousel({ onGo }) {
    const slides = useMemo(() => makeSlides(onGo), [onGo]);
    const [idx, setIdx] = useState(0);
    const [paused, setPaused] = useState(false);

    const next = () => setIdx((p) => (p + 1) % slides.length);
    const prev = () => setIdx((p) => (p - 1 + slides.length) % slides.length);
    const goto = (i) => setIdx(i);

    // 자동 재생(호버 시 일시정지)
    useEffect(() => {
        if (paused) return;
        const t = setInterval(next, 5000);
        return () => clearInterval(t);
    }, [paused, slides.length]);

    // 키보드 ← → 이동
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "ArrowRight") next();
            if (e.key === "ArrowLeft") prev();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <section
            className="hero-carousel"
            style={containerStyle}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-roledescription="carousel"
        >
            {slides.map((s, i) => {
                const isActive = i === idx;
                return (
                    <div
                        key={s.id}
                        className={`hero-slide ${isActive ? "active" : ""}`}
                        style={slideStyle(s.bg, isActive)}
                        aria-hidden={!isActive}
                    >
                        <div style={scrimStyle} />
                        <div style={contentWrapStyle}>
                            {/* 왼쪽 카피 */}
                            <div>
                                <h1 style={titleStyle}>{s.title}</h1>
                                <p style={subStyle}>{s.subtitle}</p>
                                <div style={actionsStyle}>
                                    <button style={ctaStyle} onClick={s.cta.onClick}>
                                        {s.cta.label}
                                    </button>
                                </div>
                            </div>
                            {/* 오른쪽은 이미지 영역(비워 두어 여백/밸런스 유지) */}
                            <div />
                        </div>
                    </div>
                );
            })}

            {/* 좌우 화살표 */}
            <button
                type="button"
                aria-label="이전 슬라이드"
                onClick={prev}
                style={arrowStyle("left")}
            >
                ‹
            </button>
            <button
                type="button"
                aria-label="다음 슬라이드"
                onClick={next}
                style={arrowStyle("right")}
            >
                ›
            </button>

            {/* 인디케이터 */}
            <div style={dotsWrapStyle} aria-label="슬라이드 인디케이터">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => goto(i)}
                        aria-label={`슬라이드 ${i + 1}`}
                        style={dotStyle(i === idx)}
                    />
                ))}
            </div>
        </section>
    );
}