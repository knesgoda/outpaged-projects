
import { useState, useEffect } from "react";
import { CommentItem, Comment } from "./CommentItem";
import { CommentForm } from "./CommentForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  SortAsc, 
  SortDesc, 
  Filter,
  Search
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CommentsSystemProps {
  taskId: string;
  onCommentCountChange?: (count: number) => void;
}

export function CommentsSystem({ taskId, onCommentCountChange }: CommentsSystemProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest");
  const [filterBy, setFilterBy] = useState<"all" | "unresolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const currentUser = user ? {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || "User",
    initials: (user.user_metadata?.full_name || user.email?.split('@')[0] || "U")
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    avatar: user.user_metadata?.avatar_url || "",
  } : null;

  useEffect(() => {
    if (taskId) {
      fetchComments();
    }
  }, [taskId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!inner (
            full_name,
            avatar_url
          )
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedComments = data?.map(comment => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author_id,
          name: comment.profiles?.full_name || 'Unknown User',
          initials: (comment.profiles?.full_name || 'U')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          avatar: comment.profiles?.avatar_url || ""
        },
        createdAt: new Date(comment.created_at),
        updatedAt: comment.updated_at ? new Date(comment.updated_at) : undefined,
        isEdited: !!comment.updated_at,
        likes: 0, // TODO: Implement likes system
        isLiked: false,
        replies: [] // TODO: Implement nested replies
      })) || [];

      setComments(formattedComments);
      onCommentCountChange?.(formattedComments.length);
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

  const handleAddComment = async (content: string, parentId?: string) => {
    if (!user || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content,
          author_id: user.id,
          task_id: taskId
        })
        .select(`
          *,
          profiles!inner (
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      const newComment: Comment = {
        id: data.id,
        content: data.content,
        author: {
          id: data.author_id,
          name: data.profiles?.full_name || currentUser.name,
          initials: currentUser.initials,
          avatar: data.profiles?.avatar_url || ""
        },
        createdAt: new Date(data.created_at),
        likes: 0,
        isLiked: false,
        isEdited: false,
        replies: []
      };

      setComments(prev => [newComment, ...prev]);
      onCommentCountChange?.(comments.length + 1);
      
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
    }
  };

  const handleUpdateComment = async (content: string) => {
    if (!editingComment || !user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', editingComment.id);

      if (error) throw error;

      setComments(prev => prev.map(comment =>
        comment.id === editingComment.id
          ? { ...comment, content, isEdited: true, updatedAt: new Date() }
          : comment
      ));

      setEditingComment(null);
      
      toast({
        title: "Success",
        description: "Comment updated successfully",
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      onCommentCountChange?.(comments.length - 1);
      
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

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
  };

  const handleLikeComment = (commentId: string) => {
    // TODO: Implement likes system with database
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      return comment;
    }));
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
    setEditingComment(null);
  };

  // Filter and sort comments
  const filteredComments = comments.filter(comment => {
    const matchesSearch = comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         comment.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedComments = [...filteredComments].sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return a.createdAt.getTime() - b.createdAt.getTime();
      case "popular":
        return b.likes - a.likes;
      case "newest":
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const totalComments = comments.length;

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading comments...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Please log in to view and add comments</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Comments ({totalComments})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <div className="flex items-center gap-2">
                    <SortDesc className="w-4 h-4" />
                    Newest
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
                  <div className="flex items-center gap-2">
                    <SortAsc className="w-4 h-4" />
                    Oldest
                  </div>
                </SelectItem>
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Popular
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        {editingComment ? (
          <CommentForm
            key={`edit-${editingComment.id}`}
            onSubmit={handleUpdateComment}
            onCancel={() => setEditingComment(null)}
            placeholder="Update your comment..."
            initialValue={editingComment.content}
            currentUser={currentUser}
          />
        ) : (
          <CommentForm
            onSubmit={handleAddComment}
            placeholder="Share your thoughts..."
            currentUser={currentUser}
          />
        )}

        <Separator />

        {/* Comments List */}
        <div className="space-y-4">
          {sortedComments.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
            </div>
          ) : (
            sortedComments.map((comment) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  onReply={handleReply}
                  onEdit={handleEditComment}
                  onDelete={handleDeleteComment}
                  onLike={handleLikeComment}
                  currentUserId={currentUser?.id}
                />
                
                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 ml-8">
                    <CommentForm
                      onSubmit={handleAddComment}
                      onCancel={() => setReplyingTo(null)}
                      placeholder="Write a reply..."
                      parentId={comment.id}
                      replyToUser={comment.author.name}
                      currentUser={currentUser}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
