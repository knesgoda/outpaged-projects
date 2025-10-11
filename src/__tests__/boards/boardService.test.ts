import {
  createBoard,
  executeBoardView,
  listBoardsForWorkspace,
  listBoardTemplates,
  instantiateBoardTemplate,
  copyBoard,
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

type TemplateRow = {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  slug: string;
  type: "container" | "query" | "hybrid";
  visibility: "public" | "workspace" | "private";
  preview_asset_url: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  scope_definition: Record<string, unknown>;
  supports_items: boolean;
  supports_automations: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  fields: Array<{
    id: string;
    template_id: string;
    field_key: string;
    label: string;
    field_type: string;
    configuration: Record<string, unknown>;
    is_required: boolean;
    is_primary: boolean;
    position: number;
    created_at: string;
    updated_at: string;
  }>;
  views: Array<{
    id: string;
    template_id: string;
    name: string;
    slug: string;
    description: string | null;
    is_default: boolean;
    position: number;
    configuration: Record<string, unknown>;
    filter_definition: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    color_rules: Array<{
      id: string;
      template_view_id: string;
      label: string;
      rule_type: string;
      color: string;
      field: string | null;
      value: unknown;
      description: string | null;
      expression: string | null;
      position: number;
      created_at: string;
      updated_at: string;
    }>;
  }>;
  automations: Array<{
    id: string;
    template_id: string;
    recipe_slug: string;
    name: string;
    description: string | null;
    trigger_config: Record<string, unknown>;
    action_config: Record<string, unknown>;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
  }>;
  items: Array<{
    id: string;
    template_id: string;
    name: string;
    data: Record<string, unknown>;
    position: number;
    created_at: string;
    updated_at: string;
  }>;
};

const TEST_BOARD_DEFAULTS = {
  defaultViewMode: "table" as const,
  availableViewModes: ["table", "kanban", "timeline", "calendar"] as const,
  colorField: "status",
  colorMode: "status" as const,
  wipEnabled: false,
  backlogRanking: "manual" as const,
  showWeekendShading: true,
  workingTime: { timezone: "UTC", startHour: 9, endHour: 17 },
  cardFieldPresets: [
    { field: "status", visible: true },
    { field: "assignee", visible: true },
    { field: "dueDate", visible: true },
    { field: "priority", visible: true },
    { field: "tags", visible: false },
  ],
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
        metadata: { columns: 4, defaults: TEST_BOARD_DEFAULTS },
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

  const createTemplateRow = (): TemplateRow => ({
    id: "template-1",
    workspace_id: null,
    name: "Product planning",
    description: "Plan launches across teams",
    slug: "product-planning",
    type: "hybrid",
    visibility: "public",
    preview_asset_url: null,
    tags: ["planning", "product"],
    metadata: {},
  scope_definition: {
    type: "hybrid",
    containerId: "container-1",
    query: "status:open",
    containerFilters: { stage: "active" },
    queryFilters: { assigned: true },
    metadata: { defaults: TEST_BOARD_DEFAULTS },
  },
    supports_items: true,
    supports_automations: true,
    created_by: "user-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    fields: [
      {
        id: "field-1",
        template_id: "template-1",
        field_key: "status",
        label: "Status",
        field_type: "select",
        configuration: { options: ["Backlog", "Active", "Done"] },
        is_required: false,
        is_primary: false,
        position: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ],
    views: [
      {
        id: "template-view-1",
        template_id: "template-1",
        name: "Active initiatives",
        slug: "active",
        description: null,
        is_default: true,
        position: 0,
        configuration: {
          mode: "kanban",
          filters: {},
          grouping: { primary: "status", swimlaneField: null, swimlanes: [] },
          sort: [],
          columnPreferences: { order: [], hidden: [] },
          timeline: null,
          colorRules: [],
        },
        filter_definition: {
          type: "hybrid",
          containerId: "container-1",
          query: "status:open",
          containerFilters: { stage: "active" },
          queryFilters: { assigned: true },
        },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        color_rules: [
          {
            id: "rule-1",
            template_view_id: "template-view-1",
            label: "High priority",
            rule_type: "priority",
            color: "#ef4444",
            field: "priority",
            value: "high",
            description: null,
            expression: null,
            position: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ],
    automations: [
      {
        id: "automation-1",
        template_id: "template-1",
        recipe_slug: "notify-on-status",
        name: "Notify owner",
        description: "Ping the owner when an item moves to done.",
        trigger_config: { status: "done" },
        action_config: { channel: "slack" },
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ],
    items: [
      {
        id: "item-1",
        template_id: "template-1",
        name: "Kickoff research",
        data: { owner: "alice" },
        position: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: "item-2",
        template_id: "template-1",
        name: "Define launch brief",
        data: { owner: "bob" },
        position: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
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
          metadata: { columns: 4, defaults: TEST_BOARD_DEFAULTS },
          defaults: TEST_BOARD_DEFAULTS,
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
              grouping: { primary: "status", swimlaneField: null, swimlanes: [] },
              sort: [],
              columnPreferences: { order: [], hidden: [] },
              timeline: null,
              colorRules: [],
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

    const createFilterInsertBuilder = (index: number): InsertBuilder => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: `filter-${index}`,
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
    });

    const filterInsertBuilders = Array.from({ length: 4 }, (_, index) =>
      createFilterInsertBuilder(index + 1)
    );

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
      board_filter_expressions: [...filterInsertBuilders],
      board_views: Array.from({ length: 4 }, () => viewInsertBuilder),
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

    const scopePayload = scopeInsertBuilder.insert.mock.calls[0]?.[0];
    expect(scopePayload).toMatchObject({
      board_id: "board-1",
      scope_type: "container",
      filters: { container: { status: "active" } },
      container_id: "container-1",
      query_definition: null,
    });
    expect(scopePayload.metadata.defaults).toEqual(TEST_BOARD_DEFAULTS);

    const filterPayload = filterInsertBuilders[0]?.insert.mock.calls[0]?.[0];
    expect(filterPayload).toMatchObject({
      board_id: "board-1",
      expression_type: "container",
      expression: { containerId: "container-1", containerFilters: { status: "active" } },
    });
    expect(filterPayload.metadata.defaults).toMatchObject({
      defaultViewMode: "table",
      backlogRanking: "manual",
      wipEnabled: false,
    });

    expect(viewInsertBuilder.insert).toHaveBeenCalledTimes(4);
    const [tableCall, kanbanCall, timelineCall, calendarCall] = viewInsertBuilder.insert.mock.calls;

    const tablePayload = tableCall[0];
    expect(tablePayload).toMatchObject({
      board_id: "board-1",
      name: "Table",
      slug: "table",
      is_default: true,
      position: 0,
    });
    expect((tablePayload.configuration as any).mode).toBe("table");
    expect((tablePayload.configuration as any).columnPreferences).toMatchObject({
      order: TEST_BOARD_DEFAULTS.cardFieldPresets
        .filter((preset) => preset.visible)
        .map((preset) => preset.field),
      hidden: TEST_BOARD_DEFAULTS.cardFieldPresets
        .filter((preset) => !preset.visible)
        .map((preset) => preset.field),
    });

    const kanbanPayload = kanbanCall[0];
    expect(kanbanPayload).toMatchObject({
      name: "Kanban",
      slug: "kanban",
      is_default: false,
      position: 1,
    });
    expect((kanbanPayload.configuration as any).mode).toBe("kanban");
    expect((kanbanPayload.configuration as any).sort?.[0]).toMatchObject({
      field: "backlog_rank",
      manual: true,
    });

    const timelinePayload = timelineCall[0];
    expect((timelinePayload.configuration as any).mode).toBe("timeline");
    expect((timelinePayload.configuration as any).timeline).toMatchObject({
      showWeekends: true,
      workingHours: TEST_BOARD_DEFAULTS.workingTime,
    });

    const calendarPayload = calendarCall[0];
    expect((calendarPayload.configuration as any).mode).toBe("calendar");
    expect(calendarPayload.position).toBe(3);

    expect(result.id).toBe("board-1");
    expect(result.views.length).toBeGreaterThan(0);
  });

  it("lists board templates with summaries", async () => {
    const templateRow = createTemplateRow();
    const selectMock = jest.fn().mockReturnThis();
    const orMock = jest.fn().mockReturnThis();
    const orderMock = jest
      .fn()
      .mockResolvedValue({ data: [templateRow], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "board_templates") {
        return {
          select: selectMock,
          or: orMock,
          order: orderMock,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mockRequireUserId.mockResolvedValue("user-1");

    const summaries = await listBoardTemplates("workspace-1");

    expect(selectMock).toHaveBeenCalledWith(expect.stringContaining("board_template_fields"));
    expect(orMock).toHaveBeenCalledWith(expect.stringContaining("workspace_id.eq.workspace-1"));
    expect(summaries).toEqual([
      {
        id: "template-1",
        name: "Product planning",
        description: "Plan launches across teams",
        type: "hybrid",
        visibility: "public",
        previewUrl: null,
        tags: ["planning", "product"],
        viewCount: 1,
        fieldCount: 1,
        automationCount: 1,
        itemCount: 2,
        supportsItems: true,
        supportsAutomations: true,
      },
    ]);
  });

  it("instantiates a board template with selected items", async () => {
    const templateRow = createTemplateRow();

    const templateSelectBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: templateRow, error: null }),
    };

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
          expression_type: "hybrid",
          expression: {},
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
      board_templates: [templateSelectBuilder],
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

    mockRpc.mockImplementation((fn: string) => {
      if (fn === "seed_board_template_items" || fn === "seed_board_template_automations") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockRequireUserId.mockResolvedValue("user-1");

    const result = await instantiateBoardTemplate({
      templateId: "template-1",
      workspaceId: "workspace-1",
      name: "Launch prep",
      includeItems: true,
      includeAutomations: false,
      itemIds: ["item-2"],
    });

    expect(boardInsertBuilder.insert).toHaveBeenCalledWith({
      workspace_id: "workspace-1",
      name: "Launch prep",
      description: "Plan launches across teams",
      type: "hybrid",
      created_by: "user-1",
    });
    expect(scopeInsertBuilder.insert).toHaveBeenCalled();
    expect(viewInsertBuilder.insert).toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith("seed_board_template_items", {
      template_id: "template-1",
      board_id: "board-1",
      item_ids: ["item-2"],
    });
    expect(mockRpc).not.toHaveBeenCalledWith("seed_board_template_automations", expect.anything());
    expect(result.id).toBe("board-1");
  });

  it("copies boards with items and automations when permitted", async () => {
    const sourceRow = createHydratedBoardRow();

    const boardFetchBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: sourceRow, error: null }),
    };

    const boardInsertBuilder: InsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "board-2" }, error: null }),
    };

    const scopeInsertBuilder: InsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "scope-2" }, error: null }),
    };

    const filterInsertBuilder: InsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: "filter-2",
          board_id: "board-2",
          expression_type: "hybrid",
          expression: {},
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
        .mockResolvedValue({ data: { ...sourceRow, id: "board-2" }, error: null }),
      single: jest.fn(),
    };

    const callMap: Record<string, unknown[]> = {
      boards: [boardFetchBuilder, boardInsertBuilder, boardSelectBuilder],
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

    mockRpc.mockImplementation((fn: string, payload: unknown) => {
      if (fn === "copy_board_items" || fn === "copy_board_automations") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockRequireUserId.mockResolvedValue("user-1");

    const result = await copyBoard({
      sourceBoardId: "board-1",
      workspaceId: "workspace-1",
      name: "Board copy",
      includeItems: true,
      itemIds: ["task-1"],
      includeAutomations: true,
      automationRecipeSlugs: ["notify-on-move"],
      permissions: { canCopyItems: true, canCopyAutomations: true },
    });

    expect(mockRpc).toHaveBeenCalledWith("copy_board_items", {
      source_board_id: "board-1",
      target_board_id: "board-2",
      item_ids: ["task-1"],
    });
    expect(mockRpc).toHaveBeenCalledWith("copy_board_automations", {
      source_board_id: "board-1",
      target_board_id: "board-2",
      recipe_slugs: ["notify-on-move"],
    });
    expect(result.id).toBe("board-2");
  });

  it("enforces permissions when copying board items", async () => {
    const boardFetchBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: createHydratedBoardRow(), error: null }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "boards") {
        return boardFetchBuilder;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mockRequireUserId.mockResolvedValue("user-1");

    await expect(
      copyBoard({
        sourceBoardId: "board-1",
        workspaceId: "workspace-1",
        name: "Board copy",
        includeItems: true,
        permissions: { canCopyItems: false },
      })
    ).rejects.toThrow("You do not have permission to copy board items.");

    expect(mockRpc).not.toHaveBeenCalled();
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
