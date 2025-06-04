"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, FileAudio, Loader2 } from "lucide-react";

// Supported file types and size limit from context
const SUPPORTED_AUDIO_EXTENSIONS_STRING =
  ".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm";
const SUPPORTED_AUDIO_EXTENSIONS_ARRAY =
  SUPPORTED_AUDIO_EXTENSIONS_STRING.split(",");

const SUPPORTED_MIME_TYPES = [
  "audio/flac",
  "audio/mpeg", // .mp3, .mpeg, .mpga
  "audio/mp4", // .mp4 (audio part), .m4a
  "video/mp4", // .mp4 (if it's a video file, API will extract audio)
  "audio/ogg",
  "video/ogg", // .ogg (if it's a video file)
  "application/ogg", // .ogg (sometimes used as generic ogg container)
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "video/webm", // .webm (if it's a video file)
  "audio/x-m4a", // another common MIME for .m4a
];

const MAX_FILE_SIZE_MB = 25; // As per Groq free tier
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface AudioUploadFormProps {
  onStartTranscription: (file: File) => Promise<void>;
  isTranscriptionLoading: boolean;
}

export function AudioUploadForm({
  onStartTranscription,
  isTranscriptionLoading,
}: AudioUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      setSelectedFile(null);
      setFileError(null);

      if (file) {
        const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!SUPPORTED_AUDIO_EXTENSIONS_ARRAY.includes(fileExtension)) {
          setFileError(
            `Invalid file type. Supported extensions: ${SUPPORTED_AUDIO_EXTENSIONS_ARRAY.join(
              ", "
            )}`
          );
          event.target.value = "";
          return;
        }

        if (
          file.type &&
          !SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())
        ) {
          console.warn(
            `File MIME type "${file.type}" is not in the explicit supported list, but proceeding due to extension match. API will be the final judge.`
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          setFileError(
            `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(
              file.size /
              1024 /
              1024
            ).toFixed(2)}MB.`
          );
          event.target.value = "";
          return;
        }
        setSelectedFile(file);
      }
    },
    []
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setFileError("Please select a file first.");
      return;
    }
    if (fileError) {
      // Prevent submission if there's a known file error
      return;
    }
    await onStartTranscription(selectedFile);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-card p-6 sm:p-8 rounded-xl shadow-xl"
    >
      <div>
        <label
          htmlFor="audioFile"
          className="block text-sm font-medium text-foreground mb-2 sr-only"
        >
          Choose audio file
        </label>
        <Input
          id="audioFile"
          name="audioFile"
          type="file"
          onChange={handleFileChange}
          accept={SUPPORTED_AUDIO_EXTENSIONS_STRING}
          className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          aria-describedby="file_input_help"
          disabled={isTranscriptionLoading}
        />
        <p className="mt-1 text-xs text-muted-foreground" id="file_input_help">
          {SUPPORTED_AUDIO_EXTENSIONS_ARRAY.join(", ").toUpperCase()}. Max{" "}
          {MAX_FILE_SIZE_MB}MB.
        </p>
      </div>

      {fileError && (
        <div
          role="alert"
          className="flex items-center p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/30"
        >
          <AlertCircle className="h-5 w-5 mr-2 shrink-0" aria-hidden="true" />
          <span>{fileError}</span>
        </div>
      )}

      {selectedFile && !fileError && (
        <div
          role="status"
          className="flex items-start p-3 text-sm text-green-700 dark:text-green-300 bg-green-500/10 rounded-md border border-green-500/30"
        >
          <CheckCircle2
            className="h-5 w-5 mr-2 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">
              File ready:{" "}
              <span className="font-normal">{selectedFile.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Type: {selectedFile.type || "N/A"}, Size:{" "}
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!selectedFile || !!fileError || isTranscriptionLoading}
        className="w-full text-base py-3"
        size="lg"
      >
        {isTranscriptionLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Transcribing...
          </>
        ) : (
          <>
            <FileAudio className="mr-2 h-5 w-5" />
            Transcribe Audio
          </>
        )}
      </Button>
    </form>
  );
}
