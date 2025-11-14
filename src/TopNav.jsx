// src/TopNav.jsx
import React from "react";
import { NAV_ITEMS } from "./App";

export default function TopNav({ items = [], active, onSelect, onLogout, isDarkMode, onToggleTheme }) {
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

            <div className="top-actions">
                <button 
                    className="btn-theme-toggle" 
                    onClick={onToggleTheme}
                    aria-label={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
                    title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
                >
                    {isDarkMode ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    )}
                </button>
                <a
                    href="https://www.yuhan.ac.kr/index.do"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-portal btn-logout"
                    aria-label="학교 홈페이지 바로가기"
                    title="학교 홈페이지 바로가기"
                >
                    <i className="fas fa-university" aria-hidden="true"></i>
                    <span className="portal-text">학교 홈페이지</span>
                </a>
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
                <button className="btn-logout" onClick={onLogout} aria-label="로그아웃">
                    <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                    <span className="logout-text">로그아웃</span>
                </button>
            </div>
        </header>
    );
}
