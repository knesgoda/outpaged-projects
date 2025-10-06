import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SafeHtml } from '@/components/ui/safe-html';
import { markdownToHtml } from '@/lib/markdown';
import type { CommentWithAuthor } from '@/services/comments';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { CornerDownRight, Edit2, MoreHorizontal, Reply, Trash2 } from 'lucide-react';

export interface CommentItemProps {
  comment: CommentWithAuthor & { mentions: string[]; replies?: (CommentWithAuthor & { mentions: string[] })[] };
  depth?: number;
  currentUserId?: string;
  onReply?: (comment: CommentWithAuthor) => void;
  onEdit?: (comment: CommentWithAuthor) => void;
  onDelete?: (comment: CommentWithAuthor) => void;
}

export function CommentItem({
  comment,
  depth = 0,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
}: CommentItemProps) {
  const isAuthor = currentUserId === comment.author;

  const html = useMemo(() => {
    if (comment.body_html) return comment.body_html;
    return markdownToHtml(comment.body_markdown ?? '');
  }, [comment.body_html, comment.body_markdown]);

  const canReply = Boolean(onReply);
  const canEdit = isAuthor && Boolean(onEdit);
  const canDelete = isAuthor && Boolean(onDelete);

  return (
    <div className={depth > 0 ? 'pl-6' : ''}>
      <Card className="border-border bg-card/70">
        <CardContent className="flex gap-3 p-4">
          <Avatar className="h-9 w-9">
            <AvatarImage src={comment.author_profile.avatar_url ?? undefined} alt={comment.author_profile.full_name ?? ''} />
            <AvatarFallback>
              {comment.author_profile.full_name?.[0] ?? '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Link to={`/people/${comment.author}`} className="font-medium text-foreground hover:underline">
                  {comment.author_profile.full_name ?? 'Unknown user'}
                </Link>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.edited_at && (
                  <span className="text-xs text-muted-foreground">Edited</span>
                )}
              </div>

              {(canReply || canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canReply && (
                      <DropdownMenuItem onClick={() => onReply?.(comment)}>
                        <Reply className="mr-2 h-4 w-4" /> Reply
                      </DropdownMenuItem>
                    )}
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onEdit?.(comment)}>
                        <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(comment)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <SafeHtml html={html} className="prose prose-sm max-w-none text-foreground dark:prose-invert" />

            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-auto px-2 text-muted-foreground hover:text-foreground"
                onClick={() => onReply?.(comment)}
              >
                <CornerDownRight className="mr-1 h-4 w-4" /> Reply
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3 border-l border-border/60 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
