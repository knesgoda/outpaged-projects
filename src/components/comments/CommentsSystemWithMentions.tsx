codex/implement-notifications-and-inbox-functionality-g8mo3c

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdaptiveRichTextEditor } from "@/components/ui/adaptive-rich-text-editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { SafeHtml } from "@/components/ui/safe-html";
import { validateAndSanitizeInput } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { createNotification } from "@/services/notifications";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  task_id: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
}
=======
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

codex/implement-notifications-and-inbox-functionality-g8mo3c
      const parentComment = comments[comments.length - 1];

      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          task_id: taskId,
          author_id: user.id
        })
        .select(`
          id,
          content,
          created_at,
          author_id,
          task_id,
          profiles!author_id (
            full_name,
            avatar_url
          )
        `)
        .single();
=======
  const { data: comments = [], isLoading } = useComments(entity);
  const createMutation = useCreateComment(entity);
  const updateMutation = useUpdateComment(entity);
  const deleteMutation = useDeleteComment(entity);

  const [replyingTo, setReplyingTo] = useState<CommentWithAuthor | null>(null);
  const [editing, setEditing] = useState<CommentWithAuthor | null>(null);

codex/implement-notifications-and-inbox-functionality-g8mo3c
      // Add the new comment to the list
      const newCommentWithProfile = {
        ...data,
        author: (data as any).profiles || {
          full_name: user.user_metadata?.full_name || 'You', 
          avatar_url: user.user_metadata?.avatar_url 
        }
      };

      setComments(prev => [...prev, newCommentWithProfile]);
      onCommentCountChange?.(comments.length + 1);
      setNewComment("");

      // Process mentions and create notifications
      await processMentions(newComment.trim(), data.id);

      if (parentComment && parentComment.author_id && parentComment.author_id !== user.id) {
        await notifyCommentReply(parentComment.author_id, data.id, newComment.trim());
      }

      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const notifyCommentReply = async (recipientId: string, commentId: string, rawContent: string) => {
    try {
      const { data: preferenceRow, error: preferenceError } = await supabase
        .from('notification_preferences')
        .select('in_app')
        .eq('user_id', recipientId)
        .maybeSingle();

      if (preferenceError) {
        console.warn('Unable to load comment reply preferences:', preferenceError);
      }

      const inAppPref = (preferenceRow?.in_app as Record<string, boolean> | null | undefined)?.comment_reply;
      if (inAppPref === false) {
        return;
      }

      const actorName = user?.user_metadata?.full_name || user?.email || 'Someone';
      const snippet = rawContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

      await createNotification({
        user_id: recipientId,
        type: 'comment_reply',
        title: 'New reply',
        body: snippet ? `${actorName}: ${snippet}` : `${actorName} replied to your comment`,
        entity_type: 'task',
        entity_id: taskId,
        project_id: projectId,
        link: `/tasks/${taskId}#comment-${commentId}`,
      });
    } catch (error) {
      console.warn('Failed to create comment reply notification:', error);
    }
  };

  const processMentions = async (content: string, commentId: string) => {
    // Extract @mentions from the content (handles HTML from rich text editor)
    const mentionPattern = /@([^@<\s]+(?:\s[^@<\s]+)*)/g;
    const mentions = [];
    let match;

    // Strip HTML tags and find mentions
    const textContent = content.replace(/<[^>]*>/g, ' ');
    
    while ((match = mentionPattern.exec(textContent)) !== null) {
      mentions.push(match[1].trim());
    }

    if (mentions.length === 0) return;

    try {
      // Find users by name from project members if projectId is available
      if (projectId) {
        const { data: members, error } = await supabase
          .from('project_members')
          .select(`
            user_id,
            profiles:profiles (
              full_name
            )
          `)
          .eq('project_id', projectId);

        if (error) throw error;

        const mentionedUserIds: string[] = [];

        // Match mentioned names with actual users
        members?.forEach(member => {
          const profile = (member as any).profiles;
          if (profile && mentions.some(mention =>
            profile.full_name.toLowerCase().includes(mention.toLowerCase())
          )) {
            mentionedUserIds.push(member.user_id);
          }
        });

        const targetUserIds = mentionedUserIds.filter((id) => id !== user?.id);

        if (targetUserIds.length === 0) return;

        const { data: preferenceRows, error: preferenceError } = await supabase
          .from("notification_preferences")
          .select("user_id, in_app, email")
          .in("user_id", targetUserIds);

        if (preferenceError) {
          console.warn("Could not load mention preferences:", preferenceError);
        }

        const inAppAllowed = new Set<string>();
        const emailAllowed = new Set<string>();

        targetUserIds.forEach((targetId) => {
          const pref = preferenceRows?.find((row) => row.user_id === targetId);
          const inAppPref = (pref?.in_app as Record<string, boolean> | null | undefined)?.mention;
          const emailPref = (pref?.email as Record<string, boolean> | null | undefined)?.mention;

          if (inAppPref !== false) {
            inAppAllowed.add(targetId);
          }

          if (emailPref === true) {
            emailAllowed.add(targetId);
          }
        });

        const actorName = user?.user_metadata?.full_name || user?.email || "Someone";
        const snippet = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);

        if (inAppAllowed.size > 0) {
          await Promise.all(
            Array.from(inAppAllowed).map((mentionedId) =>
              createNotification({
                user_id: mentionedId,
                type: "mention",
                title: "You were mentioned",
                body: snippet ? `${actorName}: ${snippet}` : `${actorName} mentioned you in a comment`,
                entity_type: "task",
                entity_id: taskId,
                project_id: projectId,
                link: `/tasks/${taskId}`,
              })
            )
          );
        }

        if (emailAllowed.size > 0) {
          try {
            await supabase.functions.invoke("send-mention-notification", {
              body: {
                mentions: Array.from(emailAllowed),
                taskId,
                commentId,
                mentionedBy: actorName,
              },
            });
          } catch (emailError) {
            console.error("Error sending mention emails:", emailError);
          }
        }
      }
    } catch (error) {
      console.error('Error processing mentions:', error);
    }
=======
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
