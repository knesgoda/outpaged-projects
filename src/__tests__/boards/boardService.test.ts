import {
  createBoard,
  executeBoardView,
  listBoardsForWorkspace,
  subscribeToBoard,
} from "@/services/boards/boardService";
import type { BoardFilterExpressionRow } from "@/types/boards";

const mockChannel = jest.fn();
const mockRpc = jest.fn();
const mockRemoveChannel = jest.fn();

const mockFrom = jest.fn();

jest.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

const mockRequireUserId = jest.fn();
const mockMapSupabaseError = jest
  .fn()
  .mockImplementation((error: { message?: string | null } | null, fallback: string) =>
    new Error(error?.message ?? fallback)
  );

jest.mock("@/services/utils", () => ({
  requireUserId: (...args: unknown[]) => mockRequireUserId(...args),
  mapSupabaseError: (...args: unknown[]) => mockMapSupabaseError(...args),
}));

type InsertBuilder = {
  insert: jest.Mock;
  select: jest.Mock;
  single: jest.Mock;
};

type ViewInsertBuilder = {
  insert: jest.Mock;
};

type BoardRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  type: "container" | "query" | "hybrid";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  board_scopes: Array<{
    id: string;
    board_id: string;
    scope_type: "container" | "query" | "hybrid";
    container_id: string | null;
    query_definition: string | null;
    filters: Record<string, unknown>;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
  board_views: Array<{
    id: string;
    board_id: string;
    name: string;
    slug: string;
    description: string | null;
    is_default: boolean;
    position: number;
    configuration: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    filter_expression: BoardFilterExpressionRow | null;
  }>;
};

describe("boardService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockChannel.mockReset();
    mockRemoveChannel.mockReset();
    mockFrom.mockReset();
    mockRequireUserId.mockReset();
    mockMapSupabaseError.mockClear();
  });

  const createHydratedBoardRow = (): BoardRow => ({
    id: "board-1",
    workspace_id: "workspace-1",
    name: "Hybrid planning",
    description: "Board description",
    type: "hybrid",
    created_by: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T01:00:00Z",
    board_scopes: [
      {
        id: "scope-1",
        board_id: "board-1",
        scope_type: "hybrid",
        container_id: "container-1",
        query_definition: "status:open",
        filters: {
          container: { lane: "doing" },
          query: { assigned: true },
        },
        metadata: { columns: 4 },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T01:00:00Z",
      },
    ],
    board_views: [
      {
        id: "view-1",
        board_id: "board-1",
        name: "Active work",
        slug: "active",
        description: null,
        is_default: true,
        position: 0,
        configuration: { grouping: "status" },
        created_at: "2024-01-01T00:05:00Z",
        updated_at: "2024-01-01T00:10:00Z",
        filter_expression: {
          id: "filter-1",
          board_id: "board-1",
          expression_type: "hybrid",
          expression: {
            containerId: "container-1",
            query: "status:open",
            containerFilters: { lane: "doing" },
            queryFilters: { assigned: true },
          },
          created_at: "2024-01-01T00:04:00Z",
          updated_at: "2024-01-01T00:06:00Z",
          metadata: { pinned: true },
          refresh_interval_seconds: 300,
          last_evaluated_at: "2024-01-01T00:06:00Z",
        },
      },
    ],
  });

  it("hydrates boards with scopes and views", async () => {
    const row = createHydratedBoardRow();
    const selectMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockReturnThis();
    const orderMock = jest.fn().mockResolvedValue({ data: [row], error: null });
    const builder = {
      select: selectMock,
      eq: eqMock,
      order: orderMock,
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "boards") {
        return builder;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const boards = await listBoardsForWorkspace("workspace-1");

    expect(mockFrom).toHaveBeenCalledWith("boards");
    expect(orderMock).toHaveBeenCalledWith("name", { ascending: true });
    expect(boards).toEqual([
      {
        id: "board-1",
        workspaceId: "workspace-1",
        name: "Hybrid planning",
        description: "Board description",
        type: "hybrid",
        createdBy: "user-1",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T01:00:00Z",
        scope: {
          id: "scope-1",
          boardId: "board-1",
          type: "hybrid",
          containerId: "container-1",
          query: "status:open",
          containerFilters: { lane: "doing" },
          queryFilters: { assigned: true },
          metadata: { columns: 4 },
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T01:00:00Z",
        },
        views: [
          {
            id: "view-1",
            boardId: "board-1",
            name: "Active work",
            slug: "active",
            description: undefined,
            isDefault: true,
            order: 0,
            configuration: {
              mode: "table",
              filters: {},
              grouping: "status",
              sort: null,
              columnPreferences: { order: [], hidden: [] },
              timeline: null,
            },
            columnPreferences: { order: [], hidden: [] },
            filterExpression: {
              id: "filter-1",
              boardId: "board-1",
              type: "hybrid",
              containerId: "container-1",
              query: "status:open",
              containerFilters: { lane: "doing" },
              queryFilters: { assigned: true },
              refreshIntervalSeconds: 300,
              lastEvaluatedAt: "2024-01-01T00:06:00Z",
              metadata: { pinned: true },
              createdAt: "2024-01-01T00:04:00Z",
              updatedAt: "2024-01-01T00:06:00Z",
            },
            createdAt: "2024-01-01T00:05:00Z",
            updatedAt: "2024-01-01T00:10:00Z",
          },
        ],
      },
    ]);
  });

  it("creates a board with scope and default view", async () => {
    const boardInsertBuilder: InsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "board-1" }, error: null }),
    };

    const scopeInsertBuilder: InsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "scope-1" }, error: null }),
    };

    const filterInsertBuilder: InsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "filter-1",
          board_id: "board-1",
          expression_type: "container",
          expression: { containerId: "container-1" },
          metadata: {},
          refresh_interval_seconds: null,
          last_evaluated_at: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      }),
    };

    const viewInsertBuilder: ViewInsertBuilder = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    };

    const boardSelectBuilder = {
      insert: jest.fn(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: createHydratedBoardRow(), error: null }),
      single: jest.fn(),
    };

    const callMap: Record<string, unknown[]> = {
      boards: [boardInsertBuilder, boardSelectBuilder],
      board_scopes: [scopeInsertBuilder],
      board_filter_expressions: [filterInsertBuilder],
      board_views: [viewInsertBuilder],
    };

    mockFrom.mockImplementation((table: string) => {
      const queue = callMap[table];
      if (!queue || queue.length === 0) {
        throw new Error(`Unexpected table ${table}`);
      }
      return queue.shift();
    });

    mockRequireUserId.mockResolvedValue("user-1");

    const result = await createBoard({
      workspaceId: "workspace-1",
      name: "Platform work",
      scope: {
        type: "container",
        containerId: "container-1",
        containerFilters: { status: "active" },
      },
    });

    expect(mockRequireUserId).toHaveBeenCalled();
    expect(boardInsertBuilder.insert).toHaveBeenCalledWith({
      workspace_id: "workspace-1",
      name: "Platform work",
      description: null,
      type: "container",
      created_by: "user-1",
    });

    expect(scopeInsertBuilder.insert).toHaveBeenCalledWith({
      board_id: "board-1",
      scope_type: "container",
      filters: { container: { status: "active" } },
      metadata: {},
      container_id: "container-1",
      query_definition: null,
    });

    expect(filterInsertBuilder.insert).toHaveBeenCalledWith({
      board_id: "board-1",
      expression_type: "container",
      expression: { containerId: "container-1", containerFilters: { status: "active" } },
      metadata: {},
      refresh_interval_seconds: null,
    });

    expect(viewInsertBuilder.insert).toHaveBeenCalledWith({
      board_id: "board-1",
      name: "Default view",
      slug: expect.stringMatching(/^default/),
      description: null,
      is_default: true,
      position: 0,
      configuration: {},
      filter_expression_id: "filter-1",
    });

    expect(result.id).toBe("board-1");
    expect(result.views.length).toBeGreaterThan(0);
  });

  it("executes board views with incremental payload", async () => {
    mockRpc.mockResolvedValue({
      data: {
        items: [{ id: "task-1", name: "Task 1" }],
        cursor: "cursor-2",
        has_more: true,
        refreshed_at: "2024-01-02T00:00:00Z",
        duration_ms: 120,
      },
      error: null,
    });

    const result = await executeBoardView("board-1", "view-1", {
      since: "2024-01-01T00:00:00Z",
      cursor: "cursor-1",
      limit: 25,
    });

    expect(mockRpc).toHaveBeenCalledWith("execute_board_view", {
      board_id: "board-1",
      view_id: "view-1",
      cursor: "cursor-1",
      since: "2024-01-01T00:00:00Z",
      limit: 25,
    });

    expect(result).toEqual({
      items: [{ id: "task-1", name: "Task 1" }],
      cursor: "cursor-2",
      hasMore: true,
      refreshedAt: "2024-01-02T00:00:00Z",
      durationMs: 120,
    });
  });

  it("subscribes to realtime changes and supports unsubscribe", () => {
    const onMock = jest.fn().mockReturnThis();
    const subscribeMock = jest.fn().mockResolvedValue({ data: { status: "SUBSCRIBED" }, error: null });
    const unsubscribeMock = jest.fn();

    mockChannel.mockReturnValue({
      on: onMock,
      subscribe: subscribeMock,
      unsubscribe: unsubscribeMock,
    });

    const listener = jest.fn();
    const subscription = subscribeToBoard("board-1", listener);

    expect(mockChannel).toHaveBeenCalledWith("boards:board-1");
    expect(onMock).toHaveBeenCalledTimes(4);

    const payload = { eventType: "UPDATE", new: { id: "board-1" }, old: null };
    const boardHandler = onMock.mock.calls[0][2];
    boardHandler(payload);

    expect(listener).toHaveBeenCalledWith({
      table: "boards",
      eventType: "UPDATE",
      newRecord: { id: "board-1" },
      oldRecord: null,
    });

    subscription.unsubscribe();

    expect(unsubscribeMock).toHaveBeenCalled();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
