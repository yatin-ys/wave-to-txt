import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  MessageCircle,
  FileText,
  Upload,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import apiClient from "@/api/client";

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

interface ChatInterfaceProps {
  taskId: string | null;
  isTranscriptCompleted: boolean;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  onMessageSent?: (message: Message) => void;
}

interface KnowledgeBaseStats {
  document_count: number;
  collection_name: string;
  has_transcript: boolean;
  uploaded_documents: Array<{
    file_name: string;
    chunks_created: number;
    upload_timestamp: string;
  }>;
}

export const ChatInterface = ({
  taskId,
  isTranscriptCompleted,
  messages,
  onMessagesChange,
  onMessageSent,
}: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSuggestions = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await apiClient.get(`/chat/${taskId}/suggestions`);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  }, [taskId]);

  const checkIfInitialized = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await apiClient.get(`/chat/${taskId}/stats`);
      setStats(response.data);
      setIsInitialized(true);
      await loadSuggestions();
    } catch {
      console.log("Knowledge base not initialized yet");
      setIsInitialized(false);
    }
  }, [taskId, loadSuggestions]);

  useEffect(() => {
    if (taskId && isTranscriptCompleted) {
      checkIfInitialized();
    }
  }, [taskId, isTranscriptCompleted, checkIfInitialized]);

  const initializeKnowledgeBase = async () => {
    if (!taskId) return;

    setIsInitializing(true);
    try {
      await apiClient.post(`/chat/${taskId}/initialize`);
      setIsInitialized(true);
      await checkIfInitialized();
      toast.success("Knowledge base initialized! You can now start chatting.");
    } catch (error) {
      console.error("Failed to initialize knowledge base:", error);
      toast.error("Failed to initialize knowledge base. Please try again.");
    } finally {
      setIsInitializing(false);
    }
  };

  const clearChat = () => {
    onMessagesChange([]);
    toast.success("Chat cleared");
  };

  const sendMessage = async (question: string) => {
    if (!question.trim() || !taskId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    onMessagesChange(newMessages);
    setInputValue("");
    setIsLoading(true);

    // Save user message to history
    onMessageSent?.(userMessage);

    try {
      const response = await apiClient.post(`/chat/${taskId}/ask`, {
        question: question.trim(),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: response.data.answer,
        timestamp: new Date(),
        sources: response.data.sources,
      };

      onMessagesChange([...newMessages, assistantMessage]);

      // Save assistant message to history
      onMessageSent?.(assistantMessage);
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content:
          "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
      };
      onMessagesChange([...newMessages, errorMessage]);

      // Save error message to history
      onMessageSent?.(errorMessage);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !taskId) return;

    // Validate file type
    const allowedTypes = [".pdf", ".docx", ".doc", ".txt"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      toast.error("Please upload a PDF, DOCX, or TXT file.");
      return;
    }

    const formData = new FormData();
    formData.append("document", file);

    try {
      toast.loading("Uploading and processing document...", { id: "upload" });

      const response = await apiClient.post(
        `/chat/${taskId}/upload-document`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success(
          `Document "${response.data.file_name}" uploaded successfully!`,
          { id: "upload" }
        );
        await checkIfInitialized(); // Refresh stats
      } else {
        toast.error(`Failed to upload document: ${response.data.error}`, {
          id: "upload",
        });
      }
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast.error("Failed to upload document. Please try again.", {
        id: "upload",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (!isTranscriptCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Chat with Your Audio</h2>
        <p className="text-muted-foreground max-w-sm">
          Complete the transcription first to start chatting with your audio
          content.
        </p>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageCircle className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">
          Initialize Knowledge Base
        </h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Set up your transcript for intelligent Q&A. This will enable you to
          ask questions about your audio content.
        </p>
        <Button
          onClick={initializeKnowledgeBase}
          disabled={isInitializing}
          size="lg"
        >
          {isInitializing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing...
            </>
          ) : (
            "Initialize Knowledge Base"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with stats and clear button */}
      <div className="flex-shrink-0 border-b pb-4 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold flex items-center">
            <MessageCircle className="mr-2 h-5 w-5" />
            Chat with Your Content
          </h3>
          <div className="flex items-center space-x-2">
            {stats && (
              <>
                <Badge variant="secondary">
                  {stats.document_count} chunks indexed
                </Badge>
                {stats.uploaded_documents.length > 0 && (
                  <Badge variant="outline">
                    {stats.uploaded_documents.length} documents
                  </Badge>
                )}
              </>
            )}
            {messages.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearChat}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Chat
              </Button>
            )}
          </div>
        </div>

        {/* File upload */}
        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
          <span className="ml-2 text-xs text-muted-foreground">
            PDF, DOCX, or TXT files
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-muted-foreground text-center mb-4">
                Ask me anything about your transcript or uploaded documents!
              </p>

              {/* Suggested questions */}
              {suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Suggested questions:
                  </p>
                  <div className="grid gap-2">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="justify-start text-left h-auto py-2 px-3"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.type === "user" ? (
                  <p className="text-sm">{message.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        // Custom styling for markdown elements
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-2 ml-4 list-disc">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-2 ml-4 list-decimal">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="mb-1">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                        code: ({ children }) => (
                          <code className="bg-background/50 px-1 py-0.5 rounded text-xs">
                            {children}
                          </code>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-background/50 p-2 rounded overflow-x-auto text-xs">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Sources for assistant messages with accordion */}
                {message.type === "assistant" &&
                  message.sources &&
                  message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-border/50">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="sources" className="border-0">
                          <AccordionTrigger className="text-xs font-medium py-1 hover:no-underline">
                            <div className="flex items-center space-x-1">
                              <FileText className="h-3 w-3" />
                              <span>Sources ({message.sources.length})</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-0 pt-1">
                            <div className="space-y-2">
                              {message.sources.map((source, index) => (
                                <div
                                  key={index}
                                  className="text-xs bg-background/50 rounded p-2"
                                >
                                  <div className="flex items-center space-x-1 mb-1">
                                    <FileText className="h-3 w-3" />
                                    <span className="font-medium">
                                      {source.type === "transcript"
                                        ? `Speaker: ${
                                            source.speaker || "Unknown"
                                          }`
                                        : source.file_name || "Document"}
                                    </span>
                                    {source.page_number && (
                                      <span className="text-muted-foreground">
                                        (Page {source.page_number})
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground leading-relaxed">
                                    {source.content_preview}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}

                <p className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0 pt-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your content..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
