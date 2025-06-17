import { useState, useRef, useCallback } from "react";
import { Upload, X, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export const FileUploader = ({
  onFileSelect,
  selectedFile,
  disabled = false,
}: FileUploaderProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const audioFile = files.find((file) => file.type.startsWith("audio/"));
      if (audioFile) {
        onFileSelect(audioFile);
      }
    },
    [onFileSelect, disabled]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
            : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed",
          selectedFile && "border-solid border-primary bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
          id="file-upload"
        />

        <div className="flex flex-col items-center text-center">
          {selectedFile ? (
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
                  MP3, WAV, M4A, or other audio formats
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
