import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <div className="loading-text">
        <h3>Transcribing Audio</h3>
        <p>Please wait while we process your file...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;