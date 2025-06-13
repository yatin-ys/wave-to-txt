// frontend/src/components/Header.tsx
import React from "react";
import DarkModeToggle from "./DarkModeToggle";
import { useDarkMode } from "../hooks/useDarkMode";
import "./Header.css"; // <-- Add this import

const Header: React.FC = () => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-section">
          <div className="logo-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 12C8 10.8954 8.89543 10 10 10H22C23.1046 10 24 10.8954 24 12V20C24 21.1046 23.1046 22 22 22H10C8.89543 22 8 21.1046 8 20V12Z"
                fill="url(#gradient1)"
              />
              <path
                d="M6 8C6 6.89543 6.89543 6 8 6H24C25.1046 6 26 6.89543 26 8V24C26 25.1046 25.1046 26 24 26H8C6.89543 26 6 25.1046 6 24V8Z"
                stroke="url(#gradient2)"
                strokeWidth="2"
                fill="none"
              />
              <defs>
                <linearGradient
                  id="gradient1"
                  x1="8"
                  y1="10"
                  x2="24"
                  y2="22"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#6366F1" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient
                  id="gradient2"
                  x1="6"
                  y1="6"
                  x2="26"
                  y2="26"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#6366F1" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="logo-text">WaveToTxt</h1>
        </div>
        <div className="header-right">
          <DarkModeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
        </div>
      </div>
    </header>
  );
};

export default Header;
