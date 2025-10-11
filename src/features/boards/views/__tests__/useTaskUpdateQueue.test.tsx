import { render } from "@testing-library/react";
import { act } from "react";
import { useEffect } from "react";

import { useTaskUpdateQueue } from "@/features/boards/views/useTaskUpdateQueue";

jest.mock("@/services/tasksService", () => ({
  batchUpdateTaskFields: jest.fn(),
}));

const { batchUpdateTaskFields } = jest.requireMock("@/services/tasksService") as {
  batchUpdateTaskFields: jest.Mock;
};

describe("useTaskUpdateQueue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    batchUpdateTaskFields.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  function Wrapper({
    onReady,
  }: {
    onReady: (queue: ReturnType<typeof useTaskUpdateQueue>) => void;
  }) {
    const queue = useTaskUpdateQueue({ flushIntervalMs: 10 });
    useEffect(() => {
      onReady(queue);
    }, [onReady, queue]);
    return null;
  }

  it("batches multiple updates into a single Supabase call", async () => {
    let queue: ReturnType<typeof useTaskUpdateQueue> | null = null;
    render(<Wrapper onReady={(value) => { queue = value; }} />);

    await act(async () => {});

    expect(queue).not.toBeNull();
    if (!queue) {
      return;
    }

    batchUpdateTaskFields.mockResolvedValueOnce([
      { id: "task-1" },
      { id: "task-2" },
    ]);

    const promises = [
      queue.enqueue({ id: "task-1", patch: { status: "done" } }),
      queue.enqueue({ id: "task-2", patch: { title: "Hello" } }),
    ];

    await act(async () => {
      jest.advanceTimersByTime(15);
      await Promise.all(promises);
    });

    expect(batchUpdateTaskFields).toHaveBeenCalledTimes(1);
    expect(batchUpdateTaskFields).toHaveBeenCalledWith([
      { id: "task-1", patch: { status: "done" } },
      { id: "task-2", patch: { title: "Hello" } },
    ]);
  });

  it("rejects queued promises when the batch fails", async () => {
    let queue: ReturnType<typeof useTaskUpdateQueue> | null = null;
    render(<Wrapper onReady={(value) => { queue = value; }} />);

    await act(async () => {});

    expect(queue).not.toBeNull();
    if (!queue) {
      return;
    }

    batchUpdateTaskFields.mockRejectedValueOnce(new Error("boom"));

    const promise = queue.enqueue({ id: "task-3", patch: { title: "Error" } });

    await act(async () => {
      jest.advanceTimersByTime(15);
      await expect(promise).rejects.toThrow("boom");
    });
    expect(batchUpdateTaskFields).toHaveBeenCalledTimes(1);
  });
});
