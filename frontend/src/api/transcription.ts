import apiClient from "./apiClient";

export const summarizeTranscription = async (taskId: string) => {
  try {
    const response = await apiClient.post(`/transcribe/${taskId}/summarize`);
    return response.data;
  } catch (error) {
    console.error("Error starting summarization:", error);
    throw error;
  }
}; 