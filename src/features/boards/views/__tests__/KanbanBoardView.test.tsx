import { act, render, screen, waitFor } from "@testing-library/react";
import type { DropResult } from "@hello-pangea/dnd";
import { BoardViewCanvas } from "../index";
import { moveKanbanCard } from "../KanbanBoardView";
import type { BoardViewConfiguration } from "@/types/boards";
import { composeDroppableId, DEFAULT_SWIMLANE_ID } from "../kanbanDataset";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BoardColumnRecord } from "../context";

jest.mock("@hello-pangea/dnd", () => {
  const React = require("react");
  let latestHandler: ((result: DropResult) => void) | null = null;
  return {
    __esModule: true,
    DragDropContext: ({ children, onDragEnd }: any) => {
      latestHandler = onDragEnd;
      return <div data-testid="drag-context">{children}</div>;
    },
    Droppable: ({ children, droppableId }: any) => (
      <div data-testid={`droppable-${droppableId}`}>
        {children(
          { innerRef: () => undefined, droppableProps: {}, placeholder: null },
          { isDraggingOver: false }
        )}
      </div>
    ),
    Draggable: ({ children, draggableId, index }: any) => (
      <div data-testid={`draggable-${draggableId}-${index}`}>
        {children(
          {
            innerRef: () => undefined,
            draggableProps: {},
            dragHandleProps: {},
          },
          { isDragging: false }
        )}
      </div>
    ),
    __mock: {
      getLatestHandler: () => latestHandler,
    },
  };
});

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (options: { count: number; estimateSize?: () => number }) => {
    const count = options.count ?? 0;
    const size = options.estimateSize ? options.estimateSize() : 208;
    const items = Array.from({ length: count }, (_, index) => ({
      index,
      key: index,
      size,
      start: index * size,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => items.reduce((total, item) => total + item.size, 0),
      measureElement: () => undefined,
    };
  },
}));

jest.mock("@/components/boards/BacklogPanel", () => {
  const React = require("react");
  return {
    BacklogPanel: () => <div data-testid="backlog-panel" />,
  };
});

jest.mock("@/components/boards/LeftSidebar", () => {
  const React = require("react");
  return {
    LeftSidebar: () => <div data-testid="left-sidebar" />,
  };
});

jest.mock("@/services/boards/columnService", () => {
  const actual = jest.requireActual("@/services/boards/columnService");
  return {
    ...actual,
    validateColumnMove: jest.fn(),
  };
});

const { validateColumnMove: validateColumnMoveMock } = jest.requireMock(
  "@/services/boards/columnService"
) as { validateColumnMove: jest.Mock };

describe("KanbanBoardView", () => {
  const buildConfiguration = (overrides: Partial<BoardViewConfiguration> = {}) => ({
    mode: "kanban" as const,
    filters: {},
    grouping: { primary: "status", swimlaneField: null, swimlanes: [] },
    sort: [],
    columnPreferences: { order: [], hidden: [] },
    timeline: null,
    colorRules: [],
    ...overrides,
  });

  const createColumn = (overrides: Partial<BoardColumnRecord>): BoardColumnRecord => ({
    id: "column-id",
    project_id: "project-id",
    name: "Column",
    position: 0,
    color: null,
    metadata: null,
    status_keys: [],
    wip_limit: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    is_default: false,
    ...overrides,
  });

  beforeEach(() => {
    validateColumnMoveMock.mockReset();
    validateColumnMoveMock.mockResolvedValue({ allowed: true });
  });

  it("reorders cards across columns", () => {
    const items = [
      { id: "1", title: "Todo", status: "todo" },
      { id: "2", title: "Done", status: "done" },
    ];

    const result = moveKanbanCard({
      items,
      groupingField: "status",
      swimlaneField: null,
      swimlanes: [
        { id: DEFAULT_SWIMLANE_ID, label: "All items", value: null, isDefault: true, order: 0 },
      ],
      source: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "todo"), index: 0 },
      destination: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "done"), index: 1 },
    });

    expect(result[0].status).toBe("done");
    expect(result[1].status).toBe("done");
  });

  it("prevents moving cards across swimlanes", () => {
    const items = [
      { id: "1", title: "Todo", status: "todo", epic: "alpha" },
      { id: "2", title: "Todo", status: "todo", epic: "beta" },
    ];

    const result = moveKanbanCard({
      items,
      groupingField: "status",
      swimlaneField: "epic",
      swimlanes: [
        { id: "lane-alpha", label: "Alpha", value: "alpha", order: 0 },
        { id: "lane-beta", label: "Beta", value: "beta", order: 1 },
      ],
      source: { droppableId: composeDroppableId("lane-alpha", "todo"), index: 0 },
      destination: { droppableId: composeDroppableId("lane-beta", "todo"), index: 0 },
    });

    expect(result).toEqual(items);
  });

  it("invokes the drag handler when a card is dropped", async () => {
    const handleItemsChange = jest.fn();

    render(
      <TooltipProvider>
        <BoardViewCanvas
          items={[
            { id: "1", title: "A", status: "todo" },
            { id: "2", title: "B", status: "done" },
          ]}
          configuration={buildConfiguration()}
          onItemsChange={handleItemsChange}
        />
      </TooltipProvider>
    );

    const dnd: any = require("@hello-pangea/dnd");
    const handler = dnd.__mock.getLatestHandler();
    expect(handler).toBeInstanceOf(Function);

    await act(async () => {
      await handler({
        source: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "todo"), index: 0 },
        destination: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "done"), index: 1 },
        draggableId: "card-1",
        reason: "DROP",
        type: "DEFAULT",
        mode: "FLUID",
        combine: null,
      } as DropResult);
    });

    await waitFor(() => {
      expect(handleItemsChange).toHaveBeenCalledTimes(1);
    });
    const [nextItems] = handleItemsChange.mock.calls[0];
    expect(nextItems[0].status).toBe("done");
  });

  it("does not trigger item updates when dropping into another swimlane", async () => {
    const handleItemsChange = jest.fn();

    render(
      <TooltipProvider>
        <BoardViewCanvas
          items={[
            { id: "1", title: "A", status: "todo", epic: "alpha" },
            { id: "2", title: "B", status: "todo", epic: "beta" },
          ]}
          configuration={buildConfiguration({
            grouping: {
              primary: "status",
              swimlaneField: "epic",
              swimlanes: [
                { id: "lane-alpha", label: "Alpha", value: "alpha", order: 0 },
                { id: "lane-beta", label: "Beta", value: "beta", order: 1 },
              ],
            },
          })}
          onItemsChange={handleItemsChange}
        />
      </TooltipProvider>
    );

    const dnd: any = require("@hello-pangea/dnd");
    const handler = dnd.__mock.getLatestHandler();
    expect(handler).toBeInstanceOf(Function);

    await act(async () => {
      await handler({
        source: { droppableId: composeDroppableId("lane-alpha", "todo"), index: 0 },
        destination: { droppableId: composeDroppableId("lane-beta", "todo"), index: 0 },
        draggableId: "card-1",
        reason: "DROP",
        type: "DEFAULT",
        mode: "FLUID",
        combine: null,
      } as DropResult);
    });

    expect(handleItemsChange).not.toHaveBeenCalled();
  });

  it("blocks moves when a destination column hits its hard WIP limit", async () => {
    const handleItemsChange = jest.fn();
    const columns: BoardColumnRecord[] = [
      createColumn({
        id: "col-todo",
        name: "Todo",
        position: 0,
        status_keys: ["todo"],
      }),
      createColumn({
        id: "col-done",
        name: "Done",
        position: 1,
        status_keys: ["done"],
        metadata: { wip: { hard: 1 } } as any,
      }),
    ];

    validateColumnMoveMock.mockResolvedValueOnce({
      allowed: false,
      reason: "Hard WIP limit reached",
      severity: "block",
    });

    render(
      <TooltipProvider>
        <BoardViewCanvas
          items={[
            { id: "task-1", title: "A", status: "todo" },
            { id: "task-2", title: "B", status: "done" },
          ]}
          configuration={buildConfiguration()}
          onItemsChange={handleItemsChange}
          columns={columns}
        />
      </TooltipProvider>
    );

    const dnd: any = require("@hello-pangea/dnd");
    const handler = dnd.__mock.getLatestHandler();
    expect(handler).toBeInstanceOf(Function);

    await act(async () => {
      await handler({
        source: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "todo"), index: 0 },
        destination: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "done"), index: 1 },
        draggableId: "card-1",
        reason: "DROP",
        type: "DEFAULT",
        mode: "FLUID",
        combine: null,
      } as DropResult);
    });

    expect(validateColumnMoveMock).toHaveBeenCalledTimes(1);
    const [taskId, columnId, currentCount] = validateColumnMoveMock.mock.calls[0];
    expect(taskId).toBe("task-1");
    expect(columnId).toBe("col-done");
    expect(currentCount).toBe(1);
    expect(handleItemsChange).not.toHaveBeenCalled();
  });

  it("applies color rules to cards", async () => {
    render(
      <TooltipProvider>
        <BoardViewCanvas
          items={[{ id: "1", title: "A", status: "blocked" }]}
          configuration={buildConfiguration({
            colorRules: [
              { id: "rule-1", label: "Blocked", type: "status", color: "#ef4444", value: "blocked" },
            ],
          })}
        />
      </TooltipProvider>
    );

    const cards = await screen.findAllByTestId("board-card");
    expect(cards[0]).toHaveAttribute("data-color", "#ef4444");
  });

  it("persists derived grouping configuration", async () => {
    const handleConfigurationChange = jest.fn();

    render(
      <TooltipProvider>
        <BoardViewCanvas
          items={[{ id: "1", title: "Item", status: "todo" }]}
          configuration={buildConfiguration({
            grouping: { primary: null, swimlaneField: null, swimlanes: [] },
          })}
          onConfigurationChange={handleConfigurationChange}
        />
      </TooltipProvider>
    );

    await waitFor(() => {
      expect(handleConfigurationChange).toHaveBeenCalled();
    });

    const [nextConfig] = handleConfigurationChange.mock.calls.at(-1) ?? [];
    expect(nextConfig.grouping.primary).toBe("status");
  });
});

