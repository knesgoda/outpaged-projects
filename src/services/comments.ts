import { supabase } from '@/integrations/supabase/client';
import type { Comment, CommentEntityType, ProfileLite } from '@/types';

const MAX_MENTIONS_PER_COMMENT = 50;

type CommentEntity = { type: CommentEntityType; id: string };

export type CommentWithAuthor = Comment & {
  author_profile: ProfileLite;
};

type CreateCommentInput = {
  entity_type: CommentEntityType;
  entity_id: string;
  parent_id?: string | null;
  body_markdown: string;
  body_html?: string | null;
  mentions?: string[];
};

type UpdateCommentInput = {
  body_markdown: string;
  body_html?: string | null;
  mentions?: string[];
};

function dedupeMentions(mentions?: string[]): string[] {
  if (!mentions) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of mentions) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= MAX_MENTIONS_PER_COMMENT) break;
  }
  return unique;
}

export async function listComments(entity: CommentEntity): Promise<(CommentWithAuthor & { mentions: string[] })[]> {
  const { data, error } = await supabase
    .from('comments' as any)
    .select(`
      id,
      task_id,
      author_id,
      content,
      created_at,
      updated_at,
      author_profile:profiles!inner (
        user_id,
        full_name,
        avatar_url,
        email
      )
    `)
    .eq('task_id', entity.id)
    .order('created_at', { ascending: true }) as any;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    entity_type: 'task',
    entity_id: row.task_id,
    author: row.author_id,
    parent_id: null,
    body_markdown: row.content ?? '',
    body_html: null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    edited_at: null,
    author_profile: {
      id: row.author_profile?.user_id ?? row.author_id,
      full_name: row.author_profile?.full_name,
      avatar_url: row.author_profile?.avatar_url,
      email: row.author_profile?.email,
    },
    mentions: [],
  }));
}

export async function createComment(input: CreateCommentInput): Promise<CommentWithAuthor & { mentions: string[] }> {
  const [{ data: userData, error: userError }] = await Promise.all([
    supabase.auth.getUser(),
  ]);

  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('comments' as any)
    .insert({
      task_id: input.entity_id,
      author_id: user.id,
      content: input.body_markdown,
    })
    .select(`
      id,
      task_id,
      author_id,
      content,
      created_at,
      updated_at,
      author_profile:profiles!inner (
        user_id,
        full_name,
        avatar_url,
        email
      )
    `)
    .single() as any;

  if (error) {
    throw error;
  }

  const newComment: CommentWithAuthor & { mentions: string[] } = {
    id: data.id,
    entity_type: input.entity_type,
    entity_id: data.task_id,
    author: data.author_id,
    parent_id: null,
    body_markdown: data.content ?? '',
    body_html: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    edited_at: null,
    author_profile: {
      id: data.author_profile?.user_id ?? data.author_id,
      full_name: data.author_profile?.full_name,
      avatar_url: data.author_profile?.avatar_url,
      email: data.author_profile?.email,
    },
    mentions: [],
  };

  const mentionIds = dedupeMentions(input.mentions);
  if (mentionIds.length > 0) {
    await persistMentions({
      commentId: newComment.id,
      mentionIds,
      entityType: newComment.entity_type,
      entityId: newComment.entity_id,
      authorId: newComment.author,
    });
    newComment.mentions = mentionIds;
  }

  return newComment;
}

export async function updateComment(id: string, patch: UpdateCommentInput): Promise<CommentWithAuthor & { mentions: string[] }> {
  const { data: comment, error: commentError } = await supabase
    .from('comments' as any)
    .select('id, author_id, task_id')
    .eq('id', id)
    .maybeSingle() as any;

  if (commentError) {
    throw commentError;
  }

  if (!comment) {
    throw new Error('Comment not found');
  }

  const { data, error } = await supabase
    .from('comments' as any)
    .update({
      content: patch.body_markdown,
    })
    .eq('id', id)
    .select(`
      id,
      task_id,
      author_id,
      content,
      created_at,
      updated_at,
      author_profile:profiles!inner (
        user_id,
        full_name,
        avatar_url,
        email
      )
    `)
    .single() as any;

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    entity_type: 'task',
    entity_id: data.task_id,
    author: data.author_id,
    parent_id: null,
    body_markdown: data.content ?? '',
    body_html: null,
    created_at: data.created_at,
    updated_at: data.updated_at,
    edited_at: null,
    author_profile: {
      id: data.author_profile?.user_id ?? data.author_id,
      full_name: data.author_profile?.full_name,
      avatar_url: data.author_profile?.avatar_url,
      email: data.author_profile?.email,
    },
    mentions: [],
  };
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('comments' as any)
    .delete()
    .eq('id', id) as any;

  if (error) {
    throw error;
  }
}

type PersistMentionsArgs = {
  commentId: string;
  mentionIds: string[];
  entityType: CommentEntityType;
  entityId: string;
  authorId: string;
};

async function persistMentions({ commentId, mentionIds, entityType, entityId, authorId }: PersistMentionsArgs) {
  // Mentions not supported in current schema
  return;
}

type SyncMentionsArgs = {
  commentId: string;
  newMentionIds: string[];
  authorId: string;
  entityType: CommentEntityType;
  entityId: string;
};

async function syncMentions({ commentId, newMentionIds, authorId, entityType, entityId }: SyncMentionsArgs) {
  // Mentions not supported in current schema
  return;
}

type CreateMentionNotificationsArgs = {
  userIds: string[];
  entityType: CommentEntityType;
  entityId: string;
  authorId: string;
  commentId: string;
};

async function createMentionNotifications({ userIds, entityType, entityId, authorId, commentId }: CreateMentionNotificationsArgs) {
  // Mentions not supported in current schema
  return;
}
