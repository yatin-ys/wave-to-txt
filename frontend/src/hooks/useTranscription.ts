import { useState, useRef, useCallback, useEffect } from "react";
import apiClient from "@/api/client";
import axios from "axios";

interface Utterance {
  speaker: string | null;
  text: string;
}

interface TranscriptionResponse {
  task_id: string;
}

interface StatusUpdate {
  status: "pending" | "processing" | "completed" | "failed";
  utterances: Utterance[] | null;
  error: string | null;
  audio_url: string | null;
}

type TranscriptionStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export const useTranscription = () => {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Utterance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (taskId && status === "processing") {
      const newEventSource = new EventSource(
        `/api/transcribe/stream-status/${taskId}`
      );
      eventSourceRef.current = newEventSource;

      newEventSource.onmessage = (event) => {
        try {
          const statusUpdate: StatusUpdate = JSON.parse(event.data);
          switch (statusUpdate.status) {
            case "pending":
            case "processing":
              setStatus("processing");
              break;
            case "completed":
              setStatus("completed");
              if (statusUpdate.utterances) {
                setTranscript(statusUpdate.utterances);
              }
              if (statusUpdate.audio_url) {
                setAudioUrl(statusUpdate.audio_url);
              }
              closeEventSource();
              break;
            case "failed":
              setStatus("failed");
              setError(statusUpdate.error || "An unknown error occurred.");
              closeEventSource();
              break;
          }
        } catch (parseError) {
          console.error("Error parsing SSE data:", parseError);
          setStatus("failed");
          setError("Error processing server response.");
          closeEventSource();
        }
      };

      newEventSource.onerror = (event) => {
        console.error("SSE error:", event);
        setStatus("failed");
        setError(
          "A connection error occurred while tracking transcription status."
        );
        closeEventSource();
      };

      return () => {
        closeEventSource();
      };
    }
  }, [taskId, status, closeEventSource]);

  const startTranscription = useCallback(
    async (file: File, enableDiarization: boolean) => {
      try {
        closeEventSource();
        setStatus("uploading");
        setError(null);
        setTranscript([]);
        setAudioUrl(null);

        const formData = new FormData();
        formData.append("audio_file", file);
        formData.append("enable_diarization", enableDiarization.toString());

        const response = await apiClient.post<TranscriptionResponse>(
          "/transcribe",
          formData
        );

        if (response.status !== 202) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = response.data;
        setTaskId(data.task_id);
        setStatus("processing");
      } catch (uploadError: unknown) {
        console.error("Upload/Start error:", uploadError);
        setStatus("failed");

        let errorMessage = "An unknown error occurred during upload.";
        if (axios.isAxiosError(uploadError)) {
          errorMessage =
            uploadError.response?.data?.detail ||
            uploadError.message ||
            "Failed to start transcription.";
        } else if (uploadError instanceof Error) {
          errorMessage = uploadError.message;
        }

        setError(errorMessage);
      }
    },
    [closeEventSource]
  );

  const resetTranscription = useCallback(() => {
    closeEventSource();
    setStatus("idle");
    setTaskId(null);
    setTranscript([]);
    setError(null);
    setAudioUrl(null);
  }, [closeEventSource]);

  return {
    status,
    taskId,
    transcript,
    error,
    audioUrl,
    startTranscription,
    resetTranscription,
  };
};
