import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { FileUploader } from "@/components/custom/FileUploader";
import { TiptapEditor } from "@/components/custom/TiptapEditor";
import { AuthForm } from "@/components/custom/AuthForm";
import { HistoryPage } from "@/components/custom/HistoryPage";
import { TranscriptionDetailsPage } from "@/components/custom/TranscriptionDetailsPage";
import { useTranscription } from "@/hooks/useTranscription";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, PlayCircle, ExternalLink, Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryView } from "@/components/custom/SummaryView";
import { ChatInterface } from "@/components/custom/ChatInterface";
import { summarizeTranscription } from "@/api/client";
import {
  saveTranscription,
  saveSummary,
  createChatSession,
  saveChatMessage,
} from "@/api/history";

// Define the Message interface at the App level
interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: Array<{
    type: string;
    content_preview: string;
    speaker?: string;
    file_name?: string;
    page_number?: number;
  }>;
}

// App page states
type AppPage = "transcribe" | "history" | "details";

// Cloud Save Status Component
const CloudSaveStatus = ({ 
  status, 
  label 
}: { 
  status: 'idle' | 'saving' | 'success' | 'error'; 
  label: string;
}) => {
  if (status === 'idle') return null;
  
  return (
    <div className="flex items-center space-x-2 text-sm">
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-blue-500">Saving {label} to cloud...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="flex items-center justify-center h-4 w-4 bg-green-500 rounded-full">
            <Check className="h-3 w-3 text-white" />
          </div>
          <span className="text-green-600">{label} saved to cloud</span>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="flex items-center justify-center h-4 w-4 bg-red-500 rounded-full">
            <X className="h-3 w-3 text-white" />
          </div>
          <span className="text-red-600">Failed to save {label}</span>
        </>
      )}
    </div>
  );
};

function App() {
  const { user, initialized } = useAuth();
  const [currentPage, setCurrentPage] = useState<AppPage>("transcribe");
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<
    string | null
  >(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enableDiarization, setEnableDiarization] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  // Chat messages state to persist across tab switches
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  // Cloud save status tracking
  const [saveStatus, setSaveStatus] = useState<{
    transcription: 'idle' | 'saving' | 'success' | 'error';
    summary: 'idle' | 'saving' | 'success' | 'error';
    chat: 'idle' | 'saving' | 'success' | 'error';
  }>({
    transcription: 'idle',
    summary: 'idle',
    chat: 'idle',
  });
  const {
    status,
    transcript,
    audioUrl,
    summary,
    summaryStatus,
    summaryError,
    taskId,
    startTranscription,
    resetTranscription,
  } = useTranscription();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Force audio to load when URL changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      console.log("Loading audio with URL:", audioUrl);
      audioRef.current.load();
    }
  }, [audioUrl]);

    // Save transcription to history when completed
  useEffect(() => {
    const saveTranscriptionToHistory = async () => {
      if (
        status === "completed" &&
        transcript &&
        transcript.length > 0 &&
        selectedFile &&
        taskId &&
        user
      ) {
        setSaveStatus(prev => ({ ...prev, transcription: 'saving' }));
        
        try {
          // Generate a meaningful title from filename with better formatting
          const generateTitle = (filename: string): string => {
            let title = filename
              .replace(/\.[^/.]+$/, "") // Remove file extension
              .replace(/[_-]/g, " ") // Replace underscores and hyphens with spaces
              .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space before capital letters (camelCase)
              .replace(/\s+/g, " ") // Replace multiple spaces with single space
              .trim(); // Remove leading/trailing spaces
            
            // Handle common generic names
            if (
              title.toLowerCase().includes("videoplayback") ||
              title.toLowerCase().includes("recording") ||
              title.toLowerCase().includes("audio") ||
              title.toLowerCase() === "untitled" ||
              title.length < 3
            ) {
              const now = new Date();
              const dateStr = now.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeStr = now.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              });
              title = `Transcription ${dateStr} ${timeStr}`;
            } else {
              // Capitalize first letter of each word for better readability
              title = title
                .split(" ")
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ");
            }
            
            return title;
          };

          const title = generateTitle(selectedFile.name);

          await saveTranscription({
            task_id: taskId,
            title: title,
            original_filename: selectedFile.name,
            file_size: selectedFile.size,
            duration_seconds: undefined, // We don't have this info yet
            transcription_engine: enableDiarization ? "assemblyai" : "groq",
            has_diarization: enableDiarization,
            transcript_text: transcript.map((u) => u.text).join(" "),
            utterances: transcript.map((u) => ({
              speaker: u.speaker || undefined,
              text: u.text,
            })),
          });

          setSaveStatus(prev => ({ ...prev, transcription: 'success' }));
          console.log("Transcription saved to history successfully");
          
          // Reset to idle after 3 seconds
          setTimeout(() => {
            setSaveStatus(prev => ({ ...prev, transcription: 'idle' }));
          }, 3000);
        } catch (error) {
          setSaveStatus(prev => ({ ...prev, transcription: 'error' }));
          console.error("Failed to save transcription to history:", error);
          
          // Reset to idle after 5 seconds for errors
          setTimeout(() => {
            setSaveStatus(prev => ({ ...prev, transcription: 'idle' }));
          }, 5000);
        }
      }
    };

    saveTranscriptionToHistory();
  }, [status, transcript, selectedFile, taskId, user, enableDiarization]);

  // Save summary to history when generated
  useEffect(() => {
    const saveSummaryToHistory = async () => {
      if (summaryStatus === "completed" && summary && taskId && user) {
        setSaveStatus(prev => ({ ...prev, summary: 'saving' }));
        
        try {
          await saveSummary({
            transcription_id: taskId,
            summary_text: summary,
            summary_type: "ai_generated",
          });

          setSaveStatus(prev => ({ ...prev, summary: 'success' }));
          console.log("Summary saved to history successfully");
          
          // Reset to idle after 3 seconds
          setTimeout(() => {
            setSaveStatus(prev => ({ ...prev, summary: 'idle' }));
          }, 3000);
        } catch (error) {
          setSaveStatus(prev => ({ ...prev, summary: 'error' }));
          console.error("Failed to save summary to history:", error);
          
          // Reset to idle after 5 seconds for errors
          setTimeout(() => {
            setSaveStatus(prev => ({ ...prev, summary: 'idle' }));
          }, 5000);
        }
      }
    };

    saveSummaryToHistory();
  }, [summaryStatus, summary, taskId, user]);

  const handleTranscribe = () => {
    if (selectedFile) {
      startTranscription(selectedFile, enableDiarization);
    }
  };

  const handleGenerateSummary = async () => {
    if (!taskId) return;
    try {
      await summarizeTranscription(taskId);
    } catch (err) {
      console.error("Failed to start summarization", err);
    }
  };

  const handleReset = () => {
    resetTranscription();
    setSelectedFile(null);
    setEnableDiarization(false);
    setPlaybackRate(1);
    setChatSessionId(null);
    // Clear chat messages when starting a new transcription
    setChatMessages([]);
    // Reset save status
    setSaveStatus({
      transcription: 'idle',
      summary: 'idle',
      chat: 'idle',
    });
    if (audioRef.current) {
      audioRef.current.playbackRate = 1;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Handle chat message saving
  const handleChatMessage = async (message: Message) => {
    if (!taskId || !user) return;

    setSaveStatus(prev => ({ ...prev, chat: 'saving' }));
    
    try {
      // Create chat session if it doesn't exist
      if (!chatSessionId) {
        const session = await createChatSession(taskId);
        setChatSessionId(session.id);

        // Save the message with the new session ID
        await saveChatMessage({
          chat_session_id: session.id,
          message_type: message.type,
          content: message.content,
          sources: message.sources,
        });
      } else {
        // Save with existing session ID
        await saveChatMessage({
          chat_session_id: chatSessionId,
          message_type: message.type,
          content: message.content,
          sources: message.sources,
        });
      }
      
      setSaveStatus(prev => ({ ...prev, chat: 'success' }));
      
      // Reset to idle after 2 seconds for chat (faster than other saves)
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, chat: 'idle' }));
      }, 2000);
    } catch (error) {
      setSaveStatus(prev => ({ ...prev, chat: 'error' }));
      console.error("Failed to save chat message to history:", error);
      
      // Reset to idle after 4 seconds for errors
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, chat: 'idle' }));
      }, 4000);
    }
  };

  const handleViewDetails = (transcriptionId: string) => {
    setSelectedTranscriptionId(transcriptionId);
    setCurrentPage("details");
  };

  const handleBackToHistory = () => {
    setSelectedTranscriptionId(null);
    setCurrentPage("history");
  };

  const isProcessing = status === "uploading" || status === "processing";
  const isCompleted = status === "completed";
  const hasError = status === "failed";

  // Show loading skeleton while auth is initializing
  if (!initialized) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show authentication form if user is not logged in
  if (!user) {
    return <AuthForm />;
  }

  // Handle different pages
  if (currentPage === "history") {
    return (
      <MainLayout currentPage="history" onNavigate={setCurrentPage}>
        <div className="p-6">
          <HistoryPage onViewDetails={handleViewDetails} />
        </div>
      </MainLayout>
    );
  }

  if (currentPage === "details" && selectedTranscriptionId) {
    return (
      <MainLayout currentPage="history" onNavigate={setCurrentPage}>
        <div className="p-6">
          <TranscriptionDetailsPage
            transcriptionId={selectedTranscriptionId}
            onBack={handleBackToHistory}
          />
        </div>
      </MainLayout>
    );
  }

  // Show main transcription app
  return (
    <MainLayout currentPage="transcribe" onNavigate={setCurrentPage}>
      {/* Control Panel */}
      <div className="flex flex-col space-y-6 h-full">
        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Upload & Configure</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileUploader
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
              disabled={isProcessing}
            />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="diarization-switch">Speaker Diarization</Label>
                <p className="text-sm text-muted-foreground">
                  Identify and separate different speakers
                </p>
              </div>
              <Switch
                id="diarization-switch"
                checked={enableDiarization}
                onCheckedChange={setEnableDiarization}
                disabled={isProcessing}
              />
            </div>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleTranscribe}
                disabled={!selectedFile || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  "Start Transcription"
                )}
              </Button>

              {(isCompleted || hasError) && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Start New Transcription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        {isCompleted && (
          <Card className="flex-shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PlayCircle className="h-5 w-5" />
                <span>Audio Player</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {audioUrl && (
                  <div className="flex flex-col space-y-4">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      preload="metadata"
                      className="w-full"
                      key={audioUrl} // Force re-render when URL changes
                      onLoadedMetadata={() => {
                        console.log("Audio metadata loaded");
                      }}
                      onCanPlay={() => {
                        console.log("Audio can play");
                      }}
                      onError={(e) => {
                        console.error("Audio loading error:", e);
                        const audio = e.currentTarget;
                        console.error("Audio error details:", {
                          error: audio.error,
                          networkState: audio.networkState,
                          readyState: audio.readyState,
                          src: audio.src,
                        });
                      }}
                      onRateChange={() => {
                        if (audioRef.current) {
                          setPlaybackRate(audioRef.current.playbackRate);
                        }
                      }}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Label className="text-sm font-medium">
                          Playback Speed:
                        </Label>
                        {[0.5, 1, 1.5, 2].map((rate) => (
                          <Button
                            key={rate}
                            size="sm"
                            variant={
                              playbackRate === rate ? "default" : "outline"
                            }
                            onClick={() => handlePlaybackRateChange(rate)}
                          >
                            {rate}x
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(audioUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open Audio
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transcript Panel */}
      <Card className="flex flex-col h-full min-h-0">
        <CardContent className="flex-1 p-6 min-h-0">
          {isCompleted ? (
            <Tabs defaultValue="transcription" className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="transcription">Transcription</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                </TabsList>
                
                {/* Cloud Save Status Indicators */}
                <div className="flex flex-col space-y-1">
                  <CloudSaveStatus 
                    status={saveStatus.transcription} 
                    label="transcript" 
                  />
                  <CloudSaveStatus 
                    status={saveStatus.summary} 
                    label="summary" 
                  />
                  <CloudSaveStatus 
                    status={saveStatus.chat} 
                    label="chat" 
                  />
                </div>
              </div>
              <TabsContent value="transcription" className="flex-1 min-h-0">
                <TiptapEditor utterances={transcript} className="h-full" />
              </TabsContent>
              <TabsContent value="summary" className="flex-1 min-h-0">
                <SummaryView
                  summary={summary}
                  summaryStatus={summaryStatus}
                  summaryError={summaryError}
                  onGenerateSummary={handleGenerateSummary}
                />
              </TabsContent>
              <TabsContent value="chat" className="flex-1 min-h-0">
                <ChatInterface
                  taskId={taskId}
                  isTranscriptCompleted={isCompleted}
                  messages={chatMessages}
                  onMessagesChange={setChatMessages}
                  onMessageSent={handleChatMessage}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <TiptapEditor utterances={transcript} className="h-full" />
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}

export default App;
