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
    .from('comments')
    .select(`
      id,
      entity_type,
      entity_id,
      author,
      parent_id,
      body_markdown,
      body_html,
      created_at,
      updated_at,
      edited_at,
      author_profile:profiles!inner (
        user_id,
        full_name,
        avatar_url,
        email
      ),
      comment_mentions (
        mentioned_user
      )
    `)
    .eq('entity_type', entity.type)
    .eq('entity_id', entity.id)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    author: row.author,
    parent_id: row.parent_id,
    body_markdown: row.body_markdown ?? '',
    body_html: row.body_html,
    created_at: row.created_at,
    updated_at: row.updated_at,
    edited_at: row.edited_at,
    author_profile: {
      id: row.author_profile?.user_id ?? row.author,
      full_name: row.author_profile?.full_name,
      avatar_url: row.author_profile?.avatar_url,
      email: row.author_profile?.email,
    },
    mentions: (row.comment_mentions ?? []).map((mention: any) => mention.mentioned_user),
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
    .from('comments')
    .insert({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      parent_id: input.parent_id ?? null,
      body_markdown: input.body_markdown,
      body_html: input.body_html ?? null,
      author: user.id,
    })
    .select(`
      id,
      entity_type,
      entity_id,
      author,
      parent_id,
      body_markdown,
      body_html,
      created_at,
      updated_at,
      edited_at,
      author_profile:profiles!inner (
        user_id,
        full_name,
        avatar_url,
        email
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  const newComment: CommentWithAuthor & { mentions: string[] } = {
    id: data.id,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    author: data.author,
    parent_id: data.parent_id,
    body_markdown: data.body_markdown ?? '',
    body_html: data.body_html,
    created_at: data.created_at,
    updated_at: data.updated_at,
    edited_at: data.edited_at,
    author_profile: {
      id: data.author_profile?.user_id ?? data.author,
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
    .from('comments')
    .select('id, author, entity_type, entity_id')
    .eq('id', id)
    .maybeSingle();

  if (commentError) {
    throw commentError;
  }

  if (!comment) {
    throw new Error('Comment not found');
  }

  const { data, error } = await supabase
    .from('comments')
    .update({
      body_markdown: patch.body_markdown,
      body_html: patch.body_html ?? null,
      edited_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      id,
      entity_type,
      entity_id,
      author,
      parent_id,
      body_markdown,
      body_html,
      created_at,
      updated_at,
      edited_at,
      author_profile:profiles!inner (
        user_id,
        full_name,
        avatar_url,
        email
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  const mentionIds = dedupeMentions(patch.mentions);
  await syncMentions({
    commentId: id,
    newMentionIds: mentionIds,
    authorId: comment.author,
    entityType: comment.entity_type,
    entityId: comment.entity_id,
  });

  return {
    id: data.id,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    author: data.author,
    parent_id: data.parent_id,
    body_markdown: data.body_markdown ?? '',
    body_html: data.body_html,
    created_at: data.created_at,
    updated_at: data.updated_at,
    edited_at: data.edited_at,
    author_profile: {
      id: data.author_profile?.user_id ?? data.author,
      full_name: data.author_profile?.full_name,
      avatar_url: data.author_profile?.avatar_url,
      email: data.author_profile?.email,
    },
    mentions: mentionIds,
  };
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

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
  if (mentionIds.length === 0) return;

  const uniqueMentionRows = mentionIds
    .filter(mentionedUser => mentionedUser !== authorId)
    .map(mentionedUser => ({ comment_id: commentId, mentioned_user: mentionedUser }));

  if (uniqueMentionRows.length === 0) return;

  const { error: mentionError } = await supabase
    .from('comment_mentions')
    .insert(uniqueMentionRows)
    .onConflict('comment_id,mentioned_user');

  if (mentionError && mentionError.code !== '23505') {
    throw mentionError;
  }

  await createMentionNotifications({
    userIds: uniqueMentionRows.map(row => row.mentioned_user),
    entityType,
    entityId,
    authorId,
    commentId,
  });
}

type SyncMentionsArgs = {
  commentId: string;
  newMentionIds: string[];
  authorId: string;
  entityType: CommentEntityType;
  entityId: string;
};

async function syncMentions({ commentId, newMentionIds, authorId, entityType, entityId }: SyncMentionsArgs) {
  const { data: existing, error: existingError } = await supabase
    .from('comment_mentions')
    .select('mentioned_user')
    .eq('comment_id', commentId);

  if (existingError) {
    throw existingError;
  }

  const existingIds = new Set((existing ?? []).map(row => row.mentioned_user));
  const nextIds = new Set(newMentionIds);

  const toInsert = Array.from(nextIds).filter(id => !existingIds.has(id));
  const toDelete = Array.from(existingIds).filter(id => !nextIds.has(id));

  if (toInsert.length > 0) {
    await persistMentions({
      commentId,
      mentionIds: toInsert,
      entityType,
      entityId,
      authorId,
    });
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('comment_mentions')
      .delete()
      .eq('comment_id', commentId)
      .in('mentioned_user', toDelete);

    if (deleteError) {
      throw deleteError;
    }
  }
}

type CreateMentionNotificationsArgs = {
  userIds: string[];
  entityType: CommentEntityType;
  entityId: string;
  authorId: string;
  commentId: string;
};

async function createMentionNotifications({ userIds, entityType, entityId, authorId, commentId }: CreateMentionNotificationsArgs) {
  if (userIds.length === 0) return;

  const cleanUserIds = Array.from(new Set(userIds.filter(id => id !== authorId)));
  if (cleanUserIds.length === 0) return;

  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('user_id', authorId)
    .maybeSingle();

  const title = 'New mention';
  const displayName = authorProfile?.full_name ?? 'Someone';
  const body = `${displayName} mentioned you in a comment`;

  const rows = cleanUserIds.map(userId => ({
    user_id: userId,
    type: 'mention' as const,
    title,
    body,
    entity_type: entityType,
    entity_id: entityId,
    comment_id: commentId,
  }));

  const { error } = await supabase
    .from('notifications')
    .insert(rows.map(({ comment_id, ...rest }) => rest));

  if (error) {
    throw error;
  }
}
