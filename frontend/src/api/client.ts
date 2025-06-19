import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export const summarizeTranscription = async (taskId: string) => {
  try {
    const response = await apiClient.post(`/transcribe/${taskId}/summarize`);
    return response.data;
  } catch (error) {
    console.error("Error starting summarization:", error);
    throw error;
  }
};

export default apiClient;
