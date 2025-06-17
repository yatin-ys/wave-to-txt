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

// Define the structure for a single utterance
interface Utterance {
  speaker: string | null;
  text: string;
}

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [utterances, setUtterances] = useState<Utterance[] | null>(null); // Changed from transcript
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isDiarizationEnabled, setIsDiarizationEnabled] = useState(false); // New state for the toggle

  useEffect(() => {
    if (!taskId) {
      return;
    }

    const eventSource = new EventSource(
      `${apiClient.defaults.baseURL}/transcribe/stream-status/${taskId}`
    );

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      // Updated to handle the new `utterances` field
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
    // Clear previous state on new file selection
    setUtterances(null);
    setError(null);
    setTaskId(null);
    setIsLoading(false);
    setSelectedFile(null); // Clear previous file first

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

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

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size cannot exceed ${MAX_FILE_SIZE_MB} MB.`);
      event.target.value = "";
      return;
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!fileExtension || !SUPPORTED_EXTENSIONS.includes(fileExtension)) {
      setError(
        `Unsupported file type. Supported types: ${SUPPORTED_EXTENSIONS.join(
          ", "
        )}.`
      );
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
    // Append the diarization flag
    formData.append("enable_diarization", String(isDiarizationEnabled));

    try {
      const response = await apiClient.post("/transcribe", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
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

              {/* Diarization Toggle Switch */}
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

            {isLoading && <LoadingSpinner />}

            {/* Pass the new `utterances` state to the result component */}
            <TranscriptResult utterances={utterances} error={error} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
