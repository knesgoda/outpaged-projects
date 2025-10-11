import { act, render, screen, waitFor } from "@testing-library/react";
import type { DropResult } from "@hello-pangea/dnd";
import { BoardViewCanvas } from "../index";
import { moveKanbanCard } from "../KanbanBoardView";
import type { BoardViewConfiguration } from "@/types/boards";
import { composeDroppableId, DEFAULT_SWIMLANE_ID } from "../kanbanDataset";
import { TooltipProvider } from "@/components/ui/tooltip";

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

  it("invokes the drag handler when a card is dropped", () => {
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

    act(() => {
      handler({
        source: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "todo"), index: 0 },
        destination: { droppableId: composeDroppableId(DEFAULT_SWIMLANE_ID, "done"), index: 1 },
        draggableId: "card-1",
        reason: "DROP",
        type: "DEFAULT",
        mode: "FLUID",
        combine: null,
      } as DropResult);
    });

    expect(handleItemsChange).toHaveBeenCalledTimes(1);
    const [nextItems] = handleItemsChange.mock.calls[0];
    expect(nextItems[0].status).toBe("done");
  });

  it("does not trigger item updates when dropping into another swimlane", () => {
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

    act(() => {
      handler({
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

  it("applies color rules to cards", () => {
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

    const cards = screen.getAllByTestId("board-card");
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

