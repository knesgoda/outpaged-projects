export type OKRCycle = {
  id: string;
  owner: string;
  name: string;
  starts_on: string;
  ends_on: string;
  created_at: string;
};

export type GoalStatus =
  | 'on_track'
  | 'at_risk'
  | 'off_track'
  | 'paused'
  | 'done'
  | 'archived';

export type Goal = {
  id: string;
  owner: string;
  project_id?: string | null;
  parent_goal_id?: string | null;
  cycle_id?: string | null;
  title: string;
  description?: string | null;
  status: GoalStatus;
  weight: number;
  progress: number;
  is_private: boolean;
  created_at: string;
  updated_at: string;
};

export type KeyResult = {
  id: string;
  goal_id: string;
  title: string;
  metric_start?: number | null;
  metric_target?: number | null;
  metric_current?: number | null;
  unit?: string | null;
  weight: number;
  created_at: string;
  updated_at: string;
};

export type GoalUpdate = {
  id: string;
  goal_id: string;
  status: Goal['status'] | 'on_track' | 'at_risk' | 'off_track' | 'done';
  note?: string | null;
  progress?: number | null;
  created_by?: string | null;
  created_at: string;
};

export type ProjectTemplate = {
  id: string;
  owner: string;
  name: string;
  description?: string | null;
  category?: string | null;
  manifest: any;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};
