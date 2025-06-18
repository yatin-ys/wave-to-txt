import { useEffect, useState, type ChangeEvent } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Copy, FileText, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import {
  Packer,
  Document as DocxDocument,
  Paragraph,
  TextRun,
  type IRunOptions,
} from "docx";
import { pdf } from "@react-pdf/renderer";
import { TranscriptPDF } from "./TranscriptPDF";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Utterance {
  speaker: string | null;
  text: string;
}

interface TiptapEditorProps {
  utterances: Utterance[];
  className?: string;
}

export const TiptapEditor = ({ utterances, className }: TiptapEditorProps) => {
  const [isEditable, setIsEditable] = useState(false);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: isEditable,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[400px] p-4",
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [isEditable, editor]);

  useEffect(() => {
    if (utterances.length > 0) {
      const uniqueSpeakers = Array.from(
        new Set(utterances.map((u) => u.speaker).filter(Boolean))
      ) as string[];
      const initialSpeakerNames = uniqueSpeakers.reduce((acc, speaker) => {
        acc[speaker] = `Speaker ${speaker}`;
        return acc;
      }, {} as Record<string, string>);
      setSpeakerNames(initialSpeakerNames);
      setIsEditable(false);
    }
  }, [utterances]);

  useEffect(() => {
    if (!editor || (editor.isFocused && isEditable)) return;

    if (utterances.length === 0) {
      editor.commands.setContent("");
      return;
    }

    const formattedContent = utterances
      .map(({ speaker, text }) => {
        if (speaker) {
          return `<p><strong>${
            speakerNames[speaker] || `Speaker ${speaker}`
          }:</strong> ${text}</p>`;
        }
        return `<p>${text}</p>`;
      })
      .join("");

    editor.commands.setContent(formattedContent);
    // When new utterances are loaded, exit edit mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utterances, editor, speakerNames]);

  const handleSpeakerNameChange = (speaker: string, newName: string) => {
    setSpeakerNames((prev) => ({ ...prev, [speaker]: newName }));
  };

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

  const handlePdfExport = async () => {
    if (!editor) return;

    try {
      toast.info("Generating PDF...", {
        description: "This may take a moment.",
      });

      const content = editor.getJSON();
      const doc = <TranscriptPDF content={content} />;
      const blob = await pdf(doc).toBlob();

      saveAs(blob, "transcript.pdf");

      toast.success("PDF Exported Successfully");
    } catch (error) {
      console.error("Failed to export as PDF:", error);
      toast.error("PDF Export Failed");
    }
  };

  const exportAs = async (format: "txt" | "docx") => {
    if (!editor) return;

    const contentHTML = editor.getHTML();
    const elementForDocx = document.createElement("div");
    elementForDocx.innerHTML = contentHTML;
    document.body.appendChild(elementForDocx);

    if (format === "txt") {
      const text = editor.getText();
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      saveAs(blob, "transcript.txt");
      toast.success("Exported as TXT");
    } else if (format === "docx") {
      try {
        const processNodesToRuns = (
          nodes: NodeListOf<ChildNode>
        ): IRunOptions[] => {
          const runs: IRunOptions[] = [];
          nodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              if (node.textContent) {
                runs.push({ text: node.textContent });
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              const tagName = el.tagName.toUpperCase();
              const childRuns = processNodesToRuns(el.childNodes);

              const newRuns = childRuns.map((run) => ({
                ...run,
                bold: tagName === "STRONG" || tagName === "B" || run.bold,
                italics: tagName === "EM" || tagName === "I" || run.italics,
                strike:
                  tagName === "S" ||
                  tagName === "STRIKE" ||
                  tagName === "DEL" ||
                  run.strike,
              }));
              runs.push(...newRuns);
            }
          });
          return runs;
        };

        const paragraphs: Paragraph[] = Array.from(elementForDocx.children).map(
          (p) => {
            const runOptions = processNodesToRuns(p.childNodes);
            return new Paragraph({
              children: runOptions.map((opts) => new TextRun(opts)),
            });
          }
        );

        const doc = new DocxDocument({
          sections: [
            {
              children: paragraphs,
            },
          ],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, "transcript.docx");
        toast.success("Exported as DOCX");
      } catch (error) {
        console.error("Failed to export as DOCX:", error);
        toast.error("DOCX Export Failed");
      }
    }

    document.body.removeChild(elementForDocx);
  };

  const isEmpty = utterances.length === 0;
  const uniqueSpeakers = Array.from(
    new Set(utterances.map((u) => u.speaker).filter(Boolean))
  ) as string[];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Transcript</h3>
        </div>
        {!isEmpty && (
          <div className="flex items-center space-x-2">
            <Button
              variant={isEditable ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsEditable(!isEditable)}
              className="flex items-center space-x-2"
            >
              <span>{isEditable ? "Lock" : "Edit"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center space-x-2"
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <FileDown className="h-4 w-4" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportAs("txt")}>
                  as TXT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePdfExport}>
                  as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAs("docx")}>
                  as DOCX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {!isEmpty && isEditable && uniqueSpeakers.length > 0 && (
        <div className="mb-4 p-4 border rounded-lg bg-muted/20">
          <h4 className="text-md font-semibold mb-2">Speakers</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {uniqueSpeakers.map((speaker) => (
              <div key={speaker} className="flex flex-col space-y-2">
                <Label htmlFor={`speaker-${speaker}`}>Speaker {speaker}</Label>
                <Input
                  id={`speaker-${speaker}`}
                  value={speakerNames[speaker] || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleSpeakerNameChange(speaker, e.target.value)
                  }
                  className="h-8"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 border rounded-lg overflow-hidden bg-background flex flex-col">
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
          <div className="h-full overflow-y-auto flex-1">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
    </div>
  );
};
