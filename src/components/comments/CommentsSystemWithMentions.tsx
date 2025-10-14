import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useComments, useDeleteComment } from "@/hooks/useComments";
import type { CommentEntityType } from "@/types";
import { CommentBox, type CommentBoxSubmitPayload } from "./CommentBox";
import { CommentList } from "./CommentList";
import type { CommentWithAuthor } from "./CommentItem";
import { useOfflineCommentSync } from "@/hooks/offline/useOfflineCommentSync";
import { useToast } from "@/components/ui/use-toast";
import { createComment, updateComment, toggleCommentReaction } from "@/services/comments";
import { useQueryClient } from "@tanstack/react-query";

type OfflineCommentPayload =
  | {
      action: "create";
      tempId: string;
      input: Parameters<typeof createComment>[0];
      author: CommentWithAuthor["author_profile"];
    }
  | {
      action: "update";
      id: string;
      patch: Parameters<typeof updateComment>[1];
    };

interface CommentsSystemWithMentionsProps {
  entityType: CommentEntityType;
  entityId: string;
  projectId?: string;
  title?: string;
  onCountChange?: (count: number) => void;
}

export function CommentsSystemWithMentions({ entityType, entityId, projectId, title = "Comments", onCountChange }: CommentsSystemWithMentionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const entity = { type: entityType, id: entityId } as const;
  const threadId = `${entityType}:${entityId}`;

  const { data: comments = [], isLoading } = useComments(entity);
  const deleteMutation = useDeleteComment(entity);

  const offlineSync = useOfflineCommentSync({
    threadId,
    processor: async (mutation) => {
      const payload = mutation.payload as OfflineCommentPayload;
      try {
        if (payload?.action === "create") {
          const created = await createComment(payload.input);
          queryClient.setQueryData<CommentWithAuthor[] | undefined>(['comments', entity.type, entity.id], (prev) => {
            if (!prev) return [created];
            return [...prev, created];
          });
          return { kind: "success", record: created } as const;
        }
        if (payload?.action === "update") {
          const updated = await updateComment(payload.id, payload.patch);
          queryClient.setQueryData<CommentWithAuthor[] | undefined>(['comments', entity.type, entity.id], (prev) => {
            if (!prev) return prev;
            return prev.map((comment) => (comment.id === updated.id ? updated : comment));
          });
          return { kind: "success", record: updated } as const;
        }
        return { kind: "skipped" } as const;
      } catch (error) {
        return { kind: "conflict", remote: {}, reason: error instanceof Error ? error.message : String(error) } as const;
      }
    },
  });

  const [replyingTo, setReplyingTo] = useState<CommentWithAuthor | null>(null);
  const [editing, setEditing] = useState<CommentWithAuthor | null>(null);

  const pendingComments = useMemo(() => {
    if (!user) return [];
    return offlineSync.mutations
      .filter((mutation) => mutation.status !== "synced")
      .map((mutation) => mutation.payload as OfflineCommentPayload)
      .filter((payload): payload is OfflineCommentPayload & { action: "create" } => payload?.action === "create")
      .map((payload) => buildPendingComment(payload, user));
  }, [offlineSync.mutations, user]);

  const allComments = useMemo(() => {
    if (pendingComments.length === 0) return comments;
    return [...comments, ...pendingComments];
  }, [comments, pendingComments]);

  useEffect(() => {
    onCountChange?.(comments.length + pendingComments.length);
  }, [comments.length, onCountChange, pendingComments.length]);

  useEffect(() => {
    if (navigator.onLine) {
      void offlineSync.process();
    }
  }, [offlineSync]);

  const handleCreate = useCallback(
    async (payload: CommentBoxSubmitPayload, parent?: CommentWithAuthor | null) => {
      const input: Parameters<typeof createComment>[0] = {
        entity_type: entity.type,
        entity_id: entity.id,
        parent_id: parent?.id ?? null,
        body_markdown: payload.markdown,
        body_html: payload.html,
        body_json: payload.doc,
        mentions: payload.mentions,
        cross_references: payload.crossReferences.map((xref) => ({ id: xref.id, type: xref.type, title: xref.title, url: xref.url ?? null })),
      };

      try {
        const created = await createComment(input);
        queryClient.setQueryData<CommentWithAuthor[] | undefined>(['comments', entity.type, entity.id], (prev) => {
          if (!prev) return [created];
          return [...prev, created];
        });
        if (parent) {
          setReplyingTo(null);
        }
      } catch (error) {
        if (isOfflineError(error)) {
          if (!user) return;
          const tempId = `offline-${Date.now()}`;
          await offlineSync.enqueue({
            action: "create",
            tempId,
            input,
            author: {
              id: user.id,
              full_name: (user.user_metadata as Record<string, unknown>)?.full_name as string | undefined ?? user.email ?? "You",
              avatar_url: (user.user_metadata as Record<string, unknown>)?.avatar_url as string | undefined ?? null,
              email: user.email ?? undefined,
            },
          });
          toast({ title: "Comment queued", description: "We'll post it once you're back online." });
          if (parent) {
            setReplyingTo(null);
          }
        } else {
          toast({
            title: "Unable to post comment",
            description: error instanceof Error ? error.message : String(error),
            variant: "destructive",
          });
        }
      }
    },
    [entity.id, entity.type, offlineSync, queryClient, toast, user]
  );

  const handleEdit = useCallback(
    async (comment: CommentWithAuthor, payload: CommentBoxSubmitPayload) => {
      const patch: Parameters<typeof updateComment>[1] = {
        body_markdown: payload.markdown,
        body_html: payload.html,
        body_json: payload.doc,
        mentions: payload.mentions,
        cross_references: payload.crossReferences.map((xref) => ({ id: xref.id, type: xref.type, title: xref.title, url: xref.url ?? null })),
      };

      try {
        const updated = await updateComment(comment.id, patch);
        queryClient.setQueryData<CommentWithAuthor[] | undefined>(['comments', entity.type, entity.id], (prev) => {
          if (!prev) return prev;
          return prev.map((item) => (item.id === updated.id ? updated : item));
        });
        setEditing(null);
      } catch (error) {
        if (isOfflineError(error) && user) {
          await offlineSync.enqueue({ action: "update", id: comment.id, patch });
          toast({ title: "Edit queued", description: "We'll update the comment when you're back online." });
          setEditing(null);
        } else {
          toast({
            title: "Unable to update comment",
            description: error instanceof Error ? error.message : String(error),
            variant: "destructive",
          });
        }
      }
    },
    [entity.id, entity.type, offlineSync, queryClient, toast, user]
  );

  const handleDelete = useCallback(
    (comment: CommentWithAuthor) => {
      deleteMutation.mutate({ id: comment.id });
    },
    [deleteMutation]
  );

  const handleReaction = useCallback(
    async (comment: CommentWithAuthor, emoji: string) => {
      try {
        const reactions = await toggleCommentReaction(comment.id, emoji);
        queryClient.setQueryData<CommentWithAuthor[] | undefined>(['comments', entity.type, entity.id], (prev) => {
          if (!prev) return prev;
          return prev.map((item) => (item.id === comment.id ? { ...item, reactions } : item));
        });
      } catch (error) {
        if (!isOfflineError(error)) {
          throw error;
        }
        toast({ title: "Offline", description: "Reactions will sync when back online." });
      }
    },
    [entity.id, entity.type, queryClient, toast]
  );

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Sign in to join the discussion.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/70">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CommentBox
          onSubmit={(payload) => handleCreate(payload, null)}
          projectId={projectId}
          submitting={false}
          placeholder="Share an update or ask a question…"
          draftKey={`comment:${threadId}:root`}
        />

        {isLoading ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <CommentList
            comments={allComments}
            currentUserId={user.id}
            onReply={(comment) => {
              setEditing(null);
              setReplyingTo(comment);
            }}
            onEdit={(comment) => {
              setReplyingTo(null);
              setEditing(comment);
            }}
            onDelete={handleDelete}
            replyingToId={replyingTo?.id ?? null}
            renderReplyBox={(comment) => (
              <CommentBox
                key={`reply-${comment.id}`}
                onSubmit={(payload) => handleCreate(payload, comment)}
                onCancel={() => setReplyingTo(null)}
                projectId={projectId}
                submitting={false}
                autoFocus
                submitLabel="Reply"
                draftKey={`comment:${threadId}:reply:${comment.id}`}
              />
            )}
            editingId={editing?.id ?? null}
            renderEditBox={(comment) => (
              <CommentBox
                key={`edit-${comment.id}`}
                onSubmit={(payload) => handleEdit(comment, payload)}
                onCancel={() => setEditing(null)}
                initialValue={comment.body_markdown}
                initialHtml={comment.body_html ?? undefined}
                initialDoc={comment.body_json ?? undefined}
                projectId={projectId}
                submitting={false}
                autoFocus
                submitLabel="Save"
              />
            )}
            onReact={handleReaction}
          />
        )}
      </CardContent>
    </Card>
  );
}

function buildPendingComment(payload: OfflineCommentPayload & { action: "create" }, user: NonNullable<ReturnType<typeof useAuth>["user"]>): CommentWithAuthor {
  const baseProfile = {
    id: payload.author.id,
    full_name: payload.author.full_name ?? user.user_metadata?.full_name ?? user.email ?? "You",
    avatar_url: payload.author.avatar_url ?? (user.user_metadata as Record<string, unknown>)?.avatar_url?.toString?.() ?? undefined,
    email: payload.author.email ?? user.email ?? undefined,
  };

  return {
    id: payload.tempId,
    entity_type: payload.input.entity_type,
    entity_id: payload.input.entity_id,
    author: baseProfile.id,
    parent_id: payload.input.parent_id ?? null,
    body_markdown: payload.input.body_markdown,
    body_html: payload.input.body_html ?? null,
    body_json: payload.input.body_json ?? null,
    metadata: { status: "pending" },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    edited_at: null,
    edited_by: null,
    author_profile: baseProfile,
    mentions: payload.input.mentions ?? [],
    cross_references: (payload.input.cross_references ?? []).map((xref) => ({
      id: xref.id,
      type: xref.type,
      title: xref.title ?? xref.id,
      url: xref.url ?? null,
    })),
    reactions: [],
    history: [],
  };
}

function isOfflineError(error: unknown) {
  if (!navigator.onLine) return true;
  if (error instanceof Error && /fetch|network|offline/i.test(error.message)) return true;
  return false;
}
