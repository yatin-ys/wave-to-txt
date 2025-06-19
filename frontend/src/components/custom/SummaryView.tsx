import { AlertCircle, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ActionToolbar } from "./ActionToolbar";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { Packer, Document as DocxDocument, Paragraph } from "docx";
import { pdf } from "@react-pdf/renderer";
import { SummaryPDF } from "./SummaryPDF";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface SummaryViewProps {
  summary: string | null;
  summaryStatus: string | null;
  summaryError: string | null;
  onGenerateSummary: () => void;
}

export const SummaryView = ({
  summary,
  summaryStatus,
  summaryError,
  onGenerateSummary,
}: SummaryViewProps) => {
  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    toast.success("Summary copied to clipboard.");
  };

  const handleExport = async (format: "txt" | "pdf" | "docx") => {
    if (!summary) return;

    if (format === "txt") {
      const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
      saveAs(blob, "summary.txt");
      toast.success("Exported as TXT");
    } else if (format === "pdf") {
      try {
        toast.info("Generating PDF...");
        const doc = <SummaryPDF summary={summary} />;
        const blob = await pdf(doc).toBlob();
        saveAs(blob, "summary.pdf");
        toast.success("PDF Exported Successfully");
      } catch (error) {
        console.error("Failed to export as PDF:", error);
        toast.error("PDF Export Failed");
      }
    } else if (format === "docx") {
      try {
        const doc = new DocxDocument({
          sections: [
            {
              children: [new Paragraph({ text: summary })],
            },
          ],
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, "summary.docx");
        toast.success("Exported as DOCX");
      } catch (error) {
        console.error("Failed to export as DOCX:", error);
        toast.error("DOCX Export Failed");
      }
    }
  };

  if (summaryStatus === "pending") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-semibold">Generating Summary</p>
        <p className="text-sm text-muted-foreground">
          Please wait while we process the summary...
        </p>
      </div>
    );
  }

  if (summaryStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Summarization Failed</AlertTitle>
          <AlertDescription>
            {summaryError ||
              "An unexpected error occurred while generating the summary."}
          </AlertDescription>
        </Alert>
        <Button onClick={onGenerateSummary} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (summaryStatus === "completed" && summary) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Generated Summary
          </h3>
          <ActionToolbar onCopy={handleCopy} onExport={handleExport} />
        </div>
        <ScrollArea className="flex-1 rounded-md border p-4 bg-muted/20">
          <div className="prose prose-base max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                // Custom styling for markdown elements
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-3 ml-6 list-disc space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-3 ml-6 list-decimal space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold mb-3 mt-4 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold mb-2 mt-3 first:mt-0">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0">
                    {children}
                  </h4>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-primary/30 pl-4 my-3 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-muted p-3 rounded overflow-x-auto text-sm font-mono my-3">
                    {children}
                  </pre>
                ),
                hr: () => <hr className="border-border my-4" />,
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <Sparkles className="h-12 w-12 text-primary mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Unlock Key Insights</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Generate a concise summary of the transcription to quickly understand
        the main points.
      </p>
      <Button
        onClick={onGenerateSummary}
        disabled={summaryStatus === "pending"}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Generate Summary
      </Button>
    </div>
  );
};
