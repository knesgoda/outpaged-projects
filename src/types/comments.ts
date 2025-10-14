import type { ID } from "./core";

export type CommentEntityType = "task" | "project" | "doc";

export type Comment = {
  id: ID;
  entity_type: CommentEntityType;
  entity_id: ID;
  author: ID;
  parent_id?: ID | null;
  body_markdown: string;
  body_html?: string | null;
  body_json?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  edited_by?: ID | null;
};

export type CommentMention = {
  id: ID;
  comment_id: ID;
  mentioned_user: ID;
  created_at: string;
};

export type CommentCrossReference = {
  comment_id: ID;
  target_type: "task" | "project" | "doc" | "file" | "comment";
  target_id: ID;
  context?: string | null;
  created_at: string;
};

export type CommentReaction = {
  id: ID;
  comment_id: ID;
  user_id: ID;
  emoji: string;
  created_at: string;
};

export type CommentHistoryEntry = {
  id: ID;
  comment_id: ID;
  version: number;
  body_markdown: string;
  body_html?: string | null;
  body_json?: Record<string, unknown> | null;
  edited_at: string;
  edited_by?: ID | null;
};
