import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadDocImage } from "@/services/storage";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    if (mode === "write") {
      textareaRef.current?.focus();
    }
  }, [mode]);

  const previewHtml = useMemo(() => {
    const rendered = marked.parse(value || "");
    return DOMPurify.sanitize(rendered);
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded border border-border/60 bg-muted/40 p-1">
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
        <Button type="button" variant="outline" size="sm" onClick={handleUploadClick} disabled={disabled || isUploading}>
          {isUploading ? "Uploading" : "Upload image"}
        </Button>
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
    </div>
  );
}
