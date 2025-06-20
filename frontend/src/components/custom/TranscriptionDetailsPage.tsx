import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  FileAudio,
  Clock,
  MessageSquare,
  FileText,
  HardDrive,
  Users,
  Calendar,
  Bot,
  User,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTranscriptionDetails,
  type TranscriptionDetails,
} from "@/api/history";

interface TranscriptionDetailsPageProps {
  transcriptionId: string;
  onBack: () => void;
}

export function TranscriptionDetailsPage({
  transcriptionId,
  onBack,
}: TranscriptionDetailsPageProps) {
  const [details, setDetails] = useState<TranscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDetails = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTranscriptionDetails(transcriptionId);
      setDetails(data);
    } catch (error) {
      console.error("Error loading transcription details:", error);
      toast.error("Failed to load transcription details");
    } finally {
      setLoading(false);
    }
  }, [transcriptionId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const formatFileSize = (bytes: number): string => {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${sizes[i]}`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "Unknown";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (seconds?: number): string => {
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const downloadTranscript = () => {
    if (!details) return;

    const content = details.utterances
      .map((utterance) => {
        const timestamp = utterance.start
          ? `[${formatTime(utterance.start)}] `
          : "";
        const speaker = utterance.speaker ? `${utterance.speaker}: ` : "";
        return `${timestamp}${speaker}${utterance.text}`;
      })
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${details.title}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSummary = () => {
    if (!details?.summaries?.[0]) return;

    const summary = details.summaries[0];
    const content = `Summary of: ${details.title}\nGenerated: ${formatDate(
      summary.created_at
    )}\n\n${summary.summary_text}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${details.title}_summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-8 w-64" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileAudio className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Transcription Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The requested transcription could not be found or you don't have
          access to it.
        </p>
        <Button onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{details.title}</h1>
            <p className="text-muted-foreground">{details.original_filename}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" onClick={downloadTranscript}>
            <Download className="h-4 w-4 mr-2" />
            Transcript
          </Button>
          {details.summaries.length > 0 && (
            <Button variant="outline" onClick={downloadSummary}>
              <Download className="h-4 w-4 mr-2" />
              Summary
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(details.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(details.duration_seconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">File Size</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(details.file_size)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <FileAudio className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Engine</p>
                <p className="text-sm text-muted-foreground">
                  {details.transcription_engine === "groq"
                    ? "Groq"
                    : "AssemblyAI"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {details.has_diarization && (
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                Speaker Diarization
              </Badge>
            )}
            {details.summaries.length > 0 && (
              <Badge variant="outline">
                <FileText className="h-3 w-3 mr-1" />
                Summarized
              </Badge>
            )}
            {details.chat_sessions.length > 0 && (
              <Badge variant="outline">
                <MessageSquare className="h-3 w-3 mr-1" />
                Chat History
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="transcript" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          {details.summaries.length > 0 && (
            <TabsTrigger value="summary">Summary</TabsTrigger>
          )}
          {details.chat_sessions.length > 0 && (
            <TabsTrigger value="chat">Chat History</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="transcript" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileAudio className="h-5 w-5" />
                <span>Transcript</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {details.utterances.map((utterance, index) => (
                    <div
                      key={index}
                      className="flex space-x-3 p-3 rounded-lg hover:bg-muted/50"
                    >
                      {utterance.start && (
                        <span className="text-sm text-muted-foreground font-mono min-w-[60px]">
                          {formatTime(utterance.start)}
                        </span>
                      )}
                      {utterance.speaker && (
                        <span className="text-sm font-medium text-primary min-w-[80px]">
                          {utterance.speaker}:
                        </span>
                      )}
                      <p className="text-sm flex-1 leading-relaxed">
                        {utterance.text}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {details.summaries.length > 0 && (
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Summary</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generated on {formatDate(details.summaries[0].created_at)}
                </p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {details.summaries[0].summary_text}
                    </p>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {details.chat_sessions.length > 0 && (
          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Chat History</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {details.chat_sessions.map((session) => (
                      <div key={session.id} className="space-y-3">
                        {session.chat_messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex space-x-3 p-4 rounded-lg ${
                              message.message_type === "user"
                                ? "bg-primary/10 ml-8"
                                : "bg-muted/50 mr-8"
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {message.message_type === "user" ? (
                                <User className="h-6 w-6" />
                              ) : (
                                <Bot className="h-6 w-6" />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                              {message.sources &&
                                message.sources.length > 0 && (
                                  <div className="border-l-2 border-muted pl-3 space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                      Sources:
                                    </p>
                                    {message.sources.map((source, idx) => (
                                      <div
                                        key={idx}
                                        className="text-xs text-muted-foreground"
                                      >
                                        {source.speaker && (
                                          <span className="font-medium">
                                            {source.speaker}:{" "}
                                          </span>
                                        )}
                                        {source.content_preview}...
                                      </div>
                                    ))}
                                  </div>
                                )}
                              <p className="text-xs text-muted-foreground">
                                {formatDate(message.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
