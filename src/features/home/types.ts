export type HomeBreakpoint = "desktop" | "tablet" | "mobile";

export type HomeRefreshCadence = "live" | "1m" | "5m" | "manual";

export type HomeTileLinkMode = "leader" | "follower" | "ignore";

export type HomeTileCategory =
  | "work"
  | "planning"
  | "insights"
  | "content"
  | "automation"
  | "integrations"
  | "custom";

export type HomeTileType =
  | "calendar"
  | "myWork"
  | "upcomingMilestones"
  | "basicsStrip"
  | "approvals"
  | "risks"
  | "kpi"
  | "workload"
  | "programTimeline"
  | "docs"
  | "files"
  | "automationPanel"
  | "integration"
  | "custom";

export interface HomeTilePermissionRule {
  visibility: "inherit" | "roles" | "teams" | "private";
  roles?: string[];
  teams?: string[];
}

export interface HomeTileConditionalVisibility {
  type: "opql" | "featureFlag" | "permission";
  expression: string;
}

export interface HomeTileDataSource {
  kind: "opql" | "entity" | "external" | "static";
  query?: string;
  entityType?: string;
  entityId?: string;
  url?: string;
  parameters?: Record<string, string | number | boolean>;
}

export interface HomeTileDefinition {
  id: string;
  type: HomeTileType;
  category: HomeTileCategory;
  title: string;
  description: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  supports?: {
    breakpoints?: HomeBreakpoint[];
    refreshCadences?: HomeRefreshCadence[];
    linkModes?: HomeTileLinkMode[];
    dataSources?: HomeTileDataSource["kind"][];
  };
}

export interface HomeLayoutItem {
  tileId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  visibility?: HomeTileConditionalVisibility | null;
}

export type HomePageLayouts = Record<HomeBreakpoint, HomeLayoutItem[]>;

export interface HomeTileInstance {
  id: string;
  definitionId: string;
  title?: string;
  description?: string;
  icon?: string;
  refreshCadence?: HomeRefreshCadence;
  permissions?: HomeTilePermissionRule;
  conditionalVisibility?: HomeTileConditionalVisibility | null;
  linkMode?: HomeTileLinkMode;
  dataSource?: HomeTileDataSource;
  presentation?: {
    mode?: "list" | "table" | "card" | "chart" | "kpi" | "heatmap" | "timeline" | "embed";
    density?: "comfortable" | "compact" | "cozy";
    themeOverride?: "light" | "dark" | "contrast";
  };
  interactivity?: {
    inlineEdit?: boolean;
    dragReschedule?: boolean;
    crossFiltering?: boolean;
  };
  parameters?: Record<string, unknown>;
}

export interface HomePagePreferences {
  density: "comfortable" | "compact" | "cozy";
  gutter: 8 | 12 | 16;
  theme?: "system" | "light" | "dark" | "contrast";
  background?: {
    type: "none" | "color" | "image";
    value?: string;
  };
}

export interface HomePageDefinition {
  id: string;
  name: string;
  icon: string;
  description?: string;
  tiles: HomeTileInstance[];
  layouts: HomePageLayouts;
  preferences: HomePagePreferences;
  permissions?: {
    visibility: "private" | "team" | "project" | "workspace";
    teams?: string[];
    roles?: string[];
  };
  lockedTileIds?: string[];
  updatedAt?: string;
}

export interface HomeWorkspaceDefaults {
  workspaceId: string;
  pages: HomePageDefinition[];
  version: number;
  updatedAt: string;
  lockedTileIds?: string[];
}

export interface HomeUserPreferences {
  activePageId: string;
  theme?: "system" | "light" | "dark" | "contrast";
  density?: "comfortable" | "compact" | "cozy";
  showLeftRail: boolean;
  showRightRail: boolean;
}

export interface HomeUserState {
  pages: HomePageDefinition[];
  preferences: HomeUserPreferences;
  removedWorkspaceTileIds: string[];
  lastSyncedAt?: string | null;
}

export interface HomeState {
  workspaceDefaults: HomeWorkspaceDefaults;
  userHome: HomeUserState;
  status: "idle" | "loading" | "error" | "syncing";
  error?: string | null;
}

export type HomeAction =
  | { type: "setActivePage"; pageId: string }
  | { type: "upsertUserPage"; page: HomePageDefinition }
  | { type: "removeUserPage"; pageId: string }
  | { type: "resetUserHome" }
  | { type: "patchUserPreferences"; patch: Partial<HomeUserPreferences> }
  | { type: "hydrateWorkspaceDefaults"; defaults: HomeWorkspaceDefaults }
  | { type: "syncUserState"; userHome: HomeUserState };
