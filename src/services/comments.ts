import type { JSONContent } from "@tiptap/core";
import { supabase } from "@/integrations/supabase/client";
import { notifyDocCommentEvent } from "@/services/docs";
import { addTaskWatchers } from "@/services/tasks/taskWatchers";
import { createNotification } from "@/services/notifications";
import { upsertCommentBacklinks } from "@/services/xref";
import type {
  Comment,
  CommentEntityType,
  CommentHistoryEntry,
  CommentMention,
  CommentReaction,
  CommentCrossReference,
  ProfileLite,
} from "@/types";

const MAX_MENTIONS_PER_COMMENT = 50;
const MAX_CROSS_REFERENCES = 25;

type CommentEntity = { type: CommentEntityType; id: string };

type CreateCommentInput = {
  entity_type: CommentEntityType;
  entity_id: string;
  parent_id?: string | null;
  body_markdown: string;
  body_html?: string | null;
  body_json?: JSONContent | null;
  mentions?: string[];
  cross_references?: Array<{ id: string; type: CommentCrossReference["target_type"]; title?: string; url?: string | null }>;
};

type UpdateCommentInput = {
  body_markdown: string;
  body_html?: string | null;
  body_json?: JSONContent | null;
  mentions?: string[];
  cross_references?: Array<{ id: string; type: CommentCrossReference["target_type"]; title?: string; url?: string | null }>;
};

export type CommentReactionSummary = {
  emoji: string;
  userIds: string[];
};

export type CommentWithAuthor = Comment & {
  author_profile: ProfileLite;
  mentions: string[];
  cross_references: Array<{ id: string; type: CommentCrossReference["target_type"]; title: string; url?: string | null }>;
  reactions: CommentReactionSummary[];
  history: CommentHistoryEntry[];
};

export async function listComments(entity: CommentEntity): Promise<CommentWithAuthor[]> {
  const { data: currentUserData } = await supabase.auth.getUser();
  const currentUserId = currentUserData?.user?.id ?? null;

  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      id,
      entity_type,
      entity_id,
      author,
      parent_id,
      body_markdown,
      body_html,
      body_json,
      metadata,
      created_at,
      updated_at,
      edited_at,
      edited_by,
      author_profile:profiles!comments_author_fkey (
        user_id,
        full_name,
        avatar_url,
        email
      ),
      comment_mentions:comment_mentions(mentioned_user),
      comment_backlinks:comment_backlinks(
        target_id,
        target_type,
        context,
        created_at
      ),
      comment_reactions:comment_reactions(
        user_id,
        emoji,
        created_at
      ),
      comment_history:comment_history(
        id,
        version,
        body_markdown,
        body_html,
        body_json,
        edited_at,
        edited_by
      )
    `
    )
    .eq("entity_type", entity.type)
    .eq("entity_id", entity.id)
    .order("created_at", { ascending: true }) as unknown as {
    data: any[] | null;
    error: Error | null;
  };

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapCommentRow);
}

export async function createComment(input: CreateCommentInput): Promise<CommentWithAuthor> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("comments")
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      parent_id: input.parent_id ?? null,
      author: user.id,
      body_markdown: input.body_markdown,
      body_html: input.body_html ?? null,
      body_json: input.body_json ?? null,
    } as any)
    .select(
      `
        id,
        entity_type,
        entity_id,
        author,
        parent_id,
        body_markdown,
        body_html,
        body_json,
        metadata,
        created_at,
        updated_at,
        edited_at,
        edited_by,
        author_profile:profiles!comments_author_fkey (
          user_id,
          full_name,
          avatar_url,
          email
        )
      `
    )
    .single();

  if (error) {
    throw error;
  }

  const comment = mapCommentRow(data);

  const mentionIds = dedupeIds(input.mentions, MAX_MENTIONS_PER_COMMENT);
  if (mentionIds.length > 0) {
    await persistMentions({
      commentId: comment.id,
      mentionIds,
      entityType: input.entity_type,
      entityId: input.entity_id,
      authorId: user.id,
    });
    comment.mentions = mentionIds;
  }

  const backlinks = dedupeBacklinks(input.cross_references);
  if (backlinks.length > 0) {
    await upsertCommentBacklinks(comment.id, backlinks);
    comment.cross_references = backlinks.map((link) => ({
      id: link.id,
      type: link.type,
      title: link.title ?? link.id,
      url: link.url ?? null,
    }));
  }

  if (input.entity_type === "doc") {
    await notifyDocCommentEvent(input.entity_id, {
      commentId: comment.id,
      userId: comment.author,
      body: comment.body_markdown,
    });
  }

  return comment;
}

export async function updateComment(id: string, patch: UpdateCommentInput): Promise<CommentWithAuthor> {
  const { data: existing, error: existingError } = await supabase
    .from("comments")
    .select("id, entity_type, entity_id, author, body_markdown, body_html, body_json")
    .eq("id", id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (!existing) throw new Error("Comment not found");

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error("Not authenticated");

  // Capture history before update
  await supabase.from("comment_history").insert({
    comment_id: id,
    body_markdown: existing.body_markdown ?? "",
    body_html: existing.body_html ?? null,
    body_json: existing.body_json ?? null,
    edited_by: user.id,
  });

  const { data, error } = await supabase
    .from("comments")
    .update({
      body_markdown: patch.body_markdown,
      body_html: patch.body_html ?? null,
      body_json: patch.body_json ?? null,
      edited_at: new Date().toISOString(),
      edited_by: user.id,
    })
    .eq("id", id)
    .select(
      `
        id,
        entity_type,
        entity_id,
        author,
        parent_id,
        body_markdown,
        body_html,
        body_json,
        metadata,
        created_at,
        updated_at,
        edited_at,
        edited_by,
        author_profile:profiles!comments_author_fkey (
          user_id,
          full_name,
          avatar_url,
          email
        ),
        comment_history:comment_history(
          id,
          version,
          body_markdown,
          body_html,
          body_json,
          edited_at,
          edited_by
        )
      `
    )
    .single();

  if (error) throw error;

  const comment = mapCommentRow(data);

  const newMentions = dedupeIds(patch.mentions, MAX_MENTIONS_PER_COMMENT);
  const synced = await syncMentions({
    commentId: comment.id,
    newMentionIds: newMentions,
    authorId: user.id,
    entityType: existing.entity_type as CommentEntityType,
    entityId: existing.entity_id,
  });
  comment.mentions = synced;

  const backlinks = dedupeBacklinks(patch.cross_references);
  if (backlinks) {
    await upsertCommentBacklinks(comment.id, backlinks);
    comment.cross_references = backlinks.map((link) => ({
      id: link.id,
      type: link.type,
      title: link.title ?? link.id,
      url: link.url ?? null,
    }));
  }

  return comment;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleCommentReaction(commentId: string, emoji: string): Promise<CommentReactionSummary[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const user = userData.user;
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("comment_reactions").delete().eq("id", existing.id);
  } else {
    await supabase.from("comment_reactions").insert({
      comment_id: commentId,
      user_id: user.id,
      emoji,
    });
  }

  const { data, error } = await supabase
    .from("comment_reactions")
    .select("emoji, user_id")
    .eq("comment_id", commentId);

  if (error) throw error;

  return summarizeReactions(data ?? []);
}

type PersistMentionsArgs = {
  commentId: string;
  mentionIds: string[];
  entityType: CommentEntityType;
  entityId: string;
  authorId: string;
};

type SyncMentionsArgs = {
  commentId: string;
  newMentionIds: string[];
  authorId: string;
  entityType: CommentEntityType;
  entityId: string;
};

type CreateMentionNotificationsArgs = {
  userIds: string[];
  entityType: CommentEntityType;
  entityId: string;
  authorId: string;
  commentId: string;
};

async function persistMentions({ commentId, mentionIds, entityType, entityId, authorId }: PersistMentionsArgs) {
  if (mentionIds.length === 0) return;
  const rows = mentionIds.map((id) => ({ comment_id: commentId, mentioned_user: id }));
  await supabase.from("comment_mentions").upsert(rows, { onConflict: "comment_id,mentioned_user" });
  await createMentionNotifications({ userIds: mentionIds, entityType, entityId, authorId, commentId });
  if (entityType === "task") {
    await addTaskWatchers({ taskId: entityId, userIds: mentionIds, addedBy: authorId });
  }
}

async function syncMentions({ commentId, newMentionIds, authorId, entityType, entityId }: SyncMentionsArgs): Promise<string[]> {
  const { data: existing, error } = await supabase
    .from("comment_mentions")
    .select("mentioned_user")
    .eq("comment_id", commentId);

  if (error) throw error;

  const current = new Set((existing ?? []).map((row) => row.mentioned_user as string));
  const next = new Set(newMentionIds);

  const toAdd: string[] = [];
  const toRemove: string[] = [];

  next.forEach((id) => {
    if (!current.has(id)) toAdd.push(id);
  });
  current.forEach((id) => {
    if (!next.has(id)) toRemove.push(id);
  });

  if (toRemove.length > 0) {
    await supabase
      .from("comment_mentions")
      .delete()
      .eq("comment_id", commentId)
      .in("mentioned_user", toRemove);
  }

  if (toAdd.length > 0) {
    const rows = toAdd.map((id) => ({ comment_id: commentId, mentioned_user: id }));
    await supabase.from("comment_mentions").upsert(rows, { onConflict: "comment_id,mentioned_user" });
    await createMentionNotifications({ userIds: toAdd, entityType, entityId, authorId, commentId });
    if (entityType === "task") {
      await addTaskWatchers({ taskId: entityId, userIds: toAdd, addedBy: authorId });
    }
  }

  return Array.from(next);
}

async function createMentionNotifications({ userIds, entityType, entityId, authorId, commentId }: CreateMentionNotificationsArgs) {
  const unique = userIds.filter((id) => id !== authorId);
  if (unique.length === 0) return;

  for (const userId of unique) {
    await createNotification({
      user_id: userId,
      type: "mention",
      title: "You were mentioned in a comment",
      body: null,
      entity_type: entityType,
      entity_id: entityId,
      project_id: null,
      link: buildCommentLink(entityType, entityId, commentId),
    });
  }
}

function buildCommentLink(entityType: CommentEntityType, entityId: string, commentId: string) {
  switch (entityType) {
    case "task":
      return `/tasks/${entityId}?comment=${commentId}`;
    case "project":
      return `/projects/${entityId}?comment=${commentId}`;
    case "doc":
      return `/docs/${entityId}?comment=${commentId}`;
    default:
      return `/${entityType}/${entityId}`;
  }
}

function dedupeIds(ids: string[] | undefined, limit: number): string[] {
  if (!ids || ids.length === 0) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= limit) break;
  }
  return unique;
}

function dedupeBacklinks(
  backlinks: CreateCommentInput["cross_references"] | UpdateCommentInput["cross_references"]
): Array<{ id: string; type: CommentCrossReference["target_type"]; title?: string; url?: string | null }> {
  if (!backlinks || backlinks.length === 0) return [];
  const map = new Map<string, { id: string; type: CommentCrossReference["target_type"]; title?: string; url?: string | null }>();
  for (const link of backlinks) {
    if (!link?.id || !link.type) continue;
    const key = `${link.type}:${link.id}`;
    if (map.has(key)) continue;
    map.set(key, { id: link.id, type: link.type, title: link.title, url: link.url ?? null });
    if (map.size >= MAX_CROSS_REFERENCES) break;
  }
  return Array.from(map.values());
}

function mapCommentRow(row: any): CommentWithAuthor {
  const mentions = ((row.comment_mentions as CommentMention[] | null) ?? []).map(
    (mention) => mention.mentioned_user as string
  );
  const backlinks = ((row.comment_backlinks as any[] | null) ?? []).map((link) => ({
    id: link.target_id as string,
    type: link.target_type as CommentCrossReference["target_type"],
    title: parseContext(link.context)?.title ?? link.target_id,
    url: parseContext(link.context)?.url ?? null,
  }));
  const reactions = summarizeReactions(
    ((row.comment_reactions as CommentReaction[] | null) ?? []).map((reaction) => ({
      emoji: reaction.emoji,
      user_id: reaction.user_id,
    }))
  );
  const history = ((row.comment_history as CommentHistoryEntry[] | null) ?? []).map((entry) => ({
    id: entry.id,
    comment_id: entry.comment_id,
    version: entry.version,
    body_markdown: entry.body_markdown,
    body_html: entry.body_html ?? null,
    body_json: entry.body_json ?? null,
    edited_at: entry.edited_at,
    edited_by: entry.edited_by ?? null,
  }));

  return {
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    author: row.author,
    parent_id: row.parent_id ?? null,
    body_markdown: row.body_markdown ?? "",
    body_html: row.body_html ?? null,
    body_json: row.body_json ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    edited_at: row.edited_at ?? null,
    edited_by: row.edited_by ?? null,
    author_profile: {
      id: row.author_profile?.user_id ?? row.author,
      user_id: row.author_profile?.user_id ?? row.author,
      full_name: row.author_profile?.full_name,
      avatar_url: row.author_profile?.avatar_url,
      email: row.author_profile?.email,
    },
    mentions,
    cross_references: backlinks,
    reactions,
    history,
  };
}

function summarizeReactions(rows: Array<{ emoji: string; user_id: string }>): CommentReactionSummary[] {
  const groups = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!groups.has(row.emoji)) {
      groups.set(row.emoji, new Set());
    }
    groups.get(row.emoji)!.add(row.user_id);
  }
  return Array.from(groups.entries()).map(([emoji, users]) => ({ emoji, userIds: Array.from(users) }));
}

function parseContext(value: unknown): { title?: string; url?: string | null } {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as { title?: string; url?: string | null };
      return parsed ?? {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return value as { title?: string; url?: string | null };
  }
  return {};
}
