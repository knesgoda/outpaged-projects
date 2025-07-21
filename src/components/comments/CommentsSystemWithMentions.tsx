
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MentionInput } from "@/components/mentions/MentionInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Trash2 } from "lucide-react";

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

interface CommentsSystemWithMentionsProps {
  taskId: string;
  projectId?: string;
}

export function CommentsSystemWithMentions({ 
  taskId, 
  projectId 
}: CommentsSystemWithMentionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_author_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const commentsWithProfiles = data?.map(comment => ({
        ...comment,
        author: (comment as any).profiles
      })) || [];

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setSubmitting(true);

      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          task_id: taskId,
          author_id: user.id
        })
        .select(`
          *,
          profiles!comments_author_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      // Add the new comment to the list
      const newCommentWithProfile = {
        ...data,
        author: (data as any).profiles
      };

      setComments(prev => [...prev, newCommentWithProfile]);
      setNewComment("");

      // Process mentions and create notifications
      await processMentions(newComment.trim(), data.id);

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

  const processMentions = async (content: string, commentId: string) => {
    // Extract @mentions from the content
    const mentionPattern = /@([^@\s]+)/g;
    const mentions = [];
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    if (mentions.length === 0) return;

    try {
      // Find users by name from project members
      const { data: members, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          profiles!project_members_user_id_fkey (
            full_name
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const mentionedUserIds: string[] = [];

      // Match mentioned names with actual users
      members?.forEach(member => {
        const profile = (member as any).profiles;
        if (profile && mentions.includes(profile.full_name)) {
          mentionedUserIds.push(member.user_id);
        }
      });

      // Create notifications for mentioned users
      if (mentionedUserIds.length > 0) {
        const notifications = mentionedUserIds.map(userId => ({
          user_id: userId,
          title: "You were mentioned in a comment",
          message: `${user?.user_metadata?.full_name || user?.email} mentioned you in a comment`,
          type: 'info' as const,
          related_task_id: taskId
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error creating mention notifications:', notificationError);
        }
      }
    } catch (error) {
      console.error('Error processing mentions:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', user.id); // Only allow deleting own comments

      if (error) throw error;

      setComments(prev => prev.filter(comment => comment.id !== commentId));

      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const renderCommentContent = (content: string) => {
    // Highlight @mentions in the content
    const mentionPattern = /@([^@\s]+)/g;
    const parts = content.split(mentionPattern);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a mention
        return (
          <Badge key={index} variant="secondary" className="mx-1">
            @{part}
          </Badge>
        );
      }
      return part;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Comments
          <Badge variant="secondary">{comments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <ScrollArea className="max-h-64">
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.author?.avatar_url} />
                    <AvatarFallback>
                      {comment.author?.full_name
                        ?.split(' ')
                        .map(n => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.author?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { 
                            addSuffix: true 
                          })}
                        </span>
                      </div>
                      {comment.author_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-foreground">
                      {renderCommentContent(comment.content)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {comments.length > 0 && <Separator />}

        {/* Add Comment */}
        <div className="space-y-3">
          <MentionInput
            value={newComment}
            onChange={setNewComment}
            placeholder="Add a comment... Use @ to mention team members"
            projectId={projectId}
            className="min-h-[80px]"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Tip: Use @ to mention team members and notify them
            </p>
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
