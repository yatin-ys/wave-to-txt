import React, { useState, useEffect, useRef } from "react";
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

  // Use a ref to hold the EventSource instance.
  // This avoids issues with stale state in closures.
  const eventSourceRef = useRef<EventSource | null>(null);

  // This effect runs only once on component mount and cleans up on unmount.
  useEffect(() => {
    // The returned function is the cleanup function.
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount/unmount.

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setTranscript(null);
      setError(null);
      // Close any existing connection when a new file is selected.
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  const handleTranscribe = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Please select an audio file first.");
      return;
    }

    // Close any previous connection before starting a new one.
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    setError(null);
    setTranscript(null);

    const formData = new FormData();
    formData.append("audio_file", selectedFile);

    try {
      // This request returns a task_id immediately.
      const response = await apiClient.post("/transcribe", formData);
      const newTaskId = response.data.task_id;

      // Use the newTaskId immediately to create the EventSource connection.
      const eventSource = new EventSource(
        `${apiClient.defaults.baseURL}/transcribe/stream-status/${newTaskId}`
      );

      // Store the instance in the ref.
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        const { status, transcript, error: taskError } = data;

        if (status === "completed") {
          setTranscript(transcript);
          setError(null);
          setIsLoading(false);
          eventSource.close();
        } else if (status === "failed") {
          setError(taskError || "The transcription task failed.");
          setTranscript(null);
          setIsLoading(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setError("Connection to status stream failed. Please try again.");
        setIsLoading(false);
        eventSource.close();
      };
    } catch (err) {
      let errorMessage = "An unexpected error occurred.";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(`Failed to start transcription: ${errorMessage}`);
      setIsLoading(false);
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
