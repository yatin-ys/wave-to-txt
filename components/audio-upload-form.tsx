"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, FileAudio, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPPORTED_AUDIO_EXTENSIONS_STRING = ".flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm";
const SUPPORTED_AUDIO_EXTENSIONS_ARRAY = SUPPORTED_AUDIO_EXTENSIONS_STRING.split(",");

const SUPPORTED_MIME_TYPES = [
  "audio/flac",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
  "audio/ogg",
  "video/ogg",
  "application/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "video/webm",
  "audio/x-m4a",
];

const MAX_FILE_SIZE_MB = 25;
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
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!SUPPORTED_AUDIO_EXTENSIONS_ARRAY.includes(fileExtension)) {
      return `Invalid file type. Supported extensions: ${SUPPORTED_AUDIO_EXTENSIONS_ARRAY.join(", ")}`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(
        file.size /
        1024 /
        1024
      ).toFixed(2)}MB.`;
    }

    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    setFileError(error);
    setSelectedFile(error ? null : file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      setFileError("Please select a file first.");
      return;
    }
    if (fileError) return;
    await onStartTranscription(selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={cn(
          "relative group rounded-lg border-2 border-dashed transition-all duration-300",
          "bg-muted/50 hover:bg-muted/70",
          isDragging && "border-primary bg-primary/5",
          "focus-within:border-primary focus-within:bg-primary/5"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          id="audioFile"
          name="audioFile"
          type="file"
          onChange={handleFileChange}
          accept={SUPPORTED_AUDIO_EXTENSIONS_STRING}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-describedby="file_input_help"
          disabled={isTranscriptionLoading}
        />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Upload
            className={cn(
              "h-10 w-10 mb-4 transition-transform duration-300",
              "text-muted-foreground group-hover:text-primary",
              isDragging && "text-primary scale-110",
              "group-focus-within:text-primary group-focus-within:scale-110"
            )}
          />
          <p className="text-lg font-medium mb-2">
            Drop your audio file here or click to upload
          </p>
          <p className="text-sm text-muted-foreground">
            Supported formats: {SUPPORTED_AUDIO_EXTENSIONS_ARRAY.join(", ").toUpperCase()}
          </p>
          <p className="text-sm text-muted-foreground">
            Maximum file size: {MAX_FILE_SIZE_MB}MB
          </p>
        </div>
      </div>

      {fileError && (
        <div
          role="alert"
          className="flex items-center p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/30 animate-fade-in"
        >
          <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {selectedFile && !fileError && (
        <div
          role="status"
          className="flex items-start p-4 text-sm text-green-700 dark:text-green-300 bg-green-500/10 rounded-lg border border-green-500/30 animate-fade-in"
        >
          <CheckCircle2 className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              File ready: <span className="font-normal">{selectedFile.name}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Type: {selectedFile.type || "N/A"}, Size:{" "}
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={!selectedFile || !!fileError || isTranscriptionLoading}
        className="w-full text-base py-6 transition-all duration-300 animate-fade-in"
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