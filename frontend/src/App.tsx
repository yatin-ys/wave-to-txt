import React, { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import apiClient from "./api/client";
import axios from "axios";
import Header from "./components/Header";
import FileUpload from "./components/FileUpload";
import TranscriptResult from "./components/TranscriptResult";
import LoadingSpinner from "./components/LoadingSpinner";
import "./App.css";

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setTranscript(null);
      setError(null);
      setTaskId(null); // Reset task on new file selection
    }
  };

  useEffect(() => {
    // Only poll if we have a taskId and are in a loading state.
    if (!taskId || !isLoading) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const response = await apiClient.get(`/transcribe/status/${taskId}`);
        const { status, transcript, error: taskError } = response.data;

        if (status === "completed") {
          setTranscript(transcript);
          setError(null);
          setIsLoading(false);
          setTaskId(null); // Clear task ID to stop polling
        } else if (status === "failed") {
          setError(taskError || "The transcription task failed.");
          setTranscript(null);
          setIsLoading(false);
          setTaskId(null); // Clear task ID to stop polling
        }
        // If status is 'pending', we do nothing and let the interval check again.
      } catch (err) {
        let errorMessage = "Error checking transcription status.";
        if (axios.isAxiosError(err)) {
          errorMessage = err.response?.data?.detail || err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setIsLoading(false);
        setTaskId(null); // Stop polling on error
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup function to clear the interval.
    return () => {
      clearInterval(intervalId);
    };
  }, [taskId, isLoading]); // Dependencies for the effect

  const handleTranscribe = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select an audio file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setTranscript(null);
    setTaskId(null); // Clear any previous task

    const formData = new FormData();
    formData.append("audio_file", selectedFile);

    try {
      // This request now returns a task_id immediately
      const response = await apiClient.post("/transcribe", formData);
      setTaskId(response.data.task_id);
    } catch (err) {
      let errorMessage = "An unexpected error occurred.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(`Failed to start transcription: ${errorMessage}`);
      setIsLoading(false); // Stop loading if the initial request fails
    }
  };

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <div className="container">
          <div className="content-section">
            <div className="intro-text">
              <h2>Transform Audio to Text</h2>
            </div>

            <form onSubmit={handleTranscribe} className="transcription-form">
              <FileUpload
                selectedFile={selectedFile}
                onFileChange={handleFileChange}
                isLoading={isLoading}
              />

              <div className="form-actions">
                <button
                  type="submit"
                  className="transcribe-button"
                  disabled={isLoading || !selectedFile}
                >
                  {isLoading ? (
                    <>
                      <div className="button-spinner"></div>
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2L2 7L12 12L22 7L12 2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 17L12 22L22 17"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M2 12L12 17L22 12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Start Transcription
                    </>
                  )}
                </button>
              </div>
            </form>

            {isLoading && <LoadingSpinner />}

            <TranscriptResult transcript={transcript} error={error} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
