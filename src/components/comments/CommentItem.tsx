import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CornerDownRight, Edit2, History, MoreHorizontal, Reply, SmilePlus, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SafeHtml } from "@/components/ui/safe-html";
import { markdownToHtml } from "@/lib/markdown";
import type { CommentWithAuthor as ServiceCommentWithAuthor } from "@/services/comments";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type CommentWithAuthor = ServiceCommentWithAuthor & {
  mentions: string[];
  replies?: CommentWithAuthor[];
};

export interface CommentItemProps {
  comment: CommentWithAuthor;
  depth?: number;
  currentUserId?: string;
  onReply?: (comment: CommentWithAuthor) => void;
  onEdit?: (comment: CommentWithAuthor) => void;
  onDelete?: (comment: CommentWithAuthor) => void;
  onReact?: (comment: CommentWithAuthor, emoji: string) => void;
}

function CommentItem({
  comment,
  depth = 0,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: CommentItemProps) {
  const isAuthor = currentUserId === comment.author;
  const [showHistory, setShowHistory] = useState(false);

  const html = useMemo(() => {
    if (comment.body_html) return comment.body_html;
    return markdownToHtml(comment.body_markdown ?? "");
  }, [comment.body_html, comment.body_markdown]);

  const canReply = Boolean(onReply);
  const canEdit = isAuthor && Boolean(onEdit);
  const canDelete = isAuthor && Boolean(onDelete);
  const reactions = comment.reactions ?? [];
  const pending = comment.metadata && (comment.metadata as Record<string, unknown>).status === "pending";

  return (
    <div className={depth > 0 ? "pl-6" : ""}>
      <Card className="border-border bg-card/70">
        <CardContent className="flex gap-3 p-4">
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={comment.author_profile.avatar_url ?? undefined}
              alt={comment.author_profile.full_name ?? ""}
            />
            <AvatarFallback>{comment.author_profile.full_name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Link
                  to={`/people/${comment.author}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {comment.author_profile.full_name ?? "Unknown user"}
                </Link>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.edited_at && <span className="text-xs text-muted-foreground">Edited</span>}
                {pending && <Badge variant="outline">Pending sync</Badge>}
                {comment.history?.length ? (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setShowHistory((prev) => !prev)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <History className="h-3 w-3" />
                          History
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>View edit history</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
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
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete?.(comment)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <SafeHtml html={html} className="prose prose-sm max-w-none text-foreground dark:prose-invert" />

            {comment.cross_references && comment.cross_references.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {comment.cross_references.map((xref) => (
                  <Badge key={`${comment.id}-${xref.type}-${xref.id}`} variant="secondary" className="font-normal">
                    <span className="capitalize">{xref.type}</span>
                    <span className="mx-1">•</span>
                    <span>{xref.title}</span>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {reactions.map((reaction) => {
                const reacted = reaction.userIds.includes(currentUserId ?? "");
                return (
                  <Button
                    key={`${comment.id}-${reaction.emoji}`}
                    size="sm"
                    variant={reacted ? "secondary" : "ghost"}
                    className="h-6 gap-1 rounded-full px-2 text-xs"
                    onClick={() => onReact?.(comment, reaction.emoji)}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.userIds.length}</span>
                  </Button>
                );
              })}
              {onReact && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 rounded-full px-2 text-xs">
                      <SmilePlus className="mr-1 h-3 w-3" /> React
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {REACTION_PRESETS.map((emoji) => (
                      <DropdownMenuItem key={emoji} onClick={() => onReact(comment, emoji)}>
                        {emoji}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {showHistory && comment.history?.length ? (
              <div className="mt-3 space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                {comment.history
                  .sort((a, b) => (a.edited_at > b.edited_at ? -1 : 1))
                  .map((entry) => (
                    <div key={entry.id} className="space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Edited {formatDistanceToNow(new Date(entry.edited_at), { addSuffix: true })}</span>
                        {entry.edited_by && <span>by {entry.edited_by}</span>}
                      </div>
                      <SafeHtml
                        html={entry.body_html ?? markdownToHtml(entry.body_markdown)}
                        className="prose prose-xs max-w-none dark:prose-invert"
                      />
                    </div>
                  ))}
              </div>
            ) : null}

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

export default CommentItem;

const REACTION_PRESETS = ["👍", "🎉", "❤️", "🔥", "👀", "💯", "🚀"];
