import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardsPage from "@/pages/BoardsPage";

const listBoardsForWorkspace = jest.fn();
const createBoard = jest.fn();
const executeBoardView = jest.fn();
const subscribeToBoard = jest.fn();

jest.mock("@/services/boards/boardService", () => ({
  listBoardsForWorkspace: (...args: unknown[]) => listBoardsForWorkspace(...args),
  createBoard: (...args: unknown[]) => createBoard(...args),
  executeBoardView: (...args: unknown[]) => executeBoardView(...args),
  subscribeToBoard: (...args: unknown[]) => subscribeToBoard(...args),
}));

jest.mock("@/state/workspace", () => ({
  useWorkspaceContext: () => ({
    currentWorkspace: { id: "workspace-1", name: "Workspace" },
  }),
  useWorkspaceContextOptional: () => ({
    currentWorkspace: { id: "workspace-1", name: "Workspace" },
  }),
}));

jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

jest.mock("@/components/ui/select", () => {
  const React = require("react");

  const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  SelectContent.displayName = "SelectContent";

  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );
  SelectItem.displayName = "SelectItem";

  const Select = ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string | null;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => {
    const options: React.ReactElement[] = [];

    React.Children.forEach(children, (child: any) => {
      if (child && child.type && child.type.displayName === "SelectContent") {
        React.Children.forEach(child.props.children, (optionChild: any) => {
          if (
            optionChild &&
            optionChild.type &&
            optionChild.type.displayName === "SelectItem"
          ) {
            options.push(optionChild);
          }
        });
      }
    });

    return (
      <select
        value={value ?? ""}
        onChange={(event) => onValueChange(event.target.value)}
        disabled={disabled}
      >
        {options}
      </select>
    );
  };

  const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const SelectValue = () => null;

  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

describe("Boards route flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    subscribeToBoard.mockReturnValue({ unsubscribe: jest.fn() });
  });

  const renderBoardsRoute = () =>
    render(
      <MemoryRouter initialEntries={["/boards"]}>
        <Routes>
          <Route path="/boards" element={<BoardsPage />} />
        </Routes>
      </MemoryRouter>
    );

  it("renders container boards and hydrates view results", async () => {
    listBoardsForWorkspace.mockResolvedValueOnce([
      {
        id: "board-1",
        workspaceId: "workspace-1",
        name: "Container board",
        description: "",
        type: "container",
        createdBy: "user-1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:10:00Z",
        scope: {
          id: "scope-1",
          boardId: "board-1",
          type: "container",
          containerId: "container-1",
          containerFilters: {},
          metadata: {},
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        views: [
          {
            id: "view-1",
            boardId: "board-1",
            name: "Active",
            slug: "active",
            description: undefined,
            isDefault: true,
            order: 0,
            configuration: {},
            filterExpression: null,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    executeBoardView.mockResolvedValueOnce({
      items: [{ id: "task-1", name: "Task 1" }],
      cursor: null,
      hasMore: false,
      refreshedAt: "2024-01-01T00:00:00Z",
      durationMs: null,
    });

    renderBoardsRoute();

    await waitFor(() => expect(listBoardsForWorkspace).toHaveBeenCalled());
    await waitFor(() => expect(executeBoardView).toHaveBeenCalledTimes(1));

    expect(screen.getByText("Container board")).toBeInTheDocument();
    expect(screen.getAllByText(/Task 1/).length).toBeGreaterThan(0);
    const [boardId, viewId, options] = executeBoardView.mock.calls[0];
    expect(boardId).toBe("board-1");
    expect(viewId).toBe("view-1");
    expect(options).toBeUndefined();
  });

  it("supports refreshing query views with incremental payloads", async () => {
    listBoardsForWorkspace.mockResolvedValueOnce([
      {
        id: "board-2",
        workspaceId: "workspace-1",
        name: "Query board",
        description: "",
        type: "query",
        createdBy: "user-1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        scope: {
          id: "scope-2",
          boardId: "board-2",
          type: "query",
          query: "status:open",
          queryFilters: {},
          metadata: {},
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        views: [
          {
            id: "view-2",
            boardId: "board-2",
            name: "Open",
            slug: "open",
            description: undefined,
            isDefault: true,
            order: 0,
            configuration: {},
            filterExpression: null,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    executeBoardView
      .mockResolvedValueOnce({
        items: [{ id: "task-2", name: "Initial task" }],
        cursor: null,
        hasMore: false,
        refreshedAt: "2024-01-01T00:00:00Z",
        durationMs: null,
      })
      .mockResolvedValueOnce({
        items: [{ id: "task-3", name: "New task" }],
        cursor: null,
        hasMore: false,
        refreshedAt: "2024-01-01T01:00:00Z",
        durationMs: null,
      });

    renderBoardsRoute();

    await waitFor(() => expect(listBoardsForWorkspace).toHaveBeenCalled());
    await waitFor(() => expect(executeBoardView).toHaveBeenCalledTimes(1));

    expect(screen.getAllByText(/Initial task/).length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Refresh$/ }));

    await waitFor(() => expect(executeBoardView).toHaveBeenCalledTimes(2));
    expect(executeBoardView.mock.calls[1][2]).toEqual({ since: "2024-01-01T00:00:00Z" });
    const newTaskMatches = await screen.findAllByText(/New task/);
    expect(newTaskMatches.length).toBeGreaterThan(0);
  });

  it("persists hybrid view selections between visits", async () => {
    listBoardsForWorkspace.mockResolvedValue([
      {
        id: "board-3",
        workspaceId: "workspace-1",
        name: "Hybrid board",
        description: "",
        type: "hybrid",
        createdBy: "user-1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        scope: {
          id: "scope-3",
          boardId: "board-3",
          type: "hybrid",
          containerId: "container-3",
          query: "assignee:@me",
          containerFilters: {},
          queryFilters: {},
          metadata: {},
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        views: [
          {
            id: "view-default",
            boardId: "board-3",
            name: "All",
            slug: "all",
            description: undefined,
            isDefault: true,
            order: 0,
            configuration: {},
            filterExpression: null,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          {
            id: "view-focus",
            boardId: "board-3",
            name: "Focus",
            slug: "focus",
            description: undefined,
            isDefault: false,
            order: 1,
            configuration: {},
            filterExpression: null,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    executeBoardView
      .mockResolvedValueOnce({
        items: [{ id: "task-default", name: "Default" }],
        cursor: null,
        hasMore: false,
        refreshedAt: "2024-01-01T00:00:00Z",
        durationMs: null,
      })
      .mockResolvedValueOnce({
        items: [{ id: "task-focus", name: "Focus" }],
        cursor: null,
        hasMore: false,
        refreshedAt: "2024-01-01T00:10:00Z",
        durationMs: null,
      })
      .mockResolvedValueOnce({
        items: [{ id: "task-focus", name: "Focus" }],
        cursor: null,
        hasMore: false,
        refreshedAt: "2024-01-01T00:10:00Z",
        durationMs: null,
      });

    const user = userEvent.setup();

    const { unmount } = renderBoardsRoute();

    await waitFor(() => expect(listBoardsForWorkspace).toHaveBeenCalled());
    await waitFor(() => expect(executeBoardView).toHaveBeenCalledTimes(1));

    expect(screen.getAllByText(/Default/).length).toBeGreaterThan(0);

    const viewSelect = screen.getAllByRole("combobox")[1] as HTMLSelectElement;
    await user.selectOptions(viewSelect, "view-focus");

    await waitFor(() => expect(executeBoardView).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("heading", { level: 3, name: /Focus/ })
    ).toBeInTheDocument();
    expect(executeBoardView.mock.calls[1][1]).toBe("view-focus");

    unmount();

    renderBoardsRoute();

    await waitFor(() => expect(executeBoardView).toHaveBeenCalledTimes(3));
    expect(executeBoardView.mock.calls[2][1]).toBe("view-focus");
    expect(
      screen.getByRole("heading", { level: 3, name: /Focus/ })
    ).toBeInTheDocument();
  });
});
