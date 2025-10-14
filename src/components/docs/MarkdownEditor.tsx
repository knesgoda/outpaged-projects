import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Markdown } from "tiptap-markdown";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadDocImage } from "@/services/storage";
import { useRichTextChips } from "@/hooks/useRichTextChips";
import { searchTeammates } from "@/services/people";
import { searchCrossReferences } from "@/services/search";
import type { MentionSuggestionItem } from "@/components/rich-text/extensions/mention";
import type { CrossReferenceSuggestion } from "@/components/rich-text/extensions/xref";
import { SlashCommandExtension } from "@/components/rich-text/extensions/slash-command";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  docId?: string;
};

function markdownToHtml(markdown: string) {
  if (!markdown) return "";
  const rendered = marked.parse(markdown);
  if (typeof rendered === "string") {
    return DOMPurify.sanitize(rendered);
  }
  return "";
}

export function MarkdownEditor({ value, onChange, placeholder, disabled, docId }: MarkdownEditorProps) {
  const { toast } = useToast();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [htmlValue, setHtmlValue] = useState(() => markdownToHtml(value));
  const lastMarkdownRef = useRef(value);

  const chips = useRichTextChips(
    useMemo(
      () => ({
        mentions: {
          fetchSuggestions: async (query: string) => {
            if (!query.trim()) return [];
            const result = await searchTeammates({ q: query });
            return result.slice(0, 20).map((profile) => ({
              id: profile.user_id,
              label: profile.full_name ?? profile.email ?? "Unknown user",
              description: profile.email ?? undefined,
              avatarUrl: profile.avatar_url ?? null,
            } satisfies MentionSuggestionItem));
          },
        },
        crossReferences: {
          fetchSuggestions: async (query: string) => {
            return searchCrossReferences({ query });
          },
        },
      }),
      []
    )
  );

  const extensions = useMemo(() => [SlashCommandExtension, Markdown.configure({ html: true, linkify: true, breaks: true })], []);

  useEffect(() => {
    if (value === lastMarkdownRef.current) {
      return;
    }
    const sanitized = markdownToHtml(value);
    setHtmlValue(sanitized);
    if (editor) {
      const current = editor.getHTML();
      if (current !== sanitized) {
        editor.commands.setContent(sanitized || "<p></p>", false);
      }
    }
    lastMarkdownRef.current = value;
  }, [value, editor]);

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return [] as string[];
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user?.id) {
          throw new Error("You must be signed in to upload images.");
        }
        const urls: string[] = [];
        for (const file of files) {
          if (file.size > MAX_UPLOAD_SIZE) {
            toast({ title: "Upload too large", description: `${file.name} exceeds 10 MB.`, variant: "destructive" });
            continue;
          }
          const { publicUrl } = await uploadDocImage(file, user.id);
          urls.push(publicUrl);
        }
        if (urls.length) {
          toast({ title: "Upload complete", description: `Inserted ${urls.length} file${urls.length === 1 ? "" : "s"}.` });
        }
        return urls;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to upload image.";
        toast({ title: "Upload failed", description: message, variant: "destructive" });
        return [];
      }
    },
    [toast]
  );

  const handleInsertFromUrl = useCallback(
    async (url: string) => {
      if (!url.trim()) return;
      setHtmlValue((prev) => prev);
    },
    []
  );

  const handleChange = useCallback(
    (html: string) => {
      setHtmlValue(html);
      if (editor?.storage?.markdown?.getMarkdown) {
        const markdown = editor.storage.markdown.getMarkdown();
        lastMarkdownRef.current = markdown;
        onChange(markdown);
      }
    },
    [editor, onChange]
  );

  return (
    <RichTextEditor
      value={htmlValue}
      onChange={(html, context) => {
        handleChange(html);
        if (!editor && context.doc) {
          // Ensure markdown stays in sync when storage isn't ready yet.
          lastMarkdownRef.current = value;
        }
      }}
      onReady={setEditor}
      placeholder={placeholder}
      readOnly={disabled}
      chips={chips}
      extensions={extensions}
      attachments={{
        onUpload: handleUploadFiles,
        onInsertFromUrl: handleInsertFromUrl,
      }}
      minHeight={320}
    />
  );
}
