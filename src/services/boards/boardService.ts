import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  type Board,
  type BoardFilterExpression,
  type BoardFilterExpressionRow,
  type BoardRealtimeEvent,
  type BoardScope,
  type BoardScopeRow,
  type BoardSubscription,
  type BoardType,
  type BoardViewDefinition,
  type BoardViewRow,
  type CreateBoardInput,
  type CreateBoardScopeInput,
  type CreateBoardViewInput,
  type CreateFilterExpressionInput,
  type ExecuteBoardViewOptions,
  type HydratedBoard,
  type BoardViewResult,
  type ViewColumnPreferences,
} from "@/types/boards";
import { mapSupabaseError, requireUserId } from "../utils";

const BOARD_SELECT = `
  id,
  workspace_id,
  name,
  description,
  type,
  created_by,
  created_at,
  updated_at,
  board_scopes(*),
  board_views(*, filter_expression:board_filter_expressions(*))
`;

type BoardRow = Database["public"]["Tables"]["boards"]["Row"];
type BoardInsert = Database["public"]["Tables"]["boards"]["Insert"];
type BoardScopeInsert = Database["public"]["Tables"]["board_scopes"]["Insert"];
type BoardViewInsert = Database["public"]["Tables"]["board_views"]["Insert"];
type BoardFilterExpressionInsert =
  Database["public"]["Tables"]["board_filter_expressions"]["Insert"];

type BoardRowWithRelations = BoardRow & {
  board_scopes?: BoardScopeRow[] | null;
  board_views?: (BoardViewRow & {
    filter_expression?: BoardFilterExpressionRow | null;
  })[] | null;
};

type ExecuteBoardViewResponse = {
  items?: unknown[];
  cursor?: string | null;
  has_more?: boolean;
  refreshed_at?: string;
  duration_ms?: number | null;
};

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toRecord = (value: unknown): JsonRecord => {
  if (isRecord(value)) {
    return { ...value };
  }
  return {};
};

const isString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const ensureString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

const slugify = (input: string) => {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `board-${Date.now()}`
  );
};

const DEFAULT_VIEW_LIMIT = 50;

function normalizeMetadata(value: unknown): JsonRecord {
  return toRecord(value);
}

function normalizeFilters(value: unknown): JsonRecord {
  return toRecord(value);
}

function parseColumnPreferences(configuration: JsonRecord): ViewColumnPreferences {
  const preferences = configuration.columnPreferences;

  const order = Array.isArray((preferences as JsonRecord | undefined)?.order)
    ? ((preferences as JsonRecord).order as unknown[]).filter(isString) as string[]
    : [];

  const hidden = Array.isArray((preferences as JsonRecord | undefined)?.hidden)
    ? ((preferences as JsonRecord).hidden as unknown[]).filter(isString) as string[]
    : [];

  return {
    order,
    hidden,
  };
}

function deriveFilterFromScope(scope: CreateBoardScopeInput): CreateFilterExpressionInput {
  switch (scope.type) {
    case "container":
      return {
        type: "container",
        containerId: scope.containerId,
        containerFilters: scope.containerFilters ?? {},
        metadata: scope.metadata ?? {},
      };
    case "query":
      return {
        type: "query",
        query: scope.query,
        queryFilters: scope.queryFilters ?? {},
        metadata: scope.metadata ?? {},
      };
    case "hybrid":
    default:
      return {
        type: "hybrid",
        containerId: scope.containerId,
        query: scope.query,
        containerFilters: scope.containerFilters ?? {},
        queryFilters: scope.queryFilters ?? {},
        metadata: scope.metadata ?? {},
      };
  }
}

function mapContainerExpression(row: BoardFilterExpressionRow, payload: JsonRecord) {
  const containerId = ensureString(
    payload.containerId ?? payload.container_id ?? payload.container
  ).trim();
  return {
    id: row.id,
    boardId: row.board_id,
    type: (row.expression_type === "hybrid" ? "hybrid" : "container") as Extract<
      BoardType,
      "container" | "hybrid"
    >,
    containerId: containerId || "unknown-container",
    containerFilters: normalizeFilters(
      payload.containerFilters ?? payload.filters ?? payload.container
    ),
    refreshIntervalSeconds: row.refresh_interval_seconds ?? undefined,
    lastEvaluatedAt: row.last_evaluated_at ?? undefined,
    metadata: normalizeMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as const;
}

function mapQueryExpression(row: BoardFilterExpressionRow, payload: JsonRecord) {
  const queryText = ensureString(payload.query ?? payload.queryText ?? row.expression);
  return {
    id: row.id,
    boardId: row.board_id,
    type: (row.expression_type === "hybrid" ? "hybrid" : "query") as Extract<
      BoardType,
      "query" | "hybrid"
    >,
    query: queryText,
    queryFilters: normalizeFilters(
      payload.queryFilters ?? payload.variables ?? payload.query
    ),
    refreshIntervalSeconds: row.refresh_interval_seconds ?? undefined,
    lastEvaluatedAt: row.last_evaluated_at ?? undefined,
    metadata: normalizeMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as const;
}

function mapFilterExpression(row: BoardFilterExpressionRow): BoardFilterExpression {
  const payload = toRecord(row.expression);

  if (row.expression_type === "container") {
    return { ...mapContainerExpression(row, payload), type: "container" };
  }

  if (row.expression_type === "query") {
    return { ...mapQueryExpression(row, payload), type: "query" };
  }

  const containerPart = mapContainerExpression(row, payload);
  const queryPart = mapQueryExpression(row, payload);

  return {
    ...containerPart,
    ...queryPart,
    type: "hybrid",
  };
}

function mapScope(row: BoardScopeRow): BoardScope {
  const filters = toRecord(row.filters);
  const metadata = normalizeMetadata(row.metadata);

  if (row.scope_type === "container") {
    return {
      id: row.id,
      boardId: row.board_id,
      type: "container",
      containerId: ensureString(row.container_id),
      containerFilters: normalizeFilters(filters.container ?? filters),
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  if (row.scope_type === "query") {
    return {
      id: row.id,
      boardId: row.board_id,
      type: "query",
      query: ensureString(row.query_definition),
      queryFilters: normalizeFilters(filters.query ?? filters),
      metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  return {
    id: row.id,
    boardId: row.board_id,
    type: "hybrid",
    containerId: ensureString(row.container_id),
    query: ensureString(row.query_definition),
    containerFilters: normalizeFilters(filters.container ?? {}),
    queryFilters: normalizeFilters(filters.query ?? {}),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapView(
  row: BoardViewRow & { filter_expression?: BoardFilterExpressionRow | null }
): BoardViewDefinition {
  const configuration = normalizeMetadata(row.configuration);
  const columnPreferences = parseColumnPreferences(configuration);
  configuration.columnPreferences = columnPreferences;
  const filterExpression = row.filter_expression
    ? mapFilterExpression(row.filter_expression)
    : null;

  return {
    id: row.id,
    boardId: row.board_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    isDefault: row.is_default,
    order: row.position,
    configuration,
    columnPreferences,
    filterExpression,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBoard(row: BoardRowWithRelations): HydratedBoard {
  const board: Board = {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const scopes = (row.board_scopes ?? []).map(mapScope);
  const views = (row.board_views ?? []).map(mapView).sort((a, b) => a.order - b.order);

  return {
    ...board,
    scope: scopes[0] ?? null,
    views,
  };
}

async function fetchBoardById(boardId: string): Promise<HydratedBoard | null> {
  const { data, error } = await supabase
    .from("boards")
    .select(BOARD_SELECT)
    .eq("id", boardId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load the requested board.");
  }

  if (!data) {
    return null;
  }

  return mapBoard(data as BoardRowWithRelations);
}

function buildScopePayload(
  boardId: string,
  scope: CreateBoardScopeInput
): BoardScopeInsert {
  const base: BoardScopeInsert = {
    board_id: boardId,
    scope_type: scope.type,
    filters: {},
    metadata: scope.metadata ?? {},
  };

  if (scope.type === "container") {
    return {
      ...base,
      container_id: scope.containerId,
      query_definition: null,
      filters: { container: scope.containerFilters ?? {} } as BoardScopeInsert["filters"],
    };
  }

  if (scope.type === "query") {
    return {
      ...base,
      container_id: null,
      query_definition: scope.query,
      filters: { query: scope.queryFilters ?? {} } as BoardScopeInsert["filters"],
    };
  }

  return {
    ...base,
    container_id: scope.containerId,
    query_definition: scope.query,
    filters: {
      container: scope.containerFilters ?? {},
      query: scope.queryFilters ?? {},
    } as BoardScopeInsert["filters"],
  };
}

function buildExpressionPayload(
  boardId: string,
  input: CreateFilterExpressionInput
): BoardFilterExpressionInsert {
  const base: BoardFilterExpressionInsert = {
    board_id: boardId,
    expression_type: input.type,
    expression: {},
    metadata: input.metadata ?? {},
    refresh_interval_seconds: input.refreshIntervalSeconds ?? null,
  };

  if (input.type === "container") {
    return {
      ...base,
      expression: {
        containerId: input.containerId,
        containerFilters: input.containerFilters ?? {},
      } as BoardFilterExpressionInsert["expression"],
    };
  }

  if (input.type === "query") {
    return {
      ...base,
      expression: {
        query: input.query,
        queryFilters: input.queryFilters ?? {},
      } as BoardFilterExpressionInsert["expression"],
    };
  }

  return {
    ...base,
    expression: {
      containerId: input.containerId,
      query: input.query,
      containerFilters: input.containerFilters ?? {},
      queryFilters: input.queryFilters ?? {},
    } as BoardFilterExpressionInsert["expression"],
  };
}

async function createFilterExpression(
  boardId: string,
  input: CreateFilterExpressionInput | null | undefined
): Promise<BoardFilterExpressionRow | null> {
  if (!input) {
    return null;
  }

  const payload = buildExpressionPayload(boardId, input);
  const { data, error } = await supabase
    .from("board_filter_expressions")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to save the board filter definition.");
  }

  return data as BoardFilterExpressionRow;
}

async function createBoardView(
  boardId: string,
  view: CreateBoardViewInput,
  index: number
): Promise<void> {
  const filterRow = await createFilterExpression(boardId, view.filter);
  const payload: BoardViewInsert = {
    board_id: boardId,
    name: view.name,
    slug: view.slug?.trim() || slugify(view.name),
    description: view.description ?? null,
    is_default: view.isDefault ?? index === 0,
    position: view.order ?? index,
    configuration: (view.configuration ?? {}) as BoardViewInsert["configuration"],
    filter_expression_id: filterRow?.id ?? null,
  };

  const { error } = await supabase.from("board_views").insert(payload);

  if (error) {
    throw mapSupabaseError(error, "Unable to create the board view.");
  }
}

export async function listBoardsForWorkspace(
  workspaceId: string
): Promise<HydratedBoard[]> {
  const trimmed = workspaceId?.trim();
  if (!trimmed) {
    throw new Error("A workspace id is required to load boards.");
  }

  const { data, error } = await supabase
    .from("boards")
    .select(BOARD_SELECT)
    .eq("workspace_id", trimmed)
    .order("name", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load boards for this workspace.");
  }

  const rows = (data ?? []) as BoardRowWithRelations[];
  return rows.map(mapBoard);
}

export async function createBoard(input: CreateBoardInput): Promise<HydratedBoard> {
  const userId = await requireUserId();
  const name = input.name?.trim();

  if (!name) {
    throw new Error("A board name is required.");
  }

  const workspaceId = input.workspaceId?.trim();
  if (!workspaceId) {
    throw new Error("A workspace id is required to create a board.");
  }

  const scope = input.scope;
  const boardPayload: BoardInsert = {
    workspace_id: workspaceId,
    name,
    description: input.description ?? null,
    type: scope.type,
    created_by: userId,
  };

  const { data: boardData, error: boardError } = await supabase
    .from("boards")
    .insert(boardPayload)
    .select("id")
    .single();

  if (boardError || !boardData) {
    throw mapSupabaseError(boardError, "Unable to create the board.");
  }

  const boardId = (boardData as BoardRow).id;

  const scopePayload = buildScopePayload(boardId, scope);
  const { error: scopeError } = await supabase
    .from("board_scopes")
    .insert(scopePayload)
    .single();

  if (scopeError) {
    throw mapSupabaseError(scopeError, "Unable to save the board scope.");
  }

  const viewsToCreate = (input.views?.length ? input.views : null) ?? [
    {
      name: "Default view",
      isDefault: true,
      configuration: {},
      filter: deriveFilterFromScope(scope),
    },
  ];

  for (const [index, view] of viewsToCreate.entries()) {
    const hydratedView: CreateBoardViewInput = {
      ...view,
      filter: view.filter ?? deriveFilterFromScope(scope),
    };
    await createBoardView(boardId, hydratedView, index);
  }

  const board = await fetchBoardById(boardId);
  if (!board) {
    throw new Error("Unable to load the board after creation.");
  }

  return board;
}

export async function updateBoardViewConfiguration(
  viewId: string,
  configuration: Record<string, unknown>,
  preferences?: ViewColumnPreferences
): Promise<void> {
  const trimmedId = viewId?.trim();
  if (!trimmedId) {
    throw new Error("A view id is required to update configuration.");
  }

  const columnPreferences = preferences ?? parseColumnPreferences(configuration);
  const payload = {
    configuration: {
      ...configuration,
      columnPreferences,
    } as BoardViewInsert["configuration"],
  };

  const { error } = await supabase
    .from("board_views")
    .update(payload)
    .eq("id", trimmedId);

  if (error) {
    throw mapSupabaseError(error, "Unable to update view configuration.");
  }
}

export async function executeBoardView(
  boardId: string,
  viewId: string,
  options: ExecuteBoardViewOptions = {}
): Promise<BoardViewResult> {
  const trimmedBoardId = boardId?.trim();
  const trimmedViewId = viewId?.trim();

  if (!trimmedBoardId || !trimmedViewId) {
    throw new Error("A board id and view id are required to execute the view.");
  }

  const payload = {
    board_id: trimmedBoardId,
    view_id: trimmedViewId,
    cursor: options.cursor ?? null,
    since: options.since ?? null,
    limit: options.limit ?? DEFAULT_VIEW_LIMIT,
  };

  const { data, error } = await (supabase as any).rpc(
    "execute_board_view",
    payload
  );

  if (error) {
    throw mapSupabaseError(error, "Unable to execute the board view.");
  }

  const response = (data ?? {}) as ExecuteBoardViewResponse;
  const items = Array.isArray(response.items)
    ? (response.items as JsonRecord[])
    : [];

  const refreshedAt =
    typeof response.refreshed_at === "string"
      ? response.refreshed_at
      : new Date().toISOString();

  return {
    items,
    cursor: typeof response.cursor === "string" ? response.cursor : null,
    hasMore: Boolean(response.has_more),
    refreshedAt,
    durationMs:
      typeof response.duration_ms === "number" ? response.duration_ms : null,
  };
}

export function subscribeToBoard(
  boardId: string,
  listener: (event: BoardRealtimeEvent) => void
): BoardSubscription {
  const channel = (supabase as any)
    .channel(`boards:${boardId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "boards", filter: `id=eq.${boardId}` },
      (payload: any) => {
        listener({
          table: "boards",
          eventType: payload.eventType,
          newRecord: payload.new ?? null,
          oldRecord: payload.old ?? null,
        });
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "board_views",
        filter: `board_id=eq.${boardId}`,
      },
      (payload: any) => {
        listener({
          table: "board_views",
          eventType: payload.eventType,
          newRecord: payload.new ?? null,
          oldRecord: payload.old ?? null,
        });
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "board_scopes",
        filter: `board_id=eq.${boardId}`,
      },
      (payload: any) => {
        listener({
          table: "board_scopes",
          eventType: payload.eventType,
          newRecord: payload.new ?? null,
          oldRecord: payload.old ?? null,
        });
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "board_filter_expressions",
        filter: `board_id=eq.${boardId}`,
      },
      (payload: any) => {
        listener({
          table: "board_filter_expressions",
          eventType: payload.eventType,
          newRecord: payload.new ?? null,
          oldRecord: payload.old ?? null,
        });
      }
    );

  channel.subscribe().catch(() => undefined);

  return {
    unsubscribe: () => {
      if (typeof channel.unsubscribe === "function") {
        channel.unsubscribe();
      }
      if (typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
    },
  };
}
