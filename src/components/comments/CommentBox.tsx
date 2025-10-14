import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { Button } from "@/components/ui/button";
import { RichTextEditor } from "@/components/rich-text/RichTextEditor";
import { createMentionExtension, type MentionSuggestionItem } from "@/components/rich-text/extensions/mention";
import { createCrossReferenceExtension, type CrossReferenceSuggestion } from "@/components/rich-text/extensions/xref";
import { SlashCommandExtension } from "@/components/rich-text/extensions/slash-command";
import { searchTeammates } from "@/services/people";
import { markdownToHtml } from "@/lib/markdown";
import { deleteCommentDraft, getCommentDraft, saveCommentDraft } from "@/services/offline";
import { useToast } from "@/components/ui/use-toast";
import type { CommentDraftRecord } from "@/services/offline";
import { searchAll } from "@/services/search";

export interface CommentBoxSubmitPayload {
  html: string;
  markdown: string;
  mentions: string[];
  crossReferences: Array<{ id: string; type: CrossReferenceSuggestion["type"]; title: string; url?: string | null }>;
  doc: JSONContent;
  text: string;
}

interface CommentBoxProps {
  onSubmit: (payload: CommentBoxSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
  initialValue?: string;
  initialHtml?: string;
  initialDoc?: JSONContent | null;
  autoFocus?: boolean;
  submitting?: boolean;
  projectId?: string;
  placeholder?: string;
  submitLabel?: string;
  draftKey?: string;
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export function CommentBox({
  onSubmit,
  onCancel,
  initialValue,
  initialHtml,
  initialDoc,
  autoFocus,
  submitting,
  projectId,
  placeholder = "Write a comment…",
  submitLabel = "Comment",
  draftKey,
}: CommentBoxProps) {
  const { toast } = useToast();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [contentHtml, setContentHtml] = useState<string>(() => {
    if (initialHtml) return initialHtml;
    if (initialValue) return markdownToHtml(initialValue);
    return "";
  });
  const [doc, setDoc] = useState<JSONContent>(initialDoc ?? EMPTY_DOC);
  const [textContent, setTextContent] = useState<string>(initialValue ?? "");
  const [mentions, setMentions] = useState<string[]>([]);
  const [xrefs, setXrefs] = useState<CrossReferenceSuggestion[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const isEmpty = textContent.trim().length === 0 && mentions.length === 0 && xrefs.length === 0;

  useEffect(() => {
    if (initialDoc) {
      setMentions(extractMentionIds(initialDoc));
      setXrefs(extractCrossReferences(initialDoc));
    }
  }, [initialDoc]);

  const mentionExtension = useMemo(
    () =>
      createMentionExtension({
        fetchSuggestions: async (query) => {
          if (!query.trim()) return [];
          const result = await searchTeammates({ q: query, projectId });
          return result.slice(0, 20).map((profile) => ({
            id: profile.user_id,
            label: profile.full_name ?? profile.email ?? "Unknown user",
            description: profile.email ?? undefined,
            avatarUrl: profile.avatar_url ?? null,
          } satisfies MentionSuggestionItem));
        },
      }),
    [projectId]
  );

  const crossReferenceExtension = useMemo(
    () =>
      createCrossReferenceExtension({
        fetchSuggestions: async (query) => {
          const { items } = await searchAllForXrefs(query, projectId);
          return items;
        },
        onSelect: (item) => {
          setXrefs((current) => {
            const existing = current.find((xref) => xref.id === item.id && xref.type === item.type);
            if (existing) return current;
            return [...current, item];
          });
        },
      }),
    [projectId]
  );

  const extensions = useMemo(() => [mentionExtension, crossReferenceExtension, SlashCommandExtension], [mentionExtension, crossReferenceExtension]);

  const handleReady = useCallback(
    (instance: Editor) => {
      setEditor(instance);
      if (autoFocus) {
        instance.commands.focus("end");
      }
    },
    [autoFocus]
  );

  useEffect(() => {
    if (!draftKey || draftRestored) return;
    void (async () => {
      const draft = await getCommentDraft(draftKey);
      if (!draft?.payload?.content) {
        setDraftRestored(true);
        return;
      }
      setContentHtml(draft.payload.content);
      if (draft.payload.doc) {
        setDoc(draft.payload.doc);
        setMentions(extractMentionIds(draft.payload.doc as JSONContent));
        setXrefs(extractCrossReferences(draft.payload.doc as JSONContent));
      }
      if (draft.payload.plaintext) {
        setTextContent(draft.payload.plaintext);
      }
      setDraftRestored(true);
    })();
  }, [draftKey, draftRestored]);

  const handleChange = useCallback(
    (html: string, context: { doc: JSONContent; text: string }) => {
      setContentHtml(html);
      setDoc(context.doc);
      setTextContent(context.text ?? "");
      const mentionIds = extractMentionIds(context.doc);
      setMentions(mentionIds);
      setXrefs(extractCrossReferences(context.doc));
      if (draftKey) {
        const draft: CommentDraftRecord = {
          id: draftKey,
          threadId: draftKey,
          payload: { content: html, doc: context.doc, plaintext: context.text },
          updatedAt: Date.now(),
          vectorClock: {},
          conflictPolicy: { strategy: "lww" },
          dependencies: [],
          attempt: 0,
          lastAttemptAt: Date.now(),
          batchKey: null,
        };
        void saveCommentDraft(draft);
      }
    },
    [draftKey]
  );

  const resetState = useCallback(() => {
    setContentHtml("");
    setDoc(EMPTY_DOC);
    setTextContent("");
    setMentions([]);
    setXrefs([]);
    editor?.commands.clearContent();
  }, [editor]);

  const handleSubmit = useCallback(async () => {
    const html = contentHtml.trim();
    if (!html && textContent.trim().length === 0) {
      return;
    }
    const markdown = textContent.trim();
    const payload: CommentBoxSubmitPayload = {
      html,
      markdown,
      mentions,
      crossReferences: xrefs.map((xref) => ({ id: xref.id, type: xref.type, title: xref.title, url: xref.url ?? undefined })),
      doc,
      text: textContent,
    };
    try {
      await onSubmit(payload);
      if (draftKey) {
        await deleteCommentDraft(draftKey);
      }
      resetState();
    } catch (error) {
      console.error("comment:submit", error);
      toast({ title: "Unable to post comment", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  }, [contentHtml, doc, draftKey, mentions, onSubmit, resetState, textContent, toast, xrefs]);

  return (
    <div className="space-y-3">
      <RichTextEditor
        value={contentHtml}
        onChange={handleChange}
        placeholder={placeholder}
        extensions={extensions}
        onReady={handleReady}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={submitting || isEmpty}>
          {submitting ? "Sending…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function extractMentionIds(content: JSONContent): string[] {
  const ids = new Set<string>();
  traverseNodes(content, (node) => {
    if (node.type === "mention" && typeof node.attrs?.id === "string") {
      ids.add(node.attrs.id);
    }
  });
  return Array.from(ids);
}

function extractCrossReferences(content: JSONContent): CrossReferenceSuggestion[] {
  const results: CrossReferenceSuggestion[] = [];
  traverseNodes(content, (node) => {
    if (node.type === "xref" && node.attrs?.id) {
      results.push({
        id: node.attrs.id,
        type: node.attrs.type ?? "task",
        title: node.attrs.title ?? node.attrs.id,
        subtitle: node.attrs.subtitle ?? undefined,
        url: node.attrs.url ?? undefined,
      });
    }
  });
  return results;
}

function traverseNodes(node: JSONContent, visit: (node: JSONContent) => void) {
  visit(node);
  if (node.content) {
    for (const child of node.content) {
      traverseNodes(child as JSONContent, visit);
    }
  }
}

async function searchAllForXrefs(query: string, projectId?: string) {
  if (!query.trim()) {
    return { items: [] as CrossReferenceSuggestion[] };
  }
  const result = await searchAll({ q: query, projectId, limit: 8 });
  const items: CrossReferenceSuggestion[] = result.items
    .filter((item) => ["task", "project", "doc", "file", "comment"].includes(item.type))
    .map((item) => ({
      id: item.id,
      type: item.type as CrossReferenceSuggestion["type"],
      title: item.title ?? item.key ?? item.id,
      subtitle: item.snippet ?? item.description ?? undefined,
      url: item.url ?? undefined,
    }));
  return { items };
}
