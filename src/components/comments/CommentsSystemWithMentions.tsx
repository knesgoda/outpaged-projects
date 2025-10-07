import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useComments, useCreateComment, useDeleteComment, useUpdateComment } from '@/hooks/useComments';
import type { CommentEntityType } from '@/types';
import { CommentBox } from './CommentBox';
import { CommentList } from './CommentList';
import type { CommentWithAuthor } from '@/services/comments';

interface CommentsSystemWithMentionsProps {
  entityType: CommentEntityType;
  entityId: string;
  projectId?: string;
  title?: string;
  onCountChange?: (count: number) => void;
}

export function CommentsSystemWithMentions({ entityType, entityId, projectId, title = 'Comments', onCountChange }: CommentsSystemWithMentionsProps) {
  const { user } = useAuth();
  const entity = { type: entityType, id: entityId } as const;

  const { data: comments = [], isLoading } = useComments(entity);
  const createMutation = useCreateComment(entity);
  const updateMutation = useUpdateComment(entity);
  const deleteMutation = useDeleteComment(entity);

  const [replyingTo, setReplyingTo] = useState<CommentWithAuthor | null>(null);
  const [editing, setEditing] = useState<CommentWithAuthor | null>(null);

  useEffect(() => {
    onCountChange?.(comments.length);
  }, [comments.length, onCountChange]);

  const handleCreate = async ({ markdown, html, mentions }: SubmitPayload) => {
    await createMutation.mutateAsync({
      body_markdown: markdown,
      body_html: html,
      mentions,
    });
  };

  const handleReply = async (comment: CommentWithAuthor, payload: SubmitPayload) => {
    await createMutation.mutateAsync({
      parent_id: comment.id,
      body_markdown: payload.markdown,
      body_html: payload.html,
      mentions: payload.mentions,
    });
    setReplyingTo(null);
  };

  const handleEdit = async (comment: CommentWithAuthor, payload: SubmitPayload) => {
    await updateMutation.mutateAsync({
      id: comment.id,
      patch: {
        body_markdown: payload.markdown,
        body_html: payload.html,
        mentions: payload.mentions,
      },
    });
    setEditing(null);
  };

  const handleDelete = (comment: CommentWithAuthor) => {
    deleteMutation.mutate({ id: comment.id });
  };

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
          onSubmit={handleCreate}
          projectId={projectId}
          submitting={createMutation.isPending}
          placeholder="Share an update or ask a question…"
        />

        {isLoading ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <CommentList
            comments={comments}
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
                onSubmit={(payload) => handleReply(comment, payload)}
                onCancel={() => setReplyingTo(null)}
                projectId={projectId}
                submitting={createMutation.isPending}
                autoFocus
                submitLabel="Reply"
              />
            )}
            editingId={editing?.id ?? null}
            renderEditBox={(comment) => (
              <CommentBox
                key={`edit-${comment.id}`}
                onSubmit={(payload) => handleEdit(comment, payload)}
                onCancel={() => setEditing(null)}
                initialValue={comment.body_markdown}
                projectId={projectId}
                submitting={updateMutation.isPending}
                autoFocus
                submitLabel="Save"
              />
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}

type SubmitPayload = {
  markdown: string;
  html: string;
  mentions: string[];
};
