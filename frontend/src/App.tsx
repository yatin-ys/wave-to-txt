import React, { useState } from "react";
import type { FormEvent } from "react";
import apiClient from "./api/client";
import axios from "axios";

// Components
import Header from "./components/Header";
import FileUpload from "./components/FileUpload";
import TranscriptionOptions from "./components/TranscriptionOptions";
import TranscribeButton from "./components/TranscribeButton";
import TranscriptResult from "./components/TranscriptResult";

import "./App.css";

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [diarization, setDiarization] = useState<boolean>(false);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setTranscript(null);
    setError(null);
  };

  const handleTranscribe = async (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    if (!selectedFile) {
      setError("Please select an audio file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranscript(null);

    const formData = new FormData();
    formData.append("audio_file", selectedFile);

    try {
      const response = await apiClient.post("/transcribe", formData);
      setTranscript(response.data.transcript);
    } catch (err) {
      let errorMessage = "An unexpected error occurred.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(`Failed to transcribe: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <div className="hero-section">
          <h1 className="hero-title">
            Transform Audio to <span className="hero-highlight">Text</span>
          </h1>
        </div>

        <div className="transcription-container">
          <FileUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            isLoading={isLoading}
          />

          <TranscriptionOptions
            diarization={diarization}
            onDiarizationChange={setDiarization}
          />

          <TranscribeButton
            onClick={handleTranscribe}
            isLoading={isLoading}
            disabled={!selectedFile}
          />

          <TranscriptResult transcript={transcript} error={error} />
        </div>
      </main>
    </div>
  );
};

export default App;