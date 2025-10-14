import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { saveCommentDraft, getCommentDraft, deleteCommentDraft, type CommentDraftRecord } from "@/services/offline";

export interface AutosaveContent {
  html: string;
  doc: JSONContent;
  text: string;
}

export interface UseRichTextAutosaveOptions {
  key?: string;
  enabled: boolean;
  delayMs?: number;
  offlineEnabled?: boolean;
  onConflict?: (local: string, remote: string) => void;
}

export interface UseRichTextAutosaveReturn {
  saveState: "idle" | "saving" | "saved" | "error";
  lastSaved: number | null;
  saveNow: (content: AutosaveContent) => void;
  conflict: { local: string; remote: string } | null;
  resolveConflict: (strategy: "keep-local" | "keep-remote") => void;
}

export function useRichTextAutosave({
  key,
  enabled,
  delayMs = 2000,
  offlineEnabled = true,
  onConflict,
}: UseRichTextAutosaveOptions): UseRichTextAutosaveReturn {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [conflict, setConflict] = useState<{ local: string; remote: string } | null>(null);
  const timerRef = useRef<number>();
  const pendingContentRef = useRef<AutosaveContent | null>(null);

  const performSave = useCallback(async (content: AutosaveContent) => {
    if (!key || !offlineEnabled) return;

    try {
      setSaveState("saving");

      // Check for existing draft to detect conflicts
      const existing = await getCommentDraft(key);
      if (existing && existing.payload.content !== content.html) {
        // Simple conflict detection
        const timeDiff = Date.now() - existing.updatedAt;
        if (timeDiff < 30000) {
          // If less than 30s, might be a conflict
          setConflict({ local: content.html, remote: existing.payload.content });
          onConflict?.(content.html, existing.payload.content);
          setSaveState("error");
          return;
        }
      }

      // Save to IndexedDB
      const draft: CommentDraftRecord = {
        id: key,
        threadId: key.split("-")[0] || key,
        payload: {
          content: content.html,
          doc: content.doc as Record<string, unknown>,
          plaintext: content.text,
        },
        updatedAt: Date.now(),
        vectorClock: {},
        conflictPolicy: "last-write-wins",
        dependencies: [],
        attempt: 0,
      };

      await saveCommentDraft(draft);
      setSaveState("saved");
      setLastSaved(Date.now());
    } catch (error) {
      console.error("Autosave failed:", error);
      setSaveState("error");
    }
  }, [key, offlineEnabled, onConflict]);

  const saveNow = useCallback((content: AutosaveContent) => {
    if (!enabled || !key) return;

    pendingContentRef.current = content;

    // Clear existing timer
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = window.setTimeout(() => {
      if (pendingContentRef.current) {
        performSave(pendingContentRef.current);
      }
    }, delayMs);
  }, [enabled, key, delayMs, performSave]);

  const resolveConflict = useCallback((strategy: "keep-local" | "keep-remote") => {
    if (!conflict) return;

    if (strategy === "keep-local") {
      // User chose to keep local version, force save
      if (pendingContentRef.current) {
        performSave(pendingContentRef.current);
      }
    } else {
      // User chose to keep remote version, clear local changes
      // This would require updating the editor content externally
    }

    setConflict(null);
  }, [conflict, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    saveState,
    lastSaved,
    saveNow,
    conflict,
    resolveConflict,
  };
}
