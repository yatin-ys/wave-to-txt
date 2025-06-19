import { useState, useRef } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { FileUploader } from "@/components/custom/FileUploader";
import { TiptapEditor } from "@/components/custom/TiptapEditor";
import { useTranscription } from "@/hooks/useTranscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryView } from "@/components/custom/SummaryView";
import { summarizeTranscription } from "@/api/client";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enableDiarization, setEnableDiarization] = useState(false);
  const {
    status,
    transcript,
    error,
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

  const getStatusMessage = () => {
    switch (status) {
      case "uploading":
        return "Uploading audio file...";
      case "processing":
        return "Processing transcription...";
      case "completed":
        return "Transcription completed successfully!";
      case "failed":
        return "Transcription failed";
      default:
        return "";
    }
  };

  const getProgressValue = () => {
    switch (status) {
      case "uploading":
        return 25;
      case "processing":
        return 75;
      case "completed":
        return 100;
      default:
        return 0;
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
        {(isProcessing || isCompleted || hasError) && (
          <Card className="flex-shrink-0">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  {isProcessing && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {isCompleted && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {hasError && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="text-sm font-medium">
                    {getStatusMessage()}
                  </span>
                </div>

                {isProcessing && (
                  <Progress value={getProgressValue()} className="w-full" />
                )}

                {hasError && error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isCompleted && audioUrl && (
                  <div className="flex flex-col space-y-4 pt-4 border-t mt-4">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      controls
                      className="w-full"
                      onRateChange={() => {
                        if (audioRef.current) {
                          setPlaybackRate(audioRef.current.playbackRate);
                        }
                      }}
                    />
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
