export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: "new" | "refined" | "estimated" | "ready" | "in_sprint";
  priority: "low" | "medium" | "high" | "urgent";
  storyPoints?: number;
  timeEstimateHours?: number;
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
  rank: number;
  history?: BacklogHistoryEntry[];
}

export interface BacklogHistoryEntry {
  id: string;
  timestamp: string;
  type: "rank_change" | "status_change" | "estimate_update" | "story_points_update" | "moved_to_sprint";
  detail: string;
}
