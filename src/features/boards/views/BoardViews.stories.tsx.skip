import type { Meta, StoryObj } from "@storybook/react";
import { BoardViewCanvas } from ".";
import type { BoardViewConfiguration } from "@/types/boards";

type BoardViewStory = StoryObj<typeof BoardViewCanvas>;

const buildConfig = (overrides: Partial<BoardViewConfiguration>): BoardViewConfiguration => ({
  mode: "table",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: [], hidden: [] },
  timeline: null,
  colorRules: [],
  ...overrides,
});

const meta: Meta<typeof BoardViewCanvas> = {
  title: "Boards/Views",
  component: BoardViewCanvas,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

export const Table: BoardViewStory = {
  args: {
    items: [
      { id: "1", title: "Design spec", status: "In progress", owner: "Avery" },
      { id: "2", title: "QA handoff", status: "Blocked", owner: "Rory" },
    ],
    configuration: buildConfig({
      mode: "table",
      columnPreferences: { order: ["title", "owner", "status"], hidden: [] },
    }),
  },
};

export const Kanban: BoardViewStory = {
  args: {
    items: [
      { id: "1", title: "Plan sprint", status: "todo" },
      { id: "2", title: "Implement feature", status: "doing" },
      { id: "3", title: "Ship release", status: "done" },
    ],
    configuration: buildConfig({
      mode: "kanban",
      grouping: { primary: "status", swimlaneField: null, swimlanes: [] },
    }),
  },
};

export const Timeline: BoardViewStory = {
  args: {
    items: [
      {
        id: "1",
        title: "Launch campaign",
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-10T00:00:00.000Z",
        dependencies: ["creative", "budget approval"],
      },
      {
        id: "2",
        title: "Measure impact",
        startDate: "2024-01-11T00:00:00.000Z",
        endDate: "2024-01-20T00:00:00.000Z",
      },
    ],
    configuration: buildConfig({
      mode: "timeline",
      timeline: { startField: "startDate", endField: "endDate", dependencyField: "dependencies" },
    }),
  },
};

