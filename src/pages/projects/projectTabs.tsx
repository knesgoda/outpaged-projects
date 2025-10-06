import type { ComponentType } from "react";

import ProjectOverviewPage from "@/pages/ia/projects/ProjectOverviewPage";
import ProjectListPage from "@/pages/ia/projects/ProjectListPage";
import ProjectBoardPage from "@/pages/ia/projects/ProjectBoardPage";
import ProjectBacklogPage from "@/pages/ia/projects/ProjectBacklogPage";
import ProjectSprintsPage from "@/pages/ia/projects/ProjectSprintsPage";
import ProjectCalendarPage from "@/pages/ia/projects/ProjectCalendarPage";
import ProjectTimelinePage from "@/pages/ia/projects/ProjectTimelinePage";
import ProjectDependenciesPage from "@/pages/ia/projects/ProjectDependenciesPage";
import ProjectReportsPage from "@/pages/ia/projects/ProjectReportsPage";
import ProjectDocsPage from "@/pages/ia/projects/ProjectDocsPage";
import ProjectFilesPage from "@/pages/ia/projects/ProjectFilesPage";
import ProjectIntegrationsPage from "@/pages/ia/projects/ProjectIntegrationsPage";
import ProjectAutomationsPage from "@/pages/ia/projects/ProjectAutomationsPage";
import ProjectSettingsPage from "@/pages/ia/projects/ProjectSettingsPage";

export interface ProjectTabDefinition {
  key: string;
  label: string;
  path: string;
  Component: ComponentType;
}

export const PROJECT_TABS: ProjectTabDefinition[] = [
  {
    key: "overview",
    label: "Overview",
    path: "overview",
    Component: ProjectOverviewPage,
  },
  {
    key: "list",
    label: "List",
    path: "list",
    Component: ProjectListPage,
  },
  {
    key: "board",
    label: "Board",
    path: "board",
    Component: ProjectBoardPage,
  },
  {
    key: "backlog",
    label: "Backlog",
    path: "backlog",
    Component: ProjectBacklogPage,
  },
  {
    key: "sprints",
    label: "Sprints",
    path: "sprints",
    Component: ProjectSprintsPage,
  },
  {
    key: "calendar",
    label: "Calendar",
    path: "calendar",
    Component: ProjectCalendarPage,
  },
  {
    key: "timeline",
    label: "Timeline",
    path: "timeline",
    Component: ProjectTimelinePage,
  },
  {
    key: "dependencies",
    label: "Dependencies",
    path: "dependencies",
    Component: ProjectDependenciesPage,
  },
  {
    key: "reports",
    label: "Reports",
    path: "reports",
    Component: ProjectReportsPage,
  },
  {
    key: "docs",
    label: "Docs",
    path: "docs",
    Component: ProjectDocsPage,
  },
  {
    key: "files",
    label: "Files",
    path: "files",
    Component: ProjectFilesPage,
  },
  {
    key: "integrations",
    label: "Integrations",
    path: "integrations",
    Component: ProjectIntegrationsPage,
  },
  {
    key: "automations",
    label: "Automations",
    path: "automations",
    Component: ProjectAutomationsPage,
  },
  {
    key: "settings",
    label: "Settings",
    path: "settings",
    Component: ProjectSettingsPage,
  },
];
