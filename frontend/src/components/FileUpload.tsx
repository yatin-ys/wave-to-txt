import React from 'react';
import type { ChangeEvent } from 'react';

interface FileUploadProps {
  selectedFile: File | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ selectedFile, onFileChange, isLoading }) => {
  return (
    <div className="file-upload-container">
      <div className="file-upload-area">
        <input
          id="audio-upload"
          type="file"
          accept="audio/*"
          onChange={onFileChange}
          className="file-input"
          disabled={isLoading}
        />
        <label htmlFor="audio-upload" className="file-upload-label">
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 10L12 5L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 5V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="upload-text">
            <h3>{selectedFile ? selectedFile.name : 'Choose audio file'}</h3>
            <p>Drag and drop or click to browse</p>
            <span className="file-types">Supports MP3, WAV, M4A, and more <br /> Upto 25 MB</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default FileUpload;