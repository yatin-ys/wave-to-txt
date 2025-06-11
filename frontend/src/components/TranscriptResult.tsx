import React from 'react';

interface TranscriptResultProps {
  transcript: string | null;
  error: string | null;
}

const TranscriptResult: React.FC<TranscriptResultProps> = ({ transcript, error }) => {
  if (error) {
    return (
      <div className="result-container error-container">
        <div className="error-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <div className="error-content">
          <h3>Transcription Failed</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (transcript) {
    return (
      <div className="result-container success-container">
        <div className="result-header">
          <div className="success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h3>Transcription Complete</h3>
        </div>
        <div className="transcript-content">
          <textarea
            readOnly
            value={transcript}
            className="transcript-textarea"
            placeholder="Your transcription will appear here..."
          />
          <div className="transcript-actions">
            <button
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(transcript)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              Copy Text
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TranscriptResult;