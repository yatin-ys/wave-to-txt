import { useState, useRef, useCallback, useEffect } from "react";
import apiClient from "@/api/apiClient";
import { toast } from "sonner";
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
  summary: string | null;
  summary_status: string | null;
  summary_error: string | null;
}

type TranscriptionStatus =
  | "idle"
  | "uploading"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export const useTranscription = () => {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Utterance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const summaryStatusRef = useRef(summaryStatus);
  summaryStatusRef.current = summaryStatus;

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (taskId) {
      const newEventSource = new EventSource(
        `/api/transcribe/stream-status/${taskId}`
      );
      eventSourceRef.current = newEventSource;

      newEventSource.onmessage = (event) => {
        try {
          const statusUpdate: StatusUpdate = JSON.parse(event.data);

          if (statusUpdate.summary_status) {
            setSummaryStatus(statusUpdate.summary_status);
          }
          if (statusUpdate.summary) {
            setSummary(statusUpdate.summary);
          }
          if (statusUpdate.summary_error) {
            setSummaryError(statusUpdate.summary_error);
          }

          switch (statusUpdate.status) {
            case "pending":
            case "processing":
              setStatus("processing");
              break;
            case "completed":
              if (statusRef.current !== "completed") {
                toast.success("Transcription complete!");
              }
              setStatus("completed");
              if (
                statusUpdate.utterances &&
                JSON.stringify(statusUpdate.utterances) !==
                  JSON.stringify(transcript)
              ) {
                setTranscript(statusUpdate.utterances);
              }
              if (statusUpdate.audio_url) {
                console.log("Setting audio URL:", statusUpdate.audio_url);
                setAudioUrl(statusUpdate.audio_url);
              }
              break;
            case "failed":
              if (statusRef.current !== "failed") {
                toast.error("Transcription failed", {
                  description:
                    statusUpdate.error || "An unknown error occurred.",
                });
              }
              setStatus("failed");
              setError(statusUpdate.error || "An unknown error occurred.");
              closeEventSource();
              break;
          }

          if (statusUpdate.status) {
            statusRef.current = statusUpdate.status;
          }
          if (statusUpdate.summary_status) {
            summaryStatusRef.current = statusUpdate.summary_status;
          }
        } catch (parseError) {
          console.error("Error parsing SSE data:", parseError);
          setStatus("failed");
          setError("Error processing server response.");
          toast.error("Error processing server response.");
          closeEventSource();
        }
      };

      newEventSource.onerror = () => {
        if (
          statusRef.current === "failed" ||
          summaryStatusRef.current === "completed" ||
          summaryStatusRef.current === "failed"
        ) {
          closeEventSource();
          return;
        }
        setStatus("failed");
        setError(
          "A connection error occurred while tracking transcription status."
        );
        toast.error(
          "A connection error occurred while tracking transcription status."
        );
        closeEventSource();
      };

      return () => {
        closeEventSource();
      };
    }
  }, [taskId, closeEventSource, transcript]);

  const startTranscription = useCallback(
    async (file: File, enableDiarization: boolean) => {
      let toastId: string | number | undefined;
      try {
        closeEventSource();
        setStatus("uploading");
        toastId = toast.loading("Uploading audio file...");
        setError(null);
        setTranscript([]);
        setAudioUrl(null);
        setSummary(null);
        setSummaryStatus(null);
        setSummaryError(null);

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
        toast.success("Upload complete! Starting transcription...", {
          id: toastId,
        });
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
        toast.error(errorMessage, { id: toastId });
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
    setSummary(null);
    setSummaryStatus(null);
    setSummaryError(null);
  }, [closeEventSource]);

  return {
    status,
    taskId,
    transcript,
    error,
    audioUrl,
    summary,
    summaryStatus,
    summaryError,
    startTranscription,
    resetTranscription,
  };
};
