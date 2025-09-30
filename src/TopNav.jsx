// src/TopNav.jsx
import React from "react";

export default function TopNav({ items = [], active, onSelect, onLogout }) {
    const MENU = items.length
        ? items
        : [
            { id: "main", label: "메인", icon: "fas fa-home" },
            { id: "drive", label: "구글 드라이브", icon: "fab fa-google-drive" },
            { id: "portal", label: "학교 포털", icon: "fas fa-university" },
            { id: "pptMaker", label: "PPT 제작", icon: "fas fa-file-powerpoint" },
            { id: "myPage", label: "마이페이지", icon: "fas fa-user" },
        ];

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

            <button className="btn-logout" onClick={onLogout} aria-label="로그아웃">
                <i className="fas fa-arrow-right-from-bracket" aria-hidden="true"></i>
            </button>
        </header>
    );
}