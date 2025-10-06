import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadDocImage } from "@/services/storage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Image, Eye, Pencil } from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function renderMarkdown(markdown: string) {
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const escaped = escapeHtml(markdown);

  const headingProcessed = escaped
    .replace(/^######\s+(.*)$/gm, "<h6>$1</h6>")
    .replace(/^#####\s+(.*)$/gm, "<h5>$1</h5>")
    .replace(/^####\s+(.*)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.*)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.*)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.*)$/gm, "<h1>$1</h1>");

  const emphasisProcessed = headingProcessed
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = emphasisProcessed.split(/\n{2,}/).map((paragraph) => {
    if (/^<h[1-6]>/.test(paragraph)) {
      return paragraph;
    }
    if (/^\s*[-*]\s+/.test(paragraph)) {
      const items = paragraph
        .split(/\n/)
        .filter(Boolean)
        .map((item) => item.replace(/^\s*[-*]\s+/, ""));
      return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    }
    const content = paragraph.replace(/\n/g, "<br />");
    return `<p>${content}</p>`;
  });

  return lines.join("");
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [tab, setTab] = useState("edit");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const previewHtml = useMemo(() => renderMarkdown(value), [value]);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const insertAtCursor = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${snippet}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + snippet.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!user) {
      toast({ title: "Sign in required", description: "You must be signed in to upload images." });
      return;
    }
    try {
      const { publicUrl } = await uploadDocImage(file, user.id);
      insertAtCursor(`![${file.name}](${publicUrl})`);
      toast({ title: "Image uploaded", description: "We added a link to your doc." });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: error?.message ?? "We could not upload that image.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="edit" className="flex items-center gap-1">
              <Pencil className="h-4 w-4" /> Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-3">
            <div className="flex items-center justify-between pb-2 text-xs text-muted-foreground">
              <span>Markdown supported</span>
              <Button type="button" size="sm" variant="outline" onClick={handleUploadClick}>
                <Image className="mr-1 h-4 w-4" /> Upload image
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              rows={20}
              className="font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-3">
            <div className="prose max-w-none whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
