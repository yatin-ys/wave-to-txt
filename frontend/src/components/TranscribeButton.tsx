import React from 'react';
import './TranscribeButton.css';

interface TranscribeButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
}

const TranscribeButton: React.FC<TranscribeButtonProps> = ({ onClick, isLoading, disabled }) => {
  return (
    <button 
      className={`transcribe-button ${isLoading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {isLoading ? (
        <div className="button-content">
          <div className="loading-spinner"></div>
          <span>Transcribing...</span>
        </div>
      ) : (
        <span>Transcribe Audio</span>
      )}
    </button>
  );
};

export default TranscribeButton;