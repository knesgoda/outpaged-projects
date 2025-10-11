import { aggregateMasterGroups, filterMasterRecords, normaliseMasterFilters } from "../masterDataset";
import type { MasterBoardRecord } from "../masterDataset";

const buildRecord = (overrides: Partial<MasterBoardRecord> = {}): MasterBoardRecord => ({
  id: `item-${Math.random().toString(36).slice(2)}`,
  boardId: "board-1",
  boardName: "Engineering",
  groupId: "ready",
  groupName: "Ready",
  projectIds: ["proj-a"],
  componentIds: ["api"],
  versionIds: ["1.0"],
  metrics: { total: 2, completed: 1 },
  ...overrides,
});

describe("masterDataset", () => {
  it("normalises configured filters", () => {
    const filters = normaliseMasterFilters({
      projectIds: ["proj-a", "proj-a", "proj-b"],
      componentIds: ["api"],
      versionIds: undefined as unknown as string[],
    });

    expect(filters).toEqual({
      projectIds: ["proj-a", "proj-b"],
      componentIds: ["api"],
      versionIds: [],
    });
  });

  it("filters records across projects and components", () => {
    const records = [
      buildRecord({ id: "1", projectIds: ["proj-a"], componentIds: ["api"] }),
      buildRecord({ id: "2", projectIds: ["proj-b"], componentIds: ["ui"], groupId: "doing", groupName: "Doing" }),
    ];

    const filtered = filterMasterRecords(records, {
      projectIds: ["proj-b"],
      componentIds: ["ui"],
      versionIds: [],
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("2");
  });

  it("aggregates metrics per board group", () => {
    const records = [
      buildRecord({
        id: "1",
        boardId: "board-1",
        boardName: "Engineering",
        groupId: "ready",
        groupName: "Ready",
        metrics: { total: 3, completed: 2 },
      }),
      buildRecord({
        id: "2",
        boardId: "board-1",
        boardName: "Engineering",
        groupId: "ready",
        groupName: "Ready",
        metrics: { total: 2, completed: 1 },
      }),
    ];

    const groups = aggregateMasterGroups(records);

    expect(groups).toHaveLength(1);
    expect(groups[0].total).toBe(5);
    expect(groups[0].completed).toBe(3);
    expect(groups[0].progress).toBeCloseTo(0.6, 2);
  });
});
