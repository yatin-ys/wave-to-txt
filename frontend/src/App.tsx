// frontend/src/App.tsx
import React, {
  useState,
  useEffect,
  type FormEvent,
  type ChangeEvent,
} from "react";
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

  useEffect(() => {
    if (!taskId) {
      return;
    }

    const eventSource = new EventSource(
      `${apiClient.defaults.baseURL}/transcribe/stream-status/${taskId}`
    );

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const { status, transcript: taskTranscript, error: taskError } = data;

      if (status === "completed") {
        setTranscript(taskTranscript);
        setError(null);
        setIsLoading(false);
        setTaskId(null);
        eventSource.close();
      } else if (status === "failed") {
        setError(taskError || "The transcription task failed.");
        setTranscript(null);
        setIsLoading(false);
        setTaskId(null);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setError("Connection to status stream failed. Please try again.");
      setIsLoading(false);
      setTaskId(null);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [taskId]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Clear previous state on new file selection
    setTranscript(null);
    setError(null);
    setTaskId(null);
    setIsLoading(false);
    setSelectedFile(null); // Clear previous file first

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // --- Client-Side Validation ---
    const MAX_FILE_SIZE_MB = 25;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
    const SUPPORTED_EXTENSIONS = [
      "flac",
      "mp3",
      "mp4",
      "mpeg",
      "mpga",
      "m4a",
      "ogg",
      "wav",
      "webm",
    ];

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size cannot exceed ${MAX_FILE_SIZE_MB} MB.`);
      event.target.value = ""; // Reset the file input
      return;
    }

    // 2. Validate file type based on extension
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !SUPPORTED_EXTENSIONS.includes(fileExtension)) {
      setError(
        `Unsupported file type. Supported types: ${SUPPORTED_EXTENSIONS.join(
          ", "
        )}.`
      );
      event.target.value = ""; // Reset the file input
      return;
    }
    // --- End Validation ---

    // If all checks pass, set the file
    setSelectedFile(file);
  };

  const handleTranscribe = async (event: FormEvent) => {
    event.preventDefault();

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
      setTaskId(response.data.task_id);
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

            {/* The error from validation will now also be displayed here */}
            <TranscriptResult transcript={transcript} error={error} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
