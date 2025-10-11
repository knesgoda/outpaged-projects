import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadDocImage } from "@/services/storage";
import { useToast } from "@/hooks/use-toast";
import {
  Bold,
  Code,
  FileCode2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  ListChecks,
  ListOrdered,
  List as ListIcon,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Table as TableIcon,
  TextCursorInput,
  Undo2,
} from "lucide-react";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

type EditorMode = "write" | "preview";

export function MarkdownEditor({ value, onChange, placeholder, disabled }: MarkdownEditorProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<EditorMode>("write");
  const [isUploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [autosaveTimestamp, setAutosaveTimestamp] = useState<Date | null>(null);

  useEffect(() => {
    if (mode === "write") {
      textareaRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (disabled) return;
    const handle = window.setTimeout(() => {
      setAutosaveTimestamp(new Date());
    }, 3000);
    return () => window.clearTimeout(handle);
  }, [value, disabled]);

  const previewHtml = useMemo(() => {
    if (!value) return "";
    const rendered = marked.parse(value);
    if (typeof rendered === 'string') {
      return DOMPurify.sanitize(rendered);
    }
    // marked.parse can return a Promise in some configurations
    return "";
  }, [value]);

  const handleInsertAtCursor = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + snippet);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
      textarea.focus();
    });
  };

  const handleWrapSelection = (prefix: string, suffix = prefix, placeholder = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleInsertAtCursor(`${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholder;
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + selected.length;
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    });
  };

  const handleLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      handleInsertAtCursor(`${prefix}`);
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const text = value;

    const applyToLines = (input: string) =>
      input
        .split("\n")
        .map((line) => {
          const trimmed = line.replace(/^\s+/, "");
          return trimmed ? `${prefix}${trimmed}` : prefix.trimEnd();
        })
        .join("\n");

    if (start === end) {
      const lineStart = text.lastIndexOf("\n", start - 1) + 1;
      const lineEndCandidate = text.indexOf("\n", start);
      const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
      const currentLine = text.slice(lineStart, lineEnd);
      const replacement = applyToLines(currentLine || "");
      const nextValue = `${text.slice(0, lineStart)}${replacement}${text.slice(lineEnd)}`;
      onChange(nextValue);

      requestAnimationFrame(() => {
        textarea.setSelectionRange(lineStart, lineStart + replacement.length);
        textarea.focus();
      });
      return;
    }

    const before = text.slice(0, start);
    const selection = text.slice(start, end);
    const after = text.slice(end);
    const replacement = applyToLines(selection || "");
    const nextValue = `${before}${replacement}${after}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.setSelectionRange(start, start + replacement.length);
      textarea.focus();
    });
  };

  const handleBlockInsert = (content: string) => {
    const snippet = value.endsWith("\n") || value.length === 0 ? `\n${content}\n` : `\n\n${content}\n`;
    handleInsertAtCursor(snippet);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE) {
      toast({ title: "Upload too large", description: "Choose an image under 10 MB.", variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user?.id) {
        throw new Error("You must be signed in to upload images.");
      }

      const { publicUrl } = await uploadDocImage(file, user.id);
      handleInsertAtCursor(`![${file.name}](${publicUrl})`);
      toast({ title: "Image uploaded", description: "Markdown link inserted." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to upload image.";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUndo = () => {
    textareaRef.current?.focus();
    document.execCommand("undo");
  };

  const handleRedo = () => {
    textareaRef.current?.focus();
    document.execCommand("redo");
  };

  const wordCount = useMemo(() => {
    if (!value) return 0;
    return value
      .replace(/[`*_#>\[\]-]/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
  }, [value]);

  const readTimeMinutes = Math.max(1, Math.round(wordCount / 225) || 1);

  const autosaveLabel = autosaveTimestamp
    ? `Saved ${autosaveTimestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : "Saving…";

  const handleParagraphStyleChange = (style: string) => {
    switch (style) {
      case "paragraph":
        break;
      case "h1":
        handleLinePrefix("# ");
        break;
      case "h2":
        handleLinePrefix("## ");
        break;
      case "h3":
        handleLinePrefix("### ");
        break;
      case "quote":
        handleLinePrefix("> ");
        break;
      case "code":
        handleBlockInsert("```\ncode\n```");
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded border border-border/60 bg-muted/40 p-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={handleUndo} title="Undo (Ctrl/Cmd + Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={handleRedo} title="Redo (Ctrl/Cmd + Shift + Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <Select onValueChange={handleParagraphStyleChange} defaultValue="paragraph">
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Paragraph" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="paragraph">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
            <SelectItem value="quote">Quote</SelectItem>
            <SelectItem value="code">Code Block</SelectItem>
          </SelectContent>
        </Select>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleWrapSelection("**", "**", "bold text")}
            title="Bold (Ctrl/Cmd + B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleWrapSelection("*", "*", "italic text")}
            title="Italic (Ctrl/Cmd + I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleWrapSelection("~~", "~~", "struck text")}
            title="Strikethrough (Ctrl/Cmd + Shift + X)"
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleWrapSelection("==", "==", "highlight")}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleWrapSelection("`", "`", "code")}
            title="Inline code"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={() => handleLinePrefix("- ")} title="Bulleted list">
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => handleLinePrefix("1. ")} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => handleLinePrefix("- [ ] ")} title="Checklist">
            <ListChecks className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => handleLinePrefix("> ")} title="Quote">
            <Quote className="h-4 w-4" />
          </Button>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleBlockInsert("```\ncode\n```")}
            title="Code block"
          >
            <FileCode2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleBlockInsert("---")}
            title="Divider"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleUploadClick}
            disabled={disabled || isUploading}
            title="Image or attachment"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" title="Insert menu">
                <Sparkles className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => handleWrapSelection("[", "](url)", "link text") }>
                <Link2 className="mr-2 h-4 w-4" /> Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBlockInsert(`| Column A | Column B |\n| --- | --- |\n| Value | Value |`)}>
                <TableIcon className="mr-2 h-4 w-4" /> Table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBlockInsert("::: callout\nAdd context here.\n:::") }>
                <TextCursorInput className="mr-2 h-4 w-4" /> Callout block
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-border/50">
            <Button
              type="button"
              variant={mode === "write" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("write")}
            >
              Write
            </Button>
            <Button
              type="button"
              variant={mode === "preview" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("preview")}
            >
              Preview
            </Button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {mode === "write" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={14}
          disabled={disabled}
          className="font-mono"
        />
      ) : (
        <div
          className={cn(
            "prose prose-sm max-w-none rounded border border-dashed border-border/60 bg-muted/40 p-4",
            !value && "text-sm text-muted-foreground"
          )}
          dangerouslySetInnerHTML={{ __html: previewHtml || "<p>No content yet.</p>" }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border/60 pt-2 text-xs text-muted-foreground">
        <span>
          {wordCount.toLocaleString()} words · ~{readTimeMinutes} min read
        </span>
        <span>{autosaveLabel}</span>
      </div>
    </div>
  );
}
