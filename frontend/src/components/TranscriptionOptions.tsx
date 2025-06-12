import React from 'react';
import './TranscriptionOptions.css';

interface TranscriptionOptionsProps {
  diarization: boolean;
  onDiarizationChange: (enabled: boolean) => void;
}

const TranscriptionOptions: React.FC<TranscriptionOptionsProps> = ({
  diarization,
  onDiarizationChange,
}) => {
  return (
    <div className="transcription-options">
      <div className="option-item">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={diarization}
            onChange={(e) => onDiarizationChange(e.target.checked)}
            className="toggle-input"
          />
          <div className="toggle-slider">
            <div className="toggle-thumb"></div>
          </div>
          <div className="option-info">
            <span className="option-title">Speaker Diarization</span>
            <span className="option-description">Identify different speakers in the audio</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default TranscriptionOptions;