import {
  clearBoardMutations,
  enqueueBoardMutation,
  listBoardMutations,
  processBoardMutationQueue,
  resolveBoardConflict,
  type QueueSyncer,
} from "@/services/offline";

const boardId = "test-board";
const view = "kanban";

const successSyncer: QueueSyncer = async () => ({ kind: "success" });

describe("mobile board sync queue", () => {
  beforeEach(async () => {
    await clearBoardMutations(boardId, view);
  });

  it("retains conflict metadata when the server rejects a change", async () => {
    await enqueueBoardMutation({
      boardId,
      view,
      itemId: "task-1",
      payload: { type: "update", changes: { status: "In Progress" }, field: "status" },
      baseVersion: 1,
    });

    const result = await processBoardMutationQueue(boardId, view, async () => ({
      kind: "conflict",
      remote: { id: "task-1", status: "Done" },
      reason: "Updated by teammate",
    }));

    expect(result.conflicts).toHaveLength(1);
    const [conflict] = result.conflicts;
    expect(conflict?.remote.status).toBe("Done");

    const queue = await listBoardMutations(boardId, view);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.status).toBe("conflict");
    expect(queue[0]?.conflict?.remote.status).toBe("Done");
  });

  it("removes a conflict after retrying and syncing successfully", async () => {
    const mutation = await enqueueBoardMutation({
      boardId,
      view,
      itemId: "task-1",
      payload: { type: "update", changes: { status: "In Progress" }, field: "status" },
      baseVersion: 1,
    });

    await processBoardMutationQueue(boardId, view, async () => ({
      kind: "conflict",
      remote: { id: "task-1", status: "Done" },
      reason: "Updated by teammate",
    }));

    await resolveBoardConflict(mutation.id, "retry");

    const retryResult = await processBoardMutationQueue(boardId, view, successSyncer);
    expect(retryResult.processed).toHaveLength(1);

    const queue = await listBoardMutations(boardId, view);
    expect(queue).toHaveLength(0);
  });
});
