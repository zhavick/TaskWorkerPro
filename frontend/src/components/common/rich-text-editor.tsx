"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Eraser,
  Eye,
  FileCode,
  Undo2,
  Redo2,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  required?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tuliskan isi catatan dengan format teks kaya...",
  minHeight = "200px",
  className = "",
  required = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<"visual" | "html">("visual");
  const [htmlValue, setHtmlValue] = useState(value || "");
  const isInternalUpdate = useRef(false);

  // Sync incoming value to editor content if not an internal update
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    setHtmlValue(value || "");
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    // Normalize empty content
    const normalized = content === "<br>" || content === "<p><br></p>" ? "" : content;
    isInternalUpdate.current = true;
    setHtmlValue(normalized);
    onChange(normalized);
  }, [onChange]);

  const exec = (command: string, value: string | undefined = undefined) => {
    if (viewMode !== "visual") return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleInput();
  };

  const handleInsertLink = () => {
    const url = prompt("Masukkan tautan URL (contoh: https://domain.com):");
    if (url) {
      exec("createLink", url);
    }
  };

  const handleInsertHeading = (tag: "h2" | "h3") => {
    exec("formatBlock", `<${tag}>`);
  };

  const handleInsertBlockquote = () => {
    exec("formatBlock", "<blockquote>");
  };

  const handleInsertCodeBlock = () => {
    exec("formatBlock", "<pre>");
  };

  const handleClearFormat = () => {
    exec("removeFormat");
    exec("formatBlock", "<p>");
  };

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-2xs transition focus-within:border-indigo-600 dark:border-gray-800 dark:bg-gray-950 ${className}`}
    >
      {/* Formatting Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-gray-100 bg-gray-50/70 p-2 dark:border-gray-800/80 dark:bg-gray-900/50 rounded-t-xl">
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => exec("undo")}
            disabled={viewMode !== "visual"}
            title="Undo (Ctrl+Z)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("redo")}
            disabled={viewMode !== "visual"}
            title="Redo (Ctrl+Y)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />

          {/* Text Styling */}
          <button
            type="button"
            onClick={() => exec("bold")}
            disabled={viewMode !== "visual"}
            title="Tebal (Bold / Ctrl+B)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            disabled={viewMode !== "visual"}
            title="Miring (Italic / Ctrl+I)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            disabled={viewMode !== "visual"}
            title="Garis Bawah (Underline / Ctrl+U)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("strikeThrough")}
            disabled={viewMode !== "visual"}
            title="Coret (Strikethrough)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => handleInsertHeading("h2")}
            disabled={viewMode !== "visual"}
            title="Subjudul Besar (Heading 2)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleInsertHeading("h3")}
            disabled={viewMode !== "visual"}
            title="Subjudul Sedang (Heading 3)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            disabled={viewMode !== "visual"}
            title="Daftar Butir (Bullet List)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            disabled={viewMode !== "visual"}
            title="Daftar Bernomor (Numbered List)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />

          {/* Quote & Code */}
          <button
            type="button"
            onClick={handleInsertBlockquote}
            disabled={viewMode !== "visual"}
            title="Kutipan (Blockquote)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertCodeBlock}
            disabled={viewMode !== "visual"}
            title="Blok Kode Program (Code Block)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleInsertLink}
            disabled={viewMode !== "visual"}
            title="Sisipkan Tautan (Link)"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClearFormat}
            disabled={viewMode !== "visual"}
            title="Bersihkan Format Teks"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white disabled:opacity-30"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            onClick={() => {
              setViewMode("visual");
              if (editorRef.current) {
                editorRef.current.innerHTML = htmlValue;
              }
            }}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
              viewMode === "visual"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Eye className="h-3 w-3" />
            Visual
          </button>
          <button
            type="button"
            onClick={() => setViewMode("html")}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
              viewMode === "html"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <FileCode className="h-3 w-3" />
            HTML
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="p-3">
        {viewMode === "visual" ? (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="rich-text-content prose dark:prose-invert max-w-none text-xs text-gray-800 dark:text-gray-200 leading-relaxed outline-none focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
          />
        ) : (
          <textarea
            rows={8}
            value={htmlValue}
            onChange={(e) => {
              setHtmlValue(e.target.value);
              isInternalUpdate.current = true;
              onChange(e.target.value);
            }}
            placeholder="Kode HTML dokumen..."
            style={{ minHeight }}
            className="w-full bg-transparent font-mono text-xs text-gray-800 dark:text-gray-200 outline-none resize-y"
          />
        )}
      </div>

      {/* Hidden input for HTML5 form validation if required */}
      {required && (
        <input
          type="text"
          value={htmlValue}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
