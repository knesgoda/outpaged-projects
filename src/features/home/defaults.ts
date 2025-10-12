import {
  type HomeLayoutItem,
  type HomePageDefinition,
  type HomePageLayouts,
  type HomeState,
  type HomeTileInstance,
  type HomeUserState,
  type HomeWorkspaceDefaults,
} from "./types";

const WORKSPACE_ID = "workspace-default";
const VERSION = 1;

const calendarTileId = "calendar";
const myWorkTileId = "my-work";
const milestonesTileId = "milestones";
const basicsTileId = "basics";

const desktopLayout: HomeLayoutItem[] = [
  { tileId: calendarTileId, x: 0, y: 0, w: 12, h: 6, minH: 4 },
  { tileId: myWorkTileId, x: 0, y: 6, w: 6, h: 5, minH: 4 },
  { tileId: milestonesTileId, x: 6, y: 6, w: 6, h: 5, minH: 4 },
  { tileId: basicsTileId, x: 0, y: 11, w: 12, h: 3, minH: 3 },
];

const tabletLayout: HomeLayoutItem[] = [
  { tileId: calendarTileId, x: 0, y: 0, w: 8, h: 6, minH: 4 },
  { tileId: myWorkTileId, x: 0, y: 6, w: 8, h: 4, minH: 3 },
  { tileId: milestonesTileId, x: 0, y: 10, w: 8, h: 4, minH: 3 },
  { tileId: basicsTileId, x: 0, y: 14, w: 8, h: 3, minH: 3 },
];

const mobileLayout: HomeLayoutItem[] = [
  { tileId: calendarTileId, x: 0, y: 0, w: 1, h: 6, minH: 4 },
  { tileId: myWorkTileId, x: 0, y: 6, w: 1, h: 5, minH: 4 },
  { tileId: milestonesTileId, x: 0, y: 11, w: 1, h: 4, minH: 3 },
  { tileId: basicsTileId, x: 0, y: 15, w: 1, h: 3, minH: 3 },
];

const layouts: HomePageLayouts = {
  desktop: desktopLayout,
  tablet: tabletLayout,
  mobile: mobileLayout,
};

const baseTiles = [
  {
    id: calendarTileId,
    definitionId: "calendar",
    title: "Calendar",
    description:
      "Centralized calendar with milestones, releases, and personal events.",
  },
  {
    id: myWorkTileId,
    definitionId: "myWork",
    title: "My Work",
    description: "Personalized list of assigned and upcoming tasks.",
  },
  {
    id: milestonesTileId,
    definitionId: "upcomingMilestones",
    title: "Upcoming milestones",
    description: "Key project gates, approvals, and due dates.",
  },
  {
    id: basicsTileId,
    definitionId: "basicsStrip",
    title: "Workspace basics",
    description: "Favorites, recent items, and quick add actions.",
  },
] satisfies HomePageDefinition["tiles"];

function cloneTile(tile: HomeTileInstance): HomeTileInstance {
  return {
    ...tile,
    permissions: tile.permissions ? { ...tile.permissions } : undefined,
    conditionalVisibility: tile.conditionalVisibility
      ? { ...tile.conditionalVisibility }
      : undefined,
    presentation: tile.presentation ? { ...tile.presentation } : undefined,
    interactivity: tile.interactivity ? { ...tile.interactivity } : undefined,
    parameters: tile.parameters ? { ...tile.parameters } : undefined,
    dataSource: tile.dataSource ? { ...tile.dataSource } : undefined,
  };
}

function cloneLayouts(layouts: HomePageLayouts): HomePageLayouts {
  return Object.entries(layouts).reduce<HomePageLayouts>((acc, [breakpoint, items]) => {
    acc[breakpoint as keyof HomePageLayouts] = items.map((item) => ({
      ...item,
      visibility: item.visibility ? { ...item.visibility } : undefined,
    }));
    return acc;
  }, {} as HomePageLayouts);
}

function clonePageDefinition(page: HomePageDefinition): HomePageDefinition {
  return {
    ...page,
    tiles: page.tiles.map(cloneTile),
    layouts: cloneLayouts(page.layouts),
    preferences: { ...page.preferences, background: page.preferences.background && { ...page.preferences.background } },
    permissions: page.permissions ? { ...page.permissions } : undefined,
    lockedTileIds: page.lockedTileIds ? [...page.lockedTileIds] : undefined,
  };
}

const defaultPage: HomePageDefinition = {
  id: "home-default",
  name: "Home",
  icon: "home",
  description:
    "Calendar, work queue, milestones, and shortcuts curated by workspace admins.",
  tiles: baseTiles,
  layouts,
  preferences: {
    density: "comfortable",
    gutter: 16,
    theme: "system",
    background: { type: "none" },
  },
  permissions: {
    visibility: "workspace",
  },
  lockedTileIds: [calendarTileId],
  updatedAt: new Date(2024, 0, 1).toISOString(),
};

export const DEFAULT_WORKSPACE_HOME: HomeWorkspaceDefaults = {
  workspaceId: WORKSPACE_ID,
  pages: [defaultPage],
  version: VERSION,
  updatedAt: new Date(2024, 0, 1).toISOString(),
  lockedTileIds: [calendarTileId],
};

export function createDefaultUserHome(
  defaults: HomeWorkspaceDefaults = DEFAULT_WORKSPACE_HOME,
): HomeUserState {
  const firstPage = defaults.pages[0];
  return {
    pages: defaults.pages.map((page) => clonePageDefinition(page)),
    preferences: {
      activePageId: firstPage?.id ?? "",
      density: firstPage?.preferences.density ?? "comfortable",
      theme: "system",
      showLeftRail: true,
      showRightRail: true,
    },
    removedWorkspaceTileIds: [],
    lastSyncedAt: defaults.updatedAt,
  };
}

export function createInitialHomeState(
  defaults: HomeWorkspaceDefaults = DEFAULT_WORKSPACE_HOME,
  userHome: HomeUserState | null = null,
): HomeState {
  return {
    workspaceDefaults: defaults,
    userHome: userHome ?? createDefaultUserHome(defaults),
    status: "idle",
    error: null,
  };
}
