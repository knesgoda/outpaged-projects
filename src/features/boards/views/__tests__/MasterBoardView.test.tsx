import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardViewCanvas } from "../index";
import type { BoardViewConfiguration } from "@/types/boards";
import type { MasterBoardRecord } from "../masterDataset";

const baseConfiguration: BoardViewConfiguration = {
  mode: "master",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: [], hidden: [] },
  timeline: null,
  colorRules: [],
  master: { filters: { projectIds: [], componentIds: [], versionIds: [] } },
};

const buildRecord = (overrides: Partial<MasterBoardRecord> = {}): MasterBoardRecord => ({
  id: overrides.id ?? `item-${Math.random().toString(36).slice(2)}`,
  boardId: "board-1",
  boardName: "Engineering",
  groupId: "ready",
  groupName: "Ready",
  projectIds: ["proj-a"],
  componentIds: ["api"],
  versionIds: ["1.0"],
  metrics: { total: 3, completed: 1 },
  ...overrides,
});

describe("MasterBoardView", () => {
  it("renders aggregated groups with color strips", () => {
    const records: MasterBoardRecord[] = [
      buildRecord({ id: "1", groupName: "Ready" }),
      buildRecord({ id: "2", groupName: "Ready" }),
      buildRecord({ id: "3", groupId: "in-progress", groupName: "In progress" }),
    ];

    const { container } = render(
      <BoardViewCanvas
        items={records}
        configuration={baseConfiguration}
      />
    );

    expect(screen.getByText(/Ready/)).toBeInTheDocument();
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
    const accent = container.querySelector("div.h-1");
    expect(accent).toBeTruthy();
  });

  it("applies cross-project filters via toggles", async () => {
    const user = userEvent.setup();
    const records: MasterBoardRecord[] = [
      buildRecord({ id: "1", projectIds: ["proj-a"] }),
      buildRecord({ id: "2", projectIds: ["proj-b"], groupId: "doing", groupName: "Doing" }),
    ];

    render(
      <BoardViewCanvas
        items={records}
        configuration={baseConfiguration}
      />
    );

    await user.click(screen.getByRole("button", { name: /proj-b/i }));

    expect(screen.queryByText(/Ready/)).not.toBeInTheDocument();
    expect(screen.getByText(/Doing/)).toBeInTheDocument();
  });
});
