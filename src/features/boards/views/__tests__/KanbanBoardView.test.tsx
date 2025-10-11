import { act, render } from "@testing-library/react";
import type { DropResult } from "@hello-pangea/dnd";
import { BoardViewCanvas } from "../index";
import { moveKanbanCard } from "../KanbanBoardView";
import type { BoardViewConfiguration } from "@/types/boards";

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
    grouping: "status",
    sort: null,
    columnPreferences: { order: [], hidden: [] },
    timeline: null,
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
      source: { droppableId: "todo", index: 0 },
      destination: { droppableId: "done", index: 1 },
    });

    expect(result[0].status).toBe("done");
    expect(result[1].status).toBe("done");
  });

  it("invokes the drag handler when a card is dropped", () => {
    const handleItemsChange = jest.fn();

    render(
      <BoardViewCanvas
        items={[
          { id: "1", title: "A", status: "todo" },
          { id: "2", title: "B", status: "done" },
        ]}
        configuration={buildConfiguration()}
        onItemsChange={handleItemsChange}
      />
    );

    const dnd: any = require("@hello-pangea/dnd");
    const handler = dnd.__mock.getLatestHandler();
    expect(handler).toBeInstanceOf(Function);

    act(() => {
      handler({
        source: { droppableId: "todo", index: 0 },
        destination: { droppableId: "done", index: 1 },
        draggableId: "card-todo-0",
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
});

