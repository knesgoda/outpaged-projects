import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  Reply, 
  Edit, 
  Trash2, 
  Heart, 
  MessageSquare,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";

export interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
    role?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  parentId?: string;
  likes: number;
  isLiked: boolean;
  isEdited: boolean;
  replies?: Comment[];
}

interface CommentItemProps {
  comment: Comment;
  onReply?: (parentId: string) => void;
  onEdit?: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  depth?: number;
  currentUserId?: string;
}

export function CommentItem({ 
  comment, 
  onReply, 
  onEdit, 
  onDelete, 
  onLike,
  depth = 0,
  currentUserId = "current-user"
}: CommentItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isAuthor = comment.author.id === currentUserId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={`space-y-3 ${depth > 0 ? 'ml-8 border-l-2 border-muted pl-4' : ''}`}>
      <Card className="bg-card/50 border-border">
        <CardContent className="p-4">
          {/* Comment Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                <AvatarFallback className="text-xs">
                  {comment.author.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{comment.author.name}</span>
                  {comment.author.role && (
                    <Badge variant="outline" className="text-xs">
                      {comment.author.role}
                    </Badge>
                  )}
                  {comment.isEdited && (
                    <Badge variant="secondary" className="text-xs">
                      Edited
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span title={format(comment.createdAt, "PPpp")}>
                    {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-6 h-6 opacity-50 hover:opacity-100">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-50" align="end">
                <DropdownMenuItem onClick={() => onReply?.(comment.id)}>
                  <Reply className="w-4 h-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {isAuthor && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit?.(comment)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onDelete?.(comment.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Comment Content */}
          <div className="mb-3">
            <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
          </div>

          {/* Comment Actions */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 ${comment.isLiked ? 'text-destructive' : 'text-muted-foreground'}`}
              onClick={() => onLike?.(comment.id)}
            >
              <Heart className={`w-4 h-4 mr-1 ${comment.isLiked ? 'fill-current' : ''}`} />
              {comment.likes > 0 && comment.likes}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => onReply?.(comment.id)}
            >
              <Reply className="w-4 h-4 mr-1" />
              Reply
            </Button>

            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                {isExpanded ? ' (hide)' : ' (show)'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nested Replies */}
      {hasReplies && isExpanded && (
        <div className="space-y-3">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              depth={depth + 1}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}