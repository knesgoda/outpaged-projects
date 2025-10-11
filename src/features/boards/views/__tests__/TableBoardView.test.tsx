import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardViewCanvas } from "../index";
import type { BoardViewConfiguration } from "@/types/boards";
import { batchUpdateTaskFields, replaceTaskAssignees } from "@/services/tasksService";
import { useState } from "react";

jest.mock("@/services/tasksService", () => ({
  batchUpdateTaskFields: jest.fn().mockResolvedValue([]),
  replaceTaskAssignees: jest.fn().mockResolvedValue(undefined),
}));

const buildConfiguration = (): BoardViewConfiguration => ({
  mode: "table",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: ["title"], hidden: [] },
  timeline: null,
  colorRules: [],
});

function renderControlledBoard({
  initialItems,
  configuration = buildConfiguration(),
  onChangeCapture,
}: {
  initialItems: Array<Record<string, unknown>>;
  configuration?: BoardViewConfiguration;
  onChangeCapture?: (items: Array<Record<string, unknown>>) => void;
}) {
  function Wrapper() {
    const [items, setItems] = useState(initialItems);
    const handleItemsChange = (next: Array<Record<string, unknown>>) => {
      onChangeCapture?.(next);
      setItems(next);
    };
    return (
      <BoardViewCanvas items={items} configuration={configuration} onItemsChange={handleItemsChange} />
    );
  }

  return render(<Wrapper />);
}

describe("TableBoardView", () => {
  const mockBatchUpdate = batchUpdateTaskFields as jest.MockedFunction<typeof batchUpdateTaskFields>;
  const mockReplaceAssignees = replaceTaskAssignees as jest.MockedFunction<typeof replaceTaskAssignees>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchUpdate.mockResolvedValue([]);
    mockReplaceAssignees.mockResolvedValue(undefined);
  });

  it("supports inline editing with keyboard interactions", async () => {
    const user = userEvent.setup();
    const handleItemsChange = jest.fn();

    render(
      <BoardViewCanvas
        items={[{ id: "1", title: "Initial", status: "todo" }]}
        configuration={buildConfiguration()}
        onItemsChange={handleItemsChange}
      />
    );

    const cell = await screen.findByText("Initial");
    await user.click(cell);

    const input = await screen.findByRole("textbox", { name: /edit title/i });
    await user.clear(input);
    await user.type(input, "Updated");
    const saveButton = await screen.findByRole("button", { name: /save/i });
    await user.click(saveButton);

    expect(handleItemsChange).toHaveBeenCalled();
    const lastCall = handleItemsChange.mock.calls.at(-1);
    expect(lastCall?.[0][0].title).toContain("Updated");
    expect(batchUpdateTaskFields).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "1",
        patch: expect.objectContaining({ title: expect.any(String) }),
      }),
    ]);
  });

  it("updates assignees using replaceTaskAssignees", async () => {
    const user = userEvent.setup();

    render(
      <BoardViewCanvas
        items={[{ id: "1", title: "Initial", status: "todo", assignees: ["user-1"] }]}
        configuration={{
          ...buildConfiguration(),
          columnPreferences: { order: ["title", "assignees"], hidden: [] },
        }}
      />
    );

    const assigneeCell = await screen.findByText("user-1");
    await user.click(assigneeCell);
    const input = await screen.findByRole("textbox", { name: /edit assignees/i });
    fireEvent.change(input, { target: { value: "user-2 user-3" } });
    const saveButton = await screen.findByRole("button", { name: /save/i });
    await user.click(saveButton);

    const assigneeCall = (replaceTaskAssignees as jest.Mock).mock.calls.at(-1);
    expect(assigneeCall?.[0]).toBe("1");
    expect(Array.isArray(assigneeCall?.[1])).toBe(true);
    expect((assigneeCall?.[1] as string[]).join(" ")).toEqual(expect.stringContaining("user-2"));
  });

  it("queues offline changes and retries the queue", async () => {
    const user = userEvent.setup();
    mockBatchUpdate.mockRejectedValueOnce(new Error("Failed to fetch"));
    mockBatchUpdate.mockResolvedValue([{ id: "1", title: "Retried" } as any]);

    renderControlledBoard({ initialItems: [{ id: "1", title: "Initial", status: "todo" }] });

    const cell = await screen.findByText("Initial");
    await user.click(cell);

    const input = await screen.findByRole("textbox", { name: /edit title/i });
    await user.clear(input);
    await user.type(input, "Offline change");
    await user.click(await screen.findByRole("button", { name: /save/i }));

    const banner = await screen.findByTestId("board-offline-banner");
    expect(banner).toHaveTextContent(/queued/);

    await user.click(screen.getByRole("button", { name: /retry queued changes/i }));

    await waitFor(() => expect(screen.queryByTestId("board-offline-banner")).not.toBeInTheDocument());
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
  });

  it("supports undo and redo actions", async () => {
    const user = userEvent.setup();
    mockBatchUpdate.mockResolvedValueOnce([{ id: "1", title: "Updated" } as any]);
    mockBatchUpdate.mockResolvedValueOnce([{ id: "1", title: "Initial" } as any]);
    mockBatchUpdate.mockResolvedValueOnce([{ id: "1", title: "Updated" } as any]);

    let latestItems: Array<Record<string, unknown>> = [];
    renderControlledBoard({
      initialItems: [{ id: "1", title: "Initial", status: "todo" }],
      onChangeCapture: (items) => {
        latestItems = items;
      },
    });

    const cell = await screen.findByText(/Initial/i);
    await user.click(cell);

    const input = await screen.findByRole("textbox", { name: /edit title/i });
    await user.clear(input);
    await user.type(input, "Updated");
    await user.click(await screen.findByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(latestItems[0]?.title).toBe("Updated");
    });

    const undoButton = screen.getByRole("button", { name: /undo change/i });
    await waitFor(() => expect(undoButton).not.toBeDisabled());
    await user.click(undoButton);
    await waitFor(() => {
      expect(latestItems[0]?.title).toBe("Initial");
    });

    const redoButton = screen.getByRole("button", { name: /redo change/i });
    await waitFor(() => expect(redoButton).not.toBeDisabled());
    await user.click(redoButton);
    await waitFor(() => {
      expect(latestItems[0]?.title).toBe("Updated");
    });

    expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
  });

  it("shows validation errors before committing", async () => {
    const user = userEvent.setup();

    renderControlledBoard({ initialItems: [{ id: "1", title: "Initial", status: "todo" }] });

    const cell = await screen.findByText(/Initial/i);
    await user.click(cell);

    const input = await screen.findByRole("textbox", { name: /edit title/i });
    await user.clear(input);
    await user.click(await screen.findByRole("button", { name: /save/i }));

    await screen.findByText((content) => /title is required/i.test(content));
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it("handles conflict resolution dialogs", async () => {
    const user = userEvent.setup();
    const conflictError = Object.assign(new Error("Conflict detected"), {
      remote: { title: "Server value" },
      field: "title",
    });
    mockBatchUpdate.mockRejectedValueOnce(conflictError as any);
    mockBatchUpdate.mockResolvedValue([{ id: "1", title: "Local value" } as any]);

    let latestItems: Array<Record<string, unknown>> = [];
    renderControlledBoard({
      initialItems: [{ id: "1", title: "Initial", status: "todo" }],
      onChangeCapture: (items) => {
        latestItems = items;
      },
    });

    const cell = await screen.findByText(/Initial/i);
    await user.click(cell);

    const input = await screen.findByRole("textbox", { name: /edit title/i });
    await user.clear(input);
    await user.type(input, "Local value");
    await user.click(await screen.findByRole("button", { name: /save/i }));

    const dialog = await screen.findByTestId("board-conflict-dialog");
    expect(dialog).toHaveTextContent("Local value");
    expect(dialog).toHaveTextContent("Server value");

    await user.click(screen.getByRole("button", { name: /use server value/i }));

    await waitFor(() => {
      expect(latestItems[0]?.title).toBe("Server value");
    });
  });
});

