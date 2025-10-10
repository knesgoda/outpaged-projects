export type TimelineItemKind =
  | "task"
  | "project"
  | "milestone"
  | "group"
  | "subtask"
  | "deliverable";

export type TimelineDependencyType = "FS" | "SS" | "FF" | "SF";

export type TimelineScale =
  | "hour"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year";

export interface TimelineDateRange {
  start: string | null;
  end: string | null;
  durationMinutes?: number | null;
  timezone?: string | null;
}

export interface TimelineItem {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  kind: TimelineItemKind;
  parentId?: string | null;
  groupId?: string | null;
  ownerId?: string | null;
  assigneeIds?: string[];
  teamId?: string | null;
  start: string | null;
  end: string | null;
  durationMinutes?: number | null;
  percentComplete?: number | null;
  status?: string | null;
  priority?: string | null;
  color?: string | null;
  baselineId?: string | null;
  calendarId?: string | null;
  workloadScore?: number | null;
  riskScore?: number | null;
  isBlocked?: boolean;
  isTentative?: boolean;
  tags?: string[];
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface TimelineGroup {
  id: string;
  name: string;
  parentId?: string | null;
  orderIndex?: number;
  color?: string | null;
  collapsed?: boolean;
  itemIds?: string[];
  metadata?: Record<string, unknown>;
}

export type TimelineMilestoneType = "release" | "gate" | "external" | "internal";

export interface TimelineMilestone {
  id: string;
  name: string;
  type: TimelineMilestoneType;
  date: string;
  color?: string | null;
  icon?: string | null;
  relatedItemIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface TimelineDependency {
  id: string;
  fromId: string;
  toId: string;
  type: TimelineDependencyType;
  leadLagMinutes?: number | null;
  isSoft?: boolean;
  note?: string | null;
  metadata?: Record<string, unknown>;
}

export type TimelineConstraintType =
  | "ASAP"
  | "ALAP"
  | "NO_EARLIER_THAN"
  | "NO_LATER_THAN"
  | "MUST_START_ON"
  | "MUST_FINISH_ON";

export interface TimelineConstraint {
  itemId: string;
  type: TimelineConstraintType;
  date?: string | null;
  timezone?: string | null;
  note?: string | null;
}

export interface TimelineBaseline {
  id: string;
  itemId: string;
  start: string | null;
  end: string | null;
  durationMinutes?: number | null;
  name?: string | null;
  varianceMinutes?: number | null;
  createdAt?: string | null;
}

export interface TimelineCalendarException {
  date: string;
  type: "nonWorking" | "workingOverride";
  description?: string;
  start?: string;
  end?: string;
}

export interface TimelineWorkingWindow {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface TimelineCalendar {
  id: string;
  name: string;
  timezone: string;
  workingDays: number[];
  workingHours: TimelineWorkingWindow[];
  exceptions?: TimelineCalendarException[];
  metadata?: Record<string, unknown>;
}

export type TimelineOverlayType =
  | "workload"
  | "risk"
  | "baseline"
  | "dependencyChain"
  | "custom";

export interface TimelineOverlayDatum {
  itemId: string;
  value: number;
  label?: string;
  color?: string;
}

export interface TimelineOverlay {
  id: string;
  name: string;
  type: TimelineOverlayType;
  description?: string;
  palette?: string[];
  data?: TimelineOverlayDatum[];
  metadata?: Record<string, unknown>;
}

export interface TimelineWorkloadMetric {
  itemId: string;
  personId?: string | null;
  teamId?: string | null;
  allocationMinutes: number;
}

export interface TimelineRiskMetric {
  itemId: string;
  score: number;
  label?: string | null;
}

export interface TimelineComment {
  id: string;
  itemId: string;
  authorId: string;
  message: string;
  createdAt: string;
  anchorDate?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TimelinePermission {
  itemId: string;
  actorId: string;
  canEdit: boolean;
  canComment: boolean;
  canLinkDependencies?: boolean;
}

export interface TimelinePresence {
  itemId: string;
  userId: string;
  cursor?: { x: number; y: number } | null;
  updatedAt: string;
  color?: string | null;
}

export type TimelineSnapMode = "none" | "day" | "week" | "month";

export type TimelineRowDensity = "comfortable" | "compact" | "condensed";

export interface TimelineViewPreferences {
  scale: TimelineScale;
  zoomLevel: number;
  showWeekends: boolean;
  showBaselines: boolean;
  showDependencies: boolean;
  showOverlays: boolean;
  showLegend: boolean;
  snapMode: TimelineSnapMode;
  rowDensity: TimelineRowDensity;
  grouping: string;
  colorBy: string;
  swimlanes: boolean;
  calendarId?: string | null;
  savedViewId?: string | null;
}

export interface TimelineViewMetadata {
  filters?: Record<string, unknown>;
  searchQuery?: string | null;
}

export interface TimelineSnapshot {
  items: TimelineItem[];
  groups: TimelineGroup[];
  milestones: TimelineMilestone[];
  dependencies: TimelineDependency[];
  baselines: TimelineBaseline[];
  constraints: TimelineConstraint[];
  calendars: TimelineCalendar[];
  overlays: TimelineOverlay[];
  workload: TimelineWorkloadMetric[];
  riskScores: TimelineRiskMetric[];
  comments: TimelineComment[];
  permissions: TimelinePermission[];
  presence: TimelinePresence[];
  preferences: TimelineViewPreferences;
  metadata?: TimelineViewMetadata;
  lastUpdated: string;
}

export interface TimelineRollup {
  targetId: string;
  start: string | null;
  end: string | null;
  durationMinutes: number;
  percentComplete: number | null;
  childItemIds: string[];
}

export interface TimelineSchedule {
  itemId: string;
  start: string | null;
  end: string | null;
  durationMinutes: number | null;
  baselineStart?: string | null;
  baselineEnd?: string | null;
  varianceMinutes?: number | null;
}

export interface TimelineRowModel {
  id: string;
  type: "group" | "item" | "milestone";
  depth: number;
  label: string;
  itemId?: string;
  groupId?: string;
  milestoneId?: string;
  percentComplete?: number | null;
  start?: string | null;
  end?: string | null;
  isCollapsed?: boolean;
  hasChildren?: boolean;
  badges?: string[];
}

export interface TimelineOverlaySummary {
  overlayId: string;
  minValue: number;
  maxValue: number;
  averageValue: number;
}

export interface TimelineDerivedData {
  rollups: Record<string, TimelineRollup>;
  criticalPath: string[];
  schedules: Record<string, TimelineSchedule>;
  workloadByResource: Record<string, { allocationMinutes: number; itemIds: string[] }>;
  overlays: Record<string, TimelineOverlaySummary>;
  rows: TimelineRowModel[];
  dateRange: { start: string | null; end: string | null };
}
