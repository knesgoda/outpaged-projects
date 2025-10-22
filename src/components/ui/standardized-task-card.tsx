import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { GripVertical, Square, CheckSquare, Circle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/tasks";
import { getPriorityLabel } from "@/lib/priorityMapping";

export interface StandardizedTaskCardProps {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType?: string;
  assigneeAvatar?: string | null;
  assigneeName?: string;
  dueDate?: string | null;
  blocked?: boolean;
  tags?: string[];
  ticketNumber?: number;
  projectCode?: string;
  progress?: number;
  onClick?: () => void;
  className?: string;
  isDragging?: boolean;
}

const PRIORITY_ACCENTS: Record<TaskPriority, string> = {
  P0: "hsl(var(--destructive))",
  P1: "hsl(var(--primary))",
  P2: "hsl(var(--warning))",
  P3: "hsl(var(--accent))",
  P4: "hsl(var(--muted-foreground))",
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "border-white/15 bg-white/5 text-white/70",
  in_progress: "border-[hsl(var(--accent))]/30 bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
  in_review: "border-[#8b5cf6]/30 bg-[#8b5cf6]/15 text-[#c4b5fd]",
  done: "border-[hsl(var(--success))]/35 bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
  blocked: "border-[hsl(var(--destructive))]/35 bg-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))]",
  waiting: "border-[hsl(var(--warning))]/35 bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
};

const TASK_TYPE_ICONS: Record<string, ReactNode> = {
  bug: <AlertCircle className="h-4 w-4 text-[hsl(var(--destructive))]" />,
  feature_request: <Square className="h-4 w-4 text-[hsl(var(--accent))]" />,
  task: <CheckSquare className="h-4 w-4 text-white/70" />,
  story: <Circle className="h-4 w-4 text-[#8b5cf6]" />,
};

const cardVariants = {
  rest: {
    scale: 1,
    boxShadow: "var(--shadow-soft)",
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 0 0 3px rgba(255, 106, 0, 0.3)",
  },
  dragging: {
    scale: 1.01,
    boxShadow: "0 24px 48px -20px rgba(255, 106, 0, 0.45), 0 0 0 3px rgba(255, 106, 0, 0.45)",
  },
};

export function StandardizedTaskCard({
  id,
  title,
  status,
  priority,
  taskType = "task",
  assigneeAvatar,
  assigneeName,
  dueDate,
  blocked,
  tags = [],
  ticketNumber,
  projectCode,
  progress,
  onClick,
  className,
  isDragging = false,
}: StandardizedTaskCardProps) {
  const priorityLabel = getPriorityLabel(priority);
  const statusLabel = status.replace("_", " ");
  const priorityAccent = PRIORITY_ACCENTS[priority] ?? "hsl(var(--accent))";

  const visibleTags = tags.slice(0, 3);
  const remainingTagsCount = tags.length - visibleTags.length;

  const taskKey = ticketNumber && projectCode ? `${projectCode}-${ticketNumber}` : null;

  const formatDueDate = (date: string) => {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return date;
    }
    return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const calculateProgress = () => {
    if (typeof progress === "number") {
      return Math.round(progress);
    }
    if (status === "done") return 100;
    if (status === "in_progress" || status === "in_review") return 50;
    return 0;
  };

  const actualProgress = calculateProgress();

  return (
    <motion.button
      type="button"
      variants={cardVariants}
      initial="rest"
      animate={isDragging ? "dragging" : "rest"}
      whileHover="hover"
      transition={{ duration: 0.18, ease: "easeInOut" }}
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[16px] border border-white/10 bg-[#001B33] p-4 text-left text-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33]",
        className
      )}
      style={{ borderLeftColor: priorityAccent, borderLeftWidth: 4, borderLeftStyle: "solid" }}
      aria-grabbed={isDragging}
      data-task-id={id}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-white/10" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-3">
          <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-[hsl(var(--accent))] opacity-0 transition-opacity group-focus-visible:opacity-80 group-hover:opacity-80">
            <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/60">
              {TASK_TYPE_ICONS[taskType] || TASK_TYPE_ICONS.task}
              <span>{priorityLabel}</span>
              {taskKey ? <span className="font-semibold text-white/70">{taskKey}</span> : null}
            </div>
            <h3 className="text-sm font-semibold leading-snug text-white">{title}</h3>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize",
              STATUS_STYLES[status]
            )}
          >
            {statusLabel}
          </Badge>
          {blocked && (
            <Badge
              variant="destructive"
              className="rounded-full border border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))]/20 px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--destructive))]"
            >
              Blocked
            </Badge>
          )}
          {assigneeName && (
            <Avatar className="h-8 w-8 ring-2 ring-[hsl(var(--accent))]/30">
              <AvatarImage src={assigneeAvatar || undefined} alt={assigneeName} />
              <AvatarFallback className="bg-white/10 text-xs text-white">
                {assigneeName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
          {dueDate && (
            <div className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] text-white">
              <Clock className="h-3 w-3 text-[hsl(var(--accent))]" aria-hidden="true" />
              <span>{formatDueDate(dueDate)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-white/50">Progress</span>
            <Progress
              value={actualProgress}
              className="h-1.5 w-24 bg-white/10 [&>div]:bg-[hsl(var(--accent))]"
            />
            <span className="text-[11px] font-semibold text-white/80">{actualProgress}%</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/80"
              >
                {tag}
              </span>
            ))}
            {remainingTagsCount > 0 && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                +{remainingTagsCount} more
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}
