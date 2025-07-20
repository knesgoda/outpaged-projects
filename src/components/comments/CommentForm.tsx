import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send, X, AtSign } from "lucide-react";

interface CommentFormProps {
  onSubmit: (content: string, parentId?: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  initialValue?: string;
  parentId?: string;
  replyToUser?: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  };
}

export function CommentForm({ 
  onSubmit, 
  onCancel, 
  placeholder = "Write a comment...", 
  initialValue = "",
  parentId,
  replyToUser,
  currentUser
}: CommentFormProps) {
  const [content, setContent] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim(), parentId);
      setContent("");
      setIsFocused(false);
    }
  };

  const handleCancel = () => {
    setContent(initialValue);
    setIsFocused(false);
    onCancel?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <Card className="bg-card/30 border-border">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="text-xs">
              {currentUser.initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            {replyToUser && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <AtSign className="w-3 h-3" />
                <span>Replying to {replyToUser}</span>
              </div>
            )}
            
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[80px] resize-none border-muted focus:border-primary"
            />
            
            {(isFocused || content || parentId) && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Press Cmd+Enter to send, Esc to cancel
                </div>
                <div className="flex items-center gap-2">
                  {(isFocused || parentId) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleCancel}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!content.trim()}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {parentId ? "Reply" : "Comment"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}