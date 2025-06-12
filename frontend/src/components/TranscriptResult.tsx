import React from 'react';
import './TranscriptResult.css';

interface TranscriptResultProps {
  transcript: string;
  error: string | null;
}

const TranscriptResult: React.FC<TranscriptResultProps> = ({ transcript, error }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (error) {
    return (
      <div className="result-container error">
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

  if (!transcript) {
    return null;
  }

  return (
    <div className="result-container success">
      <div className="result-header">
        <h3>Transcript</h3>
        <button className="copy-button" onClick={copyToClipboard}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Copy
        </button>
      </div>
      <div className="transcript-content">
        <textarea
          readOnly
          value={transcript}
          className="transcript-textarea"
          placeholder="Your transcription will appear here..."
        />
      </div>
    </div>
  );
};

export default TranscriptResult;