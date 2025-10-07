import { CommentsSystemWithMentions } from "./CommentsSystemWithMentions";

interface CommentsSystemProps {
  taskId: string;
  onCommentCountChange?: (count: number) => void;
}

export function CommentsSystem({ taskId, onCommentCountChange }: CommentsSystemProps) {
  return (
    <CommentsSystemWithMentions
      entityType="task"
      entityId={taskId}
      title="Comments"
      onCountChange={onCommentCountChange}
    />
  );
}
