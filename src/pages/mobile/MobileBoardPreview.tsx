import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";

import { BoardViewProvider, type BoardViewRecord } from "@/features/boards/views/context";
import type { BoardViewConfiguration } from "@/types/boards";
import { MobileKanbanView, MobileTimelineView } from "@/features/boards/mobile";

const initialItems: BoardViewRecord[] = [
  {
    id: "task-1",
    title: "Design marketing landing page",
    status: "Backlog",
    assignee: "Alex",
    start_date: new Date().toISOString(),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: "task-2",
    title: "Implement billing hooks",
    status: "In Progress",
    assignee: "Sam",
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: "task-3",
    title: "QA mobile flows",
    status: "Review",
    assignee: "Jordan",
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: "task-4",
    title: "Publish release notes",
    status: "Done",
    assignee: "Morgan",
    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    due_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

const baseConfiguration: BoardViewConfiguration = {
  mode: "kanban",
  filters: {},
  grouping: {
    primary: "status",
    swimlaneField: null,
    swimlanes: [],
  },
  sort: [],
  columnPreferences: { order: [], hidden: [] },
  timeline: {
    startField: "start_date",
    endField: "due_date",
  },
  colorRules: [],
};

export default function MobileBoardPreview() {
  const [items, setItems] = useState<BoardViewRecord[]>(() => [...initialItems]);
  const [configuration, setConfiguration] = useState<BoardViewConfiguration>(baseConfiguration);

  const value = useMemo(
    () => ({
      items,
      configuration,
    }),
    [items, configuration]
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4" data-testid="mobile-board-preview">
      <Card className="bg-muted/40">
        <CardContent className="py-4 text-sm text-muted-foreground">
          These previews emulate the mobile board experience, including offline-aware kanban interactions and a pinch-to-zoom
          timeline.
        </CardContent>
      </Card>
      <BoardViewProvider
        items={value.items}
        configuration={value.configuration}
        onItemsChange={setItems}
        onConfigurationChange={setConfiguration}
      >
        <section aria-label="Mobile kanban">
          <MobileKanbanView boardId="preview-board" />
        </section>
        <section aria-label="Mobile timeline">
          <MobileTimelineView />
        </section>
      </BoardViewProvider>
    </div>
  );
}
