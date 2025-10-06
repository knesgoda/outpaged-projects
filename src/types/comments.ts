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
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
};

export type CommentMention = {
  id: ID;
  comment_id: ID;
  mentioned_user: ID;
  created_at: string;
};
