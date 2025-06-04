"use client";

import React, { useState } from "react";
import { AudioUploadForm } from "@/components/audio-upload-form";
import { AlertTriangle } from "lucide-react";

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
              <h2 className="text-xl font-semibold mb-4 text-primary">Transcription Result</h2>
              <div className="relative overflow-hidden rounded-xl backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 pointer-events-none" />
                <div className="relative bg-card/50 border shadow-lg backdrop-blur-sm">
                  <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="h-[300px] overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/30">
                    <p className="whitespace-pre-wrap text-card-foreground leading-relaxed">
                      {transcription}
                    </p>
                  </div>
                </div>
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