import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { FileUploader } from "@/components/custom/FileUploader";
import { TiptapEditor } from "@/components/custom/TiptapEditor";
import { useTranscription } from "@/hooks/useTranscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, PlayCircle, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryView } from "@/components/custom/SummaryView";
import { ChatInterface } from "@/components/custom/ChatInterface";
import { summarizeTranscription } from "@/api/client";

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

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enableDiarization, setEnableDiarization] = useState(false);
  // Chat messages state to persist across tab switches
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
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
    // Clear chat messages when starting a new transcription
    setChatMessages([]);
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

  const isProcessing = status === "uploading" || status === "processing";
  const isCompleted = status === "completed";
  const hasError = status === "failed";

  return (
    <MainLayout>
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
              <TabsList className="mb-4">
                <TabsTrigger value="transcription">Transcription</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
              </TabsList>
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
