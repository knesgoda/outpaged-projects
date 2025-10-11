import {
  buildConnectionPayload,
  calculateRollup,
  evaluateFormula,
  hydrateMirrorData,
} from "@/lib/boards/columnCalculations";
import {
  DEFAULT_CONNECT_METADATA,
  DEFAULT_MIRROR_METADATA,
  DEFAULT_ROLLUP_METADATA,
} from "@/types/boardColumns";
import type { TaskConnectionSummary } from "@/types/tasks";

describe("columnCalculations", () => {
  describe("evaluateFormula", () => {
    it("computes numeric expressions using the provided context", () => {
      const result = evaluateFormula("({{completed}} / {{total}}) * 100", {
        completed: 8,
        total: 10,
      });

      expect(result).toBeCloseTo(80);
    });

    it("normalises string values before evaluation", () => {
      const result = evaluateFormula("{{points}} + {{bonus}}", {
        points: "21",
        bonus: true,
      });

      expect(result).toBe(22);
    });

    it("throws an error for unsupported tokens", () => {
      expect(() => evaluateFormula("alert('oops')", {})).toThrow(
        /unsupported tokens/i
      );
    });
  });

  describe("calculateRollup", () => {
    it("aggregates numeric values and reports progress", () => {
      const metadata = {
        ...DEFAULT_ROLLUP_METADATA,
        targetField: "completed",
        aggregation: "sum" as const,
      };

      const result = calculateRollup(
        [
          { completed: 1 },
          { completed: 0 },
          { completed: 1 },
          { completed: "0" },
        ],
        metadata
      );

      expect(result).toEqual(
        expect.objectContaining({
          count: 4,
          value: 2,
          completed: 2,
          total: 4,
          progress: 0.5,
        })
      );
    });

    it("returns null value when no numeric values exist", () => {
      const result = calculateRollup(
        [{ completed: "done" }, { completed: "done" }],
        DEFAULT_ROLLUP_METADATA
      );

      expect(result).toEqual({ count: 2, value: null });
    });

    it("pulls rollup data from linked board connections", () => {
      const metadata = {
        ...DEFAULT_ROLLUP_METADATA,
        sourceCollection: "child-board",
        targetField: "progress",
        aggregation: "avg" as const,
      };

      const connection: TaskConnectionSummary = {
        id: "rel-1",
        boardId: "child-board",
        recordId: "task-1",
        boardName: "Child Board",
        recordTitle: "Linked work",
        status: "in_progress",
        relationshipName: "Linked work",
        sourceColumnId: "connect-1",
        fields: null,
        mirrorFields: null,
        rollup: {
          targetField: "progress",
          aggregation: "avg",
          records: [
            { progress: 0.5 },
            { progress: 1 },
            { progress: 0 },
          ],
        },
      };

      const result = calculateRollup([connection], metadata);

      expect(result).toBeDefined();
      expect(result?.count).toBe(3);
      expect(result?.value).toBeCloseTo(0.5, 5);
      expect(typeof result?.progress === "number").toBe(true);
    });
  });

  describe("hydrateMirrorData", () => {
    it("extracts only requested fields from the source record", () => {
      const metadata = {
        ...DEFAULT_MIRROR_METADATA,
        displayFields: ["status", "owner.name"],
      };

      const result = hydrateMirrorData(
        {
          status: "In progress",
          owner: { name: "Jordan", id: "user-1" },
          unrelated: true,
        },
        metadata
      );

      expect(result).toEqual({
        status: "In progress",
        "owner.name": "Jordan",
      });
    });

    it("returns an empty object when the source record is missing", () => {
      expect(hydrateMirrorData(null, DEFAULT_MIRROR_METADATA)).toEqual({});
    });

    it("hydrates from connection summaries when provided", () => {
      const metadata = {
        ...DEFAULT_MIRROR_METADATA,
        sourceBoardId: "design-board",
        sourceColumnId: "mirror-1",
        displayFields: ["status", "owner"],
      };

      const connections: TaskConnectionSummary[] = [
        {
          id: "conn-1",
          boardId: "design-board",
          recordId: "design-123",
          recordTitle: "Design polish",
          status: "review",
          relationshipName: "Design",
          sourceColumnId: "mirror-1",
          fields: {
            status: "review",
            owner: "samira",
          },
          mirrorFields: null,
          rollup: null,
        },
      ];

      const result = hydrateMirrorData(connections, metadata);

      expect(result).toEqual({
        status: "review",
        owner: "samira",
      });
    });
  });

  describe("buildConnectionPayload", () => {
    it("normalises identifiers based on the metadata configuration", () => {
      const payload = buildConnectionPayload(
        [{ id: "abc" }, "def"],
        DEFAULT_CONNECT_METADATA
      );

      expect(payload).toEqual({
        targetBoardId: DEFAULT_CONNECT_METADATA.targetBoardId,
        ids: ["abc", "def"],
        allowMultiple: DEFAULT_CONNECT_METADATA.allowMultiple,
      });
    });
  });
});
