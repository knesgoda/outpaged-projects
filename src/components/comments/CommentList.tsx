import React from 'react';
import { CommentItem } from './CommentItem';
import type { CommentWithAuthor } from '@/services/comments';

export interface CommentListProps {
  comments: (CommentWithAuthor & { mentions: string[] })[];
  currentUserId?: string;
  onReply?: (comment: CommentWithAuthor) => void;
  onEdit?: (comment: CommentWithAuthor) => void;
  onDelete?: (comment: CommentWithAuthor) => void;
  replyingToId?: string | null;
  renderReplyBox?: (comment: CommentWithAuthor) => React.ReactNode;
  editingId?: string | null;
  renderEditBox?: (comment: CommentWithAuthor) => React.ReactNode;
}

type CommentNode = CommentWithAuthor & { mentions: string[]; replies: CommentNode[] };

export function CommentList({
  comments,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  replyingToId,
  renderReplyBox,
  editingId,
  renderEditBox,
}: CommentListProps) {
  const tree = buildTree(comments);

  if (tree.length === 0) {
    return <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">No comments yet. Start the conversation.</div>;
  }

  return (
    <div className="space-y-4">
      {tree.map((comment) => (
        <div key={comment.id} className="space-y-3">
          <CommentItem
            comment={comment}
            currentUserId={currentUserId}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
          />
          {editingId === comment.id && renderEditBox?.(comment)}
          {replyingToId === comment.id && renderReplyBox?.(comment)}
        </div>
      ))}
    </div>
  );
}

function buildTree(comments: (CommentWithAuthor & { mentions: string[] })[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((comment) => {
    map.set(comment.id, { ...comment, replies: [] });
  });

  map.forEach((node) => {
    if (node.parent_id) {
      const parent = map.get(node.parent_id);
      if (parent) {
        parent.replies.push(node);
        return;
      }
    }
    roots.push(node);
  });

  return roots;
}
