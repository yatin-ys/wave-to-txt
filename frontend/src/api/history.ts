import apiClient from "./apiClient";

export interface TranscriptionHistoryItem {
  id: string;
  title: string;
  original_filename: string;
  file_size: number;
  duration_seconds?: number;
  transcription_engine: string;
  has_diarization: boolean;
  created_at: string;
  has_summary: boolean;
  has_chat: boolean;
}

export interface TranscriptionDetails {
  id: string;
  title: string;
  original_filename: string;
  file_size: number;
  duration_seconds?: number;
  transcription_engine: string;
  has_diarization: boolean;
  transcript_text: string;
  utterances: Array<{
    speaker?: string;
    text: string;
    start?: number;
    end?: number;
  }>;
  created_at: string;
  summaries: Array<{
    id: string;
    summary_text: string;
    summary_type: string;
    created_at: string;
  }>;
  chat_sessions: Array<{
    id: string;
    created_at: string;
    chat_messages: Array<{
      id: string;
      message_type: "user" | "assistant";
      content: string;
      sources?: Array<{
        type: string;
        content_preview: string;
        speaker?: string;
        file_name?: string;
        page_number?: number;
      }>;
      created_at: string;
    }>;
  }>;
}

export interface SaveTranscriptionData {
  task_id: string;
  title: string;
  original_filename: string;
  file_size: number;
  duration_seconds?: number;
  transcription_engine: string;
  has_diarization: boolean;
  transcript_text: string;
  utterances: Array<{
    speaker?: string;
    text: string;
    start?: number;
    end?: number;
  }>;
}

export interface SaveSummaryData {
  transcription_id: string;
  summary_text: string;
  summary_type?: string;
}

export interface SaveChatMessageData {
  chat_session_id: string;
  message_type: "user" | "assistant";
  content: string;
  sources?: Array<{
    type: string;
    content_preview: string;
    speaker?: string;
    file_name?: string;
    page_number?: number;
  }>;
}

// Save transcription to history
export const saveTranscription = async (
  data: SaveTranscriptionData
): Promise<{ id: string }> => {
  try {
    const response = await apiClient.post("/history/transcriptions", data);
    return response.data;
  } catch (error) {
    console.error("Error saving transcription:", error);
    throw error;
  }
};

// Save summary to history
export const saveSummary = async (
  data: SaveSummaryData
): Promise<{ id: string }> => {
  try {
    const response = await apiClient.post("/history/summaries", data);
    return response.data;
  } catch (error) {
    console.error("Error saving summary:", error);
    throw error;
  }
};

// Create chat session
export const createChatSession = async (
  transcription_id: string
): Promise<{ id: string }> => {
  try {
    const response = await apiClient.post(
      `/history/chat-sessions?transcription_id=${transcription_id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error creating chat session:", error);
    throw error;
  }
};

// Save chat message to history
export const saveChatMessage = async (
  data: SaveChatMessageData
): Promise<{ id: string }> => {
  try {
    const response = await apiClient.post("/history/chat-messages", data);
    return response.data;
  } catch (error) {
    console.error("Error saving chat message:", error);
    throw error;
  }
};

// Get user's transcription history
export const getTranscriptionHistory = async (): Promise<
  TranscriptionHistoryItem[]
> => {
  try {
    const response = await apiClient.get("/history/transcriptions");
    return response.data;
  } catch (error) {
    console.error("Error fetching transcription history:", error);
    throw error;
  }
};

// Get detailed transcription with summary and chat
export const getTranscriptionDetails = async (
  transcriptionId: string
): Promise<TranscriptionDetails> => {
  try {
    const response = await apiClient.get(
      `/history/transcriptions/${transcriptionId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching transcription details:", error);
    throw error;
  }
};

// Update transcription title
export const updateTranscriptionTitle = async (
  transcriptionId: string,
  title: string
): Promise<{ message: string; title: string }> => {
  try {
    const response = await apiClient.put(
      `/history/transcriptions/${transcriptionId}/title`,
      { title }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating transcription title:", error);
    throw error;
  }
};

// Delete transcription
export const deleteTranscription = async (
  transcriptionId: string
): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete(
      `/history/transcriptions/${transcriptionId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting transcription:", error);
    throw error;
  }
};
