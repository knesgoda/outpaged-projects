export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: "new" | "refined" | "estimated" | "ready" | "in_sprint";
  priority: "low" | "medium" | "high" | "urgent";
  storyPoints?: number;
  assignee?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  tags: string[];
  acceptanceCriteria: string[];
  businessValue: number;
  effort: number;
  createdAt: Date;
  sprintId?: string;
}
