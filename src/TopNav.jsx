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

            {/* 2. 학교 포털 버튼을 먼저 배치합니다 (기존 로그아웃 디자인 사용) */}
            <div className="top-actions">

                {/* 기존 로그아웃 디자인과 클래스를 그대로 사용하여 학교 포털 버튼 구현 */}
                <button
                    className="btn-portal btn-logout" // 기존 로그아웃 스타일을 그대로 사용
                    onClick={onPortalClick}             // 클릭 시 portal로 이동
                    aria-label="학교 포털 바로가기"
                    title="학교 포털 바로가기"
                >
                    {/* 기존 로그아웃 아이콘(fa-sign-out-alt) 대신 학교 아이콘 사용 */}
                    <i className="fas fa-university" aria-hidden="true"></i>

                    {/* 로그아웃 텍스트 대신 '학교 포털' 텍스트 사용 */}
                    <span className="portal-text">학교 포털</span>
                </button>

                {/* 3. 원래의 로그아웃 버튼 */}
                <button className="btn-logout" onClick={onLogout} aria-label="로그아웃">
                    <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                    <span className="logout-text">로그아웃</span>
                </button>
            </div>

        </header>
    );
}