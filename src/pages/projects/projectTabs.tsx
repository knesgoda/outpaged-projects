import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComponentType } from "react";

interface TabPlaceholderProps {
  title: string;
  description: string;
}

const TabPlaceholder = ({ title, description }: TabPlaceholderProps) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">TODO: Build the {title.toLowerCase()} experience.</p>
    </CardContent>
  </Card>
);

function createPlaceholderTab(title: string, description: string): ComponentType {
  return () => <TabPlaceholder title={title} description={description} />;
}

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
    Component: createPlaceholderTab("Overview", "High-level status and context for the project."),
  },
  {
    key: "list",
    label: "List",
    path: "list",
    Component: createPlaceholderTab("List", "Plan tasks in a table view."),
  },
  {
    key: "board",
    label: "Board",
    path: "board",
    Component: createPlaceholderTab("Board", "Visualize work across columns."),
  },
  {
    key: "backlog",
    label: "Backlog",
    path: "backlog",
    Component: createPlaceholderTab("Backlog", "Review upcoming ideas and tasks."),
  },
  {
    key: "sprints",
    label: "Sprints",
    path: "sprints",
    Component: createPlaceholderTab("Sprints", "Organize work into timeboxed iterations."),
  },
  {
    key: "calendar",
    label: "Calendar",
    path: "calendar",
    Component: createPlaceholderTab("Calendar", "Track milestones on a calendar."),
  },
  {
    key: "timeline",
    label: "Timeline",
    path: "timeline",
    Component: createPlaceholderTab("Timeline", "Visualize dependencies across time."),
  },
  {
    key: "dependencies",
    label: "Dependencies",
    path: "dependencies",
    Component: createPlaceholderTab("Dependencies", "Document upstream and downstream work."),
  },
  {
    key: "reports",
    label: "Reports",
    path: "reports",
    Component: createPlaceholderTab("Reports", "Build insights for the team."),
  },
  {
    key: "docs",
    label: "Docs",
    path: "docs",
    Component: createPlaceholderTab("Docs", "Keep reference notes in one place."),
  },
  {
    key: "files",
    label: "Files",
    path: "files",
    Component: createPlaceholderTab("Files", "Share supporting files."),
  },
  {
    key: "automations",
    label: "Automations",
    path: "automations",
    Component: createPlaceholderTab("Automations", "Configure workflow automations."),
  },
  {
    key: "settings",
    label: "Settings",
    path: "settings",
    Component: createPlaceholderTab("Settings", "Manage project preferences and members."),
  },
];
