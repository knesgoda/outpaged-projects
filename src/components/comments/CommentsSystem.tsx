import { useState } from "react";
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

// Mock current user
const currentUser = {
  id: "current-user",
  name: "You",
  initials: "YU",
  avatar: "",
};

const mockComments: Comment[] = [];

interface CommentsSystemProps {
  taskId: string;
  onCommentCountChange?: (count: number) => void;
}

export function CommentsSystem({ taskId, onCommentCountChange }: CommentsSystemProps) {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "popular">("newest");
  const [filterBy, setFilterBy] = useState<"all" | "unresolved">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleAddComment = (content: string, parentId?: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      content,
      author: currentUser,
      createdAt: new Date(),
      parentId,
      likes: 0,
      isLiked: false,
      isEdited: false,
      replies: []
    };

    if (parentId) {
      // Add as reply
      setComments(prev => prev.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newComment]
          };
        }
        // Check nested replies
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply => 
              reply.id === parentId 
                ? { ...reply, replies: [...(reply.replies || []), newComment] }
                : reply
            )
          };
        }
        return comment;
      }));
      setReplyingTo(null);
    } else {
      // Add as top-level comment
      setComments(prev => [newComment, ...prev]);
    }

    // Update comment count
    const totalComments = comments.length + comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0) + 1;
    onCommentCountChange?.(totalComments);
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
  };

  const handleUpdateComment = (content: string) => {
    if (!editingComment) return;

    setComments(prev => prev.map(comment => {
      if (comment.id === editingComment.id) {
        return {
          ...comment,
          content,
          isEdited: true,
          updatedAt: new Date()
        };
      }
      // Check nested replies
      if (comment.replies) {
        return {
          ...comment,
          replies: comment.replies.map(reply =>
            reply.id === editingComment.id
              ? { ...reply, content, isEdited: true, updatedAt: new Date() }
              : reply
          )
        };
      }
      return comment;
    }));
    setEditingComment(null);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(prev => {
      // Remove top-level comments
      const filtered = prev.filter(comment => comment.id !== commentId);
      // Remove nested replies
      return filtered.map(comment => ({
        ...comment,
        replies: comment.replies?.filter(reply => reply.id !== commentId) || []
      }));
    });
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
        };
      }
      // Check nested replies
      if (comment.replies) {
        return {
          ...comment,
          replies: comment.replies.map(reply =>
            reply.id === commentId
              ? {
                  ...reply,
                  isLiked: !reply.isLiked,
                  likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
                }
              : reply
          )
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

  const totalComments = comments.length + comments.reduce((sum, c) => sum + (c.replies?.length || 0), 0);

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
                  currentUserId={currentUser.id}
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