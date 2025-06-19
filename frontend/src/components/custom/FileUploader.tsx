import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, FileAudio, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

// Constants for validation
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
const SUPPORTED_TYPES = [
  "audio/flac",
  "audio/mpeg", // mp3
  "video/mp4", // mp4 (audio track)
  "audio/mp4", // m4a
  "video/mpeg", // mpeg
  "audio/mpga", // mpga
  "audio/ogg", // ogg
  "audio/wav", // wav
  "audio/webm", // webm
  "audio/x-flac", // alternative flac mime type
  "audio/x-wav", // alternative wav mime type
  "audio/x-m4a", // alternative m4a mime type
];

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

// Utility functions moved outside component to avoid dependency issues
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const validateFile = (file: File): string | null => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File size must be less than 25MB. Current file is ${formatFileSize(
      file.size
    )}.`;
  }

  // Check file type by MIME type
  if (!SUPPORTED_TYPES.includes(file.type)) {
    // If MIME type check fails, check by file extension as fallback
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !SUPPORTED_EXTENSIONS.includes(extension)) {
      return `Unsupported file type. Please use: ${SUPPORTED_EXTENSIONS.join(
        ", "
      )}.`;
    }
  }

  return null;
};

export const FileUploader = ({
  onFileSelect,
  selectedFile,
  disabled = false,
}: FileUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedFile && fileInputRef.current) {
      fileInputRef.current.value = "";
      setValidationError(null);
    }
  }, [selectedFile]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const audioFile = files[0]; // Take the first file

      if (audioFile) {
        const error = validateFile(audioFile);
        if (error) {
          setValidationError(error);
          onFileSelect(null);
        } else {
          setValidationError(null);
          onFileSelect(audioFile);
        }
      }
    },
    [onFileSelect, disabled]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const error = validateFile(file);
        if (error) {
          setValidationError(error);
          onFileSelect(null);
          // Clear the input value so user can try again
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          setValidationError(null);
          onFileSelect(file);
        }
      }
    },
    [onFileSelect]
  );

  const triggerFileSelect = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleClearFile = () => {
    onFileSelect(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <Label htmlFor="file-upload" className="block text-sm font-medium mb-2">
        Audio File
      </Label>

      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all duration-200",
          isDragOver && !disabled
            ? "border-primary bg-primary/5"
            : validationError
            ? "border-red-500 bg-red-50/50"
            : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
          selectedFile &&
            !validationError &&
            "border-solid border-primary bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
          id="file-upload"
        />

        <div className="flex flex-col items-center text-center">
          {selectedFile && !validationError ? (
            <>
              <FileAudio className="h-12 w-12 text-primary mb-4" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFile}
                disabled={disabled}
                className="mt-3"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </>
          ) : (
            <div
              className="flex flex-col items-center cursor-pointer hover:text-primary transition-colors"
              onClick={triggerFileSelect}
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  {SUPPORTED_EXTENSIONS.join(", ")} (Max 25MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}
    </div>
  );
};
