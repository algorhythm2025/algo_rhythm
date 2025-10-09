// src/TopNav.jsx
import React from "react";
import { NAV_ITEMS } from "./App";

export default function TopNav({ items = [], active, onSelect, onLogout }) {
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

            <button className="btn-logout" onClick={onLogout} aria-label="로그아웃">
                <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                <span className="logout-text">로그아웃</span>
            </button>
        </header>
    );
}
