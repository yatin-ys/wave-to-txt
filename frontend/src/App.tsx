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
import LoadingSpinner from "./components/LoadingSpinner";
import TranscriptEditor from "./components/TranscriptEditor"; // New import
import "./App.css";

// Define the structure for a single utterance
interface Utterance {
  speaker: string | null;
  text: string;
}

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [utterances, setUtterances] = useState<Utterance[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isDiarizationEnabled, setIsDiarizationEnabled] = useState(false);

  useEffect(() => {
    if (!taskId) {
      return;
    }

    const eventSource = new EventSource(
      `${apiClient.defaults.baseURL}/transcribe/stream-status/${taskId}`
    );

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const { status, utterances: taskUtterances, error: taskError } = data;

      if (status === "completed") {
        setUtterances(taskUtterances);
        setError(null);
        setIsLoading(false);
        setTaskId(null);
        eventSource.close();
      } else if (status === "failed") {
        setError(taskError || "The transcription task failed.");
        setUtterances(null);
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
    setUtterances(null);
    setError(null);
    setTaskId(null);
    setIsLoading(false);
    setSelectedFile(null);

    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE_MB = 25;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size cannot exceed ${MAX_FILE_SIZE_MB} MB.`);
      event.target.value = "";
      return;
    }

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
    setUtterances(null);

    const formData = new FormData();
    formData.append("audio_file", selectedFile);
    formData.append("enable_diarization", String(isDiarizationEnabled));

    try {
      const response = await apiClient.post("/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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

  const renderResults = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    if (error) {
      return (
        <div className="error-display">
          <div className="error-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="15"
                y1="9"
                x2="9"
                y2="15"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="9"
                y1="9"
                x2="15"
                y2="15"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="error-content">
            <h3>Transcription Failed</h3>
            <p>{error}</p>
          </div>
        </div>
      );
    }
    if (utterances) {
      return <TranscriptEditor utterances={utterances} />;
    }
    return null;
  };

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="container">
          {/* Left Column for Controls */}
          <div className="controls-column">
            <div className="intro-text">
              <h2>Transform Audio to Text</h2>
              <p>Upload your file and get a transcript in seconds.</p>
            </div>
            <form onSubmit={handleTranscribe} className="transcription-form">
              <FileUpload
                selectedFile={selectedFile}
                onFileChange={handleFileChange}
                isLoading={isLoading}
              />
              <div className="diarization-toggle">
                <label htmlFor="diarization-switch">
                  Enable Speaker Diarization
                </label>
                <input
                  type="checkbox"
                  id="diarization-switch"
                  checked={isDiarizationEnabled}
                  onChange={(e) => setIsDiarizationEnabled(e.target.checked)}
                  disabled={isLoading}
                />
              </div>
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
          </div>

          {/* Right Column for Results */}
          <div className="results-column">{renderResults()}</div>
        </div>
      </main>
    </div>
  );
};

export default App;
