import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  FileAudio,
  Clock,
  MessageSquare,
  FileText,
  Trash2,
  Eye,
  HardDrive,
  Users,
  Calendar,
  Edit2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getTranscriptionHistory,
  deleteTranscription,
  updateTranscriptionTitle,
  type TranscriptionHistoryItem,
} from "@/api/history";

interface HistoryPageProps {
  onViewDetails: (transcriptionId: string) => void;
}

export function HistoryPage({ onViewDetails }: HistoryPageProps) {
  const [transcriptions, setTranscriptions] = useState<
    TranscriptionHistoryItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingTitleId, setSavingTitleId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const history = await getTranscriptionHistory();
      setTranscriptions(history);
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load transcription history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transcriptionId: string) => {
    try {
      setDeletingId(transcriptionId);
      await deleteTranscription(transcriptionId);
      setTranscriptions((prev) => prev.filter((t) => t.id !== transcriptionId));
      toast.success("Transcription deleted successfully");
    } catch (error) {
      console.error("Error deleting transcription:", error);
      toast.error("Failed to delete transcription");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartEdit = (transcriptionId: string, currentTitle: string) => {
    setEditingId(transcriptionId);
    setEditingTitle(currentTitle);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleSaveEdit = async (transcriptionId: string) => {
    if (!editingTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    setSavingTitleId(transcriptionId);
    
    try {
      await updateTranscriptionTitle(transcriptionId, editingTitle.trim());
      setTranscriptions((prev) =>
        prev.map((t) =>
          t.id === transcriptionId ? { ...t, title: editingTitle.trim() } : t
        )
      );
      toast.success("Title updated successfully");
      setEditingId(null);
      setEditingTitle("");
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Failed to update title");
    } finally {
      setSavingTitleId(null);
    }
  };

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
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <History className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Transcription History</h1>
        </div>

        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (transcriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <History className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Transcriptions Yet</h2>
        <p className="text-muted-foreground mb-4">
          Your transcription history will appear here once you start
          transcribing audio files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Transcription History</h1>
        </div>
        <Badge variant="secondary">
          {transcriptions.length} transcription
          {transcriptions.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="grid gap-4">
          {transcriptions.map((transcription) => (
            <Card
              key={transcription.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <FileAudio className="h-4 w-4" />
                      {editingId === transcription.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveEdit(transcription.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            className="text-lg font-semibold"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveEdit(transcription.id)}
                            disabled={savingTitleId === transcription.id}
                          >
                            {savingTitleId === transcription.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 flex-1">
                          <span className="flex-1">{transcription.title}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleStartEdit(
                                transcription.id,
                                transcription.title
                              )
                            }
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {transcription.original_filename}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(transcription.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingId === transcription.id}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Transcription
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "
                            {transcription.title}"? This action cannot be undone
                            and will remove the transcription, summary, and chat
                            history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(transcription.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(transcription.created_at)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatDuration(transcription.duration_seconds)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span>{formatFileSize(transcription.file_size)}</span>
                  </div>

                  {transcription.has_diarization && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Speaker ID</span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {transcription.transcription_engine === "groq"
                      ? "Groq"
                      : "AssemblyAI"}
                  </Badge>

                  {transcription.has_diarization && (
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      Diarization
                    </Badge>
                  )}

                  {transcription.has_summary && (
                    <Badge variant="outline">
                      <FileText className="h-3 w-3 mr-1" />
                      Summary
                    </Badge>
                  )}

                  {transcription.has_chat && (
                    <Badge variant="outline">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Chat History
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
