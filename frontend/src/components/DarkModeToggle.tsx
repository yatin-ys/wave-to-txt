// frontend/src/components/DarkModeToggle.tsx
import React from "react";
import "./DarkModeToggle.css"; // <-- Add this import

interface DarkModeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  isDarkMode,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      className="dark-mode-toggle"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="toggle-track">
        <div className="toggle-thumb">
          {isDarkMode ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="5" fill="currentColor" />
              <line
                x1="12"
                y1="1"
                x2="12"
                y2="3"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="12"
                y1="21"
                x2="12"
                y2="23"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="4.22"
                y1="4.22"
                x2="5.64"
                y2="5.64"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="18.36"
                y1="18.36"
                x2="19.78"
                y2="19.78"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="1"
                y1="12"
                x2="3"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="21"
                y1="12"
                x2="23"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="4.22"
                y1="19.78"
                x2="5.64"
                y2="18.36"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="18.36"
                y1="5.64"
                x2="19.78"
                y2="4.22"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
};

export default DarkModeToggle;
