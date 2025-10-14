import React from "react";
import CommentItem, { CommentWithAuthor } from "./CommentItem";

export interface CommentListProps {
  comments: CommentWithAuthor[];
  currentUserId?: string;
  onReply?: (comment: CommentWithAuthor) => void;
  onEdit?: (comment: CommentWithAuthor) => void;
  onDelete?: (comment: CommentWithAuthor) => void;
  replyingToId?: string | null;
  renderReplyBox?: (comment: CommentWithAuthor) => React.ReactNode;
  editingId?: string | null;
  renderEditBox?: (comment: CommentWithAuthor) => React.ReactNode;
  onReact?: (comment: CommentWithAuthor, emoji: string) => void;
}

type CommentNode = CommentWithAuthor & { replies: CommentNode[] };

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
  onReact,
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
            onReact={onReact}
          />
          {editingId === comment.id && renderEditBox?.(comment)}
          {replyingToId === comment.id && renderReplyBox?.(comment)}
        </div>
      ))}
    </div>
  );
}

function buildTree(comments: CommentWithAuthor[]): CommentNode[] {
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
