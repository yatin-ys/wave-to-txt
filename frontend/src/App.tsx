import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import apiClient from "./api/client";
import axios from "axios";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";

const App = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      // Reset previous results when a new file is selected
      setTranscript(null);
      setError(null);
    }
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
      setTranscript(response.data.transcript);
    } catch (err) {
      // Use the axios type guard to safely check the error type, avoiding `any`.
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
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          marginBottom: "2rem",
        }}
      >
        <a href="https://vitejs.dev" target="_blank">
          <img
            src={viteLogo}
            className="logo"
            alt="Vite logo"
            style={{ height: "6em" }}
          />
        </a>
        <a href="https://react.dev" target="_blank">
          <img
            src={reactLogo}
            className="logo react"
            alt="React logo"
            style={{ height: "6em" }}
          />
        </a>
      </div>

      <h1>Wave-to-Txt</h1>
      <p style={{ color: "#aaa" }}>Powered by FastAPI, React, and Groq</p>

      <div
        className="card"
        style={{
          backgroundColor: "#1e1e1e",
          padding: "2rem",
          borderRadius: "8px",
        }}
      >
        <form onSubmit={handleTranscribe}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="audio-upload"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              Upload Audio File:
            </label>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </div>
          <button type="submit" disabled={isLoading || !selectedFile}>
            {isLoading ? "Transcribing..." : "Transcribe"}
          </button>
        </form>

        {error && (
          <div
            style={{
              color: "#ff6666",
              marginTop: "1rem",
              whiteSpace: "pre-wrap",
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {transcript && (
          <div style={{ marginTop: "2rem" }}>
            <h2>Transcript:</h2>
            <textarea
              readOnly
              value={transcript}
              style={{
                width: "100%",
                minHeight: "200px",
                marginTop: "0.5rem",
                padding: "1rem",
                backgroundColor: "#2d2d2d",
                color: "white",
                border: "1px solid #444",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
