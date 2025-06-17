import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Copy, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Utterance {
  speaker: string | null;
  text: string;
}

interface TiptapEditorProps {
  utterances: Utterance[];
  className?: string;
}

export const TiptapEditor = ({ utterances, className }: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    if (utterances.length === 0) {
      editor.commands.setContent("");
      return;
    }

    const formattedContent = utterances
      .map(({ speaker, text }) => {
        if (speaker) {
          return `<p><strong>Speaker ${speaker}:</strong> ${text}</p>`;
        }
        return `<p>${text}</p>`;
      })
      .join("");

    editor.commands.setContent(formattedContent);
  }, [utterances, editor]);

  const copyToClipboard = async () => {
    if (!editor) return;

    const text = editor.getText();

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard", {
        description: "The transcript has been copied to your clipboard.",
      });
    } catch (error) {
      console.error("Failed to copy text:", error);
      toast.error("Copy failed", {
        description: "Failed to copy the transcript to clipboard.",
      });
    }
  };

  const isEmpty = utterances.length === 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Transcript</h3>
        </div>
        {!isEmpty && (
          <Button
            variant="outline"
            size="sm"
            onClick={copyToClipboard}
            className="flex items-center space-x-2"
          >
            <Copy className="h-4 w-4" />
            <span>Copy</span>
          </Button>
        )}
      </div>

      <div className="flex-1 border rounded-lg overflow-hidden bg-background">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full text-center p-8">
            <div className="space-y-3">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                Your transcript will appear here...
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
    </div>
  );
};
