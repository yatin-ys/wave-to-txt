// frontend/src/components/TranscriptEditor.tsx
import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import "./TranscriptEditor.css";

interface Utterance {
  speaker: string | null;
  text: string;
}

interface TranscriptEditorProps {
  utterances: Utterance[] | null;
}

const utterancesToHtml = (utterances: Utterance[]): string => {
  return utterances
    .map((u) => {
      const speakerLabel = u.speaker
        ? `<strong>Speaker ${u.speaker}:</strong>`
        : "";
      return `<p>${speakerLabel} ${u.text}</p>`;
    })
    .join("");
};

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ utterances }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState("Copy Text");
  const originalContentRef = useRef<string>("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: false,
  });

  useEffect(() => {
    if (editor && utterances) {
      const newContent = utterancesToHtml(utterances);
      if (editor.getHTML() !== newContent) {
        editor.commands.setContent(newContent);
        // Set the initial content for the "cancel" functionality
        originalContentRef.current = newContent;
      }
    }
  }, [utterances, editor]);

  // Effect to toggle Tiptap's editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
    }
  }, [isEditing, editor]);

  const handleEdit = () => {
    originalContentRef.current = editor?.getHTML() || "";
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (editor) {
      editor.commands.setContent(originalContentRef.current);
    }
    setIsEditing(false);
  };

  const handleSave = () => {
    // In a real app, you might send the editor.getHTML() to a backend here.
    // For now, we just exit editing mode, keeping the changes.
    setIsEditing(false);
  };

  const handleCopy = () => {
    if (!editor) return;
    const textToCopy = editor.getText({ blockSeparator: "\n\n" });
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyButtonText("Copied!");
      setTimeout(() => setCopyButtonText("Copy Text"), 2000);
    });
  };

  if (!utterances) {
    return null;
  }

  return (
    <div
      className={`editor-container success-container ${
        isEditing ? "is-editing" : ""
      }`}
    >
      <div className="editor-header">
        <div className="success-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9 12L11 14L15 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
        <h3>Transcription Complete</h3>
      </div>
      <div className="editor-content-wrapper">
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="bubble-menu"
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive("bold") ? "is-active" : ""}
            >
              Bold
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive("italic") ? "is-active" : ""}
            >
              Italic
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive("strike") ? "is-active" : ""}
            >
              Strike
            </button>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} className="transcript-editor" />
        <div className="editor-actions">
          {isEditing ? (
            <div className="edit-actions">
              <button className="secondary-button" onClick={handleCancel}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSave}>
                Save
              </button>
            </div>
          ) : (
            <div className="view-actions">
              <button className="copy-button" onClick={handleCopy}>
                {copyButtonText}
              </button>
              <button className="primary-button" onClick={handleEdit}>
                Edit Transcript
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptEditor;
