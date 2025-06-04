"use client";

import React, { useState } from "react";
import { AudioUploadForm } from "@/components/audio-upload-form";
import { Loader2, AlertTriangle } from "lucide-react";

const SUPPORTED_AUDIO_EXTENSIONS_ARRAY = ".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm".split(",");
const MAX_FILE_SIZE_MB = 25;

export default function HomePage() {
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isTranscriptionLoading, setIsTranscriptionLoading] = useState(false);

  const handleStartTranscription = async (file: File) => {
    setIsTranscriptionLoading(true);
    setTranscription(null);
    setTranscriptionError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-large-v3-turbo");

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
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <main className="flex-grow container mx-auto max-w-[800px] px-4 py-8 animate-fade-in">
        <div className="space-y-8">
          <AudioUploadForm
            onStartTranscription={handleStartTranscription}
            isTranscriptionLoading={isTranscriptionLoading}
          />

          {isTranscriptionLoading && (
            <div className="flex flex-col items-center justify-center p-8 animate-fade-in">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">
                Transcribing your audio...
              </p>
            </div>
          )}

          {transcriptionError && !isTranscriptionLoading && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/30 animate-fade-in"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="font-medium">Transcription failed</p>
              </div>
              <p className="mt-2 text-sm">{transcriptionError}</p>
            </div>
          )}

          {transcription && !isTranscriptionLoading && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold mb-4">Transcription Result</h2>
              <div className="bg-card border rounded-lg p-4 h-[300px] overflow-y-auto">
                <p className="whitespace-pre-wrap text-card-foreground">
                  {transcription}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 border-t bg-background/80 backdrop-blur-sm fixed bottom-0 w-full">
        <div className="container mx-auto max-w-[800px] px-4 text-center text-sm text-muted-foreground">
          Powered by Groq Whisper API
        </div>
      </footer>
    </div>
  );
}