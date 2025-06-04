"use client";

import React, { useState } from "react";
import { AudioUploadForm } from "@/components/audio-upload-form";
import { Loader2, AlertTriangle } from "lucide-react";

const SUPPORTED_AUDIO_EXTENSIONS_ARRAY =
  ".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm".split(",");
const MAX_FILE_SIZE_MB = 25;

export default function HomePage() {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );
  const [isTranscriptionLoading, setIsTranscriptionLoading] = useState(false);

  const handleStartTranscription = async (file: File) => {
    setIsTranscriptionLoading(true);
    setTranscription(null);
    setTranscriptionError(null);

    console.log(
      "Frontend: Starting transcription for file:",
      file.name,
      file.type,
      file.size
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-large-v3-turbo"); // Or make this configurable

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      setTranscription(result.transcriptionText);
      console.log(
        "Frontend: Transcription successful",
        result.transcriptionText
      );
    } catch (error) {
      console.error("Frontend: Transcription failed:", error);
      setTranscriptionError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred during transcription."
      );
    } finally {
      setIsTranscriptionLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-10">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-3">
          Audio to Text Transcription
        </h2>
        <p className="text-lg text-muted-foreground">
          Upload your audio file. Supported formats:{" "}
          {SUPPORTED_AUDIO_EXTENSIONS_ARRAY.join(", ").toUpperCase()}. Max{" "}
          {MAX_FILE_SIZE_MB}MB.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Powered by Groq Whisper API.
        </p>
      </div>

      <AudioUploadForm
        onStartTranscription={handleStartTranscription}
        isTranscriptionLoading={isTranscriptionLoading}
      />

      {isTranscriptionLoading && (
        <div className="mt-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">
            Processing your audio, please wait...
          </p>
        </div>
      )}

      {transcriptionError && !isTranscriptionLoading && (
        <div
          role="alert"
          className="mt-8 flex items-start p-4 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/30"
        >
          <AlertTriangle
            className="h-5 w-5 mr-3 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <strong className="font-semibold">Transcription Error:</strong>
            <p>{transcriptionError}</p>
          </div>
        </div>
      )}

      {transcription && !isTranscriptionLoading && (
        <div className="mt-10 p-6 bg-card rounded-xl shadow-xl">
          <h3 className="text-2xl font-semibold mb-4 text-primary">
            Transcription Result:
          </h3>
          <pre className="whitespace-pre-wrap bg-muted/50 p-4 rounded-md text-sm leading-relaxed font-mono">
            {transcription}
          </pre>
        </div>
      )}
    </div>
  );
}
