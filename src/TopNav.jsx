// src/TopNav.jsx
import React from "react";
import { NAV_ITEMS } from "./App";

// 1. App.js에서 전달하는 onPortalClick prop을 받습니다.
export default function TopNav({ items = [], active, onSelect, onLogout, onPortalClick }) {
    const MENU = items.length ? items : NAV_ITEMS;

    return (
        <header className="mac-titlebar is-minimal">
            <button
                className="brand-logo"
                onClick={() => onSelect("main")}
                aria-label="메인으로"
            >
                Portra
            </button>

            <nav className="mac-nav" role="navigation" aria-label="주요 메뉴">
                {MENU.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-link ${active === item.id ? "is-active" : ""}`}
                        onClick={() => onSelect(item.id)}
                        aria-current={active === item.id ? "page" : undefined}
                    >
                        <i className={item.icon} aria-hidden="true" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* <div className="top-actions">가 여기서 시작하여 두 버튼을 모두 감쌉니다. */}
            <div className="top-actions">

                <a
                    href="https://www.yuhan.ac.kr/index.do"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-portal btn-logout"
                    aria-label="학교 포털 바로가기"
                    title="학교 포털 바로가기"
                >
                    <i className="fas fa-university" aria-hidden="true"></i>
                    <span className="portal-text">학교 홈페이지</span>
                </a>
                {/* 학교 포털 링크 (수정된 <a> 태그) */}
                <a
                    href="https://portal.yuhan.ac.kr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-portal btn-logout"
                    aria-label="학교 포털 바로가기"
                    title="학교 포털 바로가기"
                >
                    <i className="fas fa-university" aria-hidden="true"></i>
                    <span className="portal-text">학교 포털</span>
                </a>

                {/* 3. 원래의 로그아웃 버튼 */}
                <button className="btn-logout" onClick={onLogout} aria-label="로그아웃">
                    <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                    <span className="logout-text">로그아웃</span>
                </button>
            </div> {/* 👈 top-actions <div>를 여기서 닫습니다. (불필요한 </div> 제거) */}

        </header>
    );
}