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
  type BoardViewConfiguration,
  type BoardViewMode,
  type BoardViewSortRule,
  type BoardViewTimelineSettings,
  type BoardViewRow,
  type BoardDefaultSettings,
  type PartialBoardDefaultSettings,
  type CreateBoardInput,
  type CreateBoardScopeInput,
  type CreateBoardViewInput,
  type CreateFilterExpressionInput,
  type ExecuteBoardViewOptions,
  type HydratedBoard,
  type BoardViewResult,
  type ViewColumnPreferences,
  type BoardColorRule,
  type BoardSwimlaneDefinition,
  type BoardViewGroupingConfiguration,
  type BoardTemplate,
  type BoardTemplateSummary,
  type BoardTemplateView,
  type BoardTemplateAutomation,
  type BoardTemplateItem,
  type BoardTemplateField,
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

const BOARD_TEMPLATE_SELECT = `
  *,
  fields:board_template_fields(*),
  views:board_template_views(*, color_rules:board_template_view_color_rules(*)),
  automations:board_template_automations(*),
  items:board_template_items(*)
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

type BoardTemplateRow = Database["public"]["Tables"]["board_templates"]["Row"];
type BoardTemplateFieldRow = Database["public"]["Tables"]["board_template_fields"]["Row"];
type BoardTemplateViewRow = Database["public"]["Tables"]["board_template_views"]["Row"];
type BoardTemplateColorRuleRow = Database["public"]["Tables"]["board_template_view_color_rules"]["Row"];
type BoardTemplateAutomationRow = Database["public"]["Tables"]["board_template_automations"]["Row"];
type BoardTemplateItemRow = Database["public"]["Tables"]["board_template_items"]["Row"];

type BoardTemplateRowWithRelations = BoardTemplateRow & {
  fields?: BoardTemplateFieldRow[] | null;
  views?: (BoardTemplateViewRow & {
    color_rules?: BoardTemplateColorRuleRow[] | null;
  })[] | null;
  automations?: BoardTemplateAutomationRow[] | null;
  items?: BoardTemplateItemRow[] | null;
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

const sortByPosition = <T extends { position: number }>(a: T, b: T) =>
  (a.position ?? 0) - (b.position ?? 0);

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

const DEFAULT_STATUS_COLOR_RULE_SEEDS: Array<{
  id: string;
  label: string;
  value: string;
  color: string;
  description?: string;
}> = [
  { id: "planned", label: "Planned", value: "Planned", color: "#94a3b8" },
  { id: "in-progress", label: "In progress", value: "In progress", color: "#3b82f6" },
  { id: "blocked", label: "Blocked", value: "Blocked", color: "#ef4444" },
  { id: "review", label: "In review", value: "In review", color: "#f97316" },
  { id: "done", label: "Done", value: "Done", color: "#16a34a" },
];

const DEFAULT_CARD_FIELD_PRESETS: BoardDefaultSettings["cardFieldPresets"] = [
  { field: "status", visible: true },
  { field: "assignee", visible: true },
  { field: "dueDate", visible: true },
  { field: "priority", visible: true },
  { field: "tags", visible: false },
];

const DEFAULT_BOARD_DEFAULTS: BoardDefaultSettings = {
  defaultViewMode: "table",
  availableViewModes: ["table", "kanban", "timeline", "calendar"],
  colorField: "status",
  colorMode: "status",
  wipEnabled: false,
  backlogRanking: "manual",
  showWeekendShading: true,
  workingTime: { timezone: "UTC", startHour: 9, endHour: 17 },
  cardFieldPresets: DEFAULT_CARD_FIELD_PRESETS,
};

type ResolvedScopeInput = CreateBoardScopeInput & {
  defaults: BoardDefaultSettings;
  metadata: JsonRecord;
};

const cloneDefaults = (defaults: BoardDefaultSettings = DEFAULT_BOARD_DEFAULTS): BoardDefaultSettings => ({
  defaultViewMode: defaults.defaultViewMode,
  availableViewModes: [...defaults.availableViewModes],
  colorField: defaults.colorField,
  colorMode: defaults.colorMode,
  wipEnabled: defaults.wipEnabled,
  backlogRanking: defaults.backlogRanking,
  showWeekendShading: defaults.showWeekendShading,
  workingTime: { ...defaults.workingTime },
  cardFieldPresets: defaults.cardFieldPresets.map((preset) => ({ ...preset })),
});

const clampHour = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(23, Math.max(0, Math.round(value)));
};

const parseHour = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampHour(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numeric)) {
      return clampHour(numeric);
    }

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const prefix = trimmed.slice(0, colonIndex);
      const parsed = Number.parseInt(prefix, 10);
      if (Number.isFinite(parsed)) {
        return clampHour(parsed);
      }
    }
  }
  return null;
};

const normalizeViewModes = (value: unknown): BoardViewMode[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const filtered = value
    .map((entry) => (isViewMode(entry) ? entry : null))
    .filter((entry): entry is BoardViewMode => Boolean(entry));

  if (filtered.length === 0) {
    return undefined;
  }

  return Array.from(new Set(filtered));
};

const normalizeCardFieldPresets = (
  value: unknown
): BoardDefaultSettings["cardFieldPresets"] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed = value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const field =
        typeof entry.field === "string" && entry.field.trim().length > 0
          ? entry.field.trim()
          : null;

      if (!field) {
        return null;
      }

      const visible = entry.visible === false ? false : true;
      return { field, visible };
    })
    .filter((preset): preset is BoardDefaultSettings["cardFieldPresets"][number] => Boolean(preset));

  if (parsed.length === 0) {
    return undefined;
  }

  return parsed;
};

const normalizeWorkingTime = (
  value: unknown
): Partial<BoardDefaultSettings["workingTime"]> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const working: Partial<BoardDefaultSettings["workingTime"]> = {};

  if (typeof value.timezone === "string" && value.timezone.trim().length > 0) {
    working.timezone = value.timezone.trim();
  }

  const start = parseHour((value as JsonRecord).startHour ?? (value as JsonRecord).start);
  if (start != null) {
    working.startHour = start;
  }

  const end = parseHour((value as JsonRecord).endHour ?? (value as JsonRecord).end);
  if (end != null) {
    working.endHour = end;
  }

  return Object.keys(working).length > 0 ? working : undefined;
};

const applyDefaultOverrides = (
  target: BoardDefaultSettings,
  overrides?: PartialBoardDefaultSettings
) => {
  if (!overrides) {
    return;
  }

  if (overrides.availableViewModes) {
    const modes = overrides.availableViewModes
      .map((mode) => (isViewMode(mode) ? mode : null))
      .filter((mode): mode is BoardViewMode => Boolean(mode));
    if (modes.length > 0) {
      target.availableViewModes = Array.from(new Set(modes));
    }
  }

  if (isViewMode(overrides.defaultViewMode)) {
    target.defaultViewMode = overrides.defaultViewMode;
  }

  if (!target.availableViewModes.includes(target.defaultViewMode)) {
    target.availableViewModes = [target.defaultViewMode, ...target.availableViewModes];
  }

  if (typeof overrides.colorField === "string" && overrides.colorField.trim().length > 0) {
    target.colorField = overrides.colorField.trim();
  }

  if (
    overrides.colorMode === "status" ||
    overrides.colorMode === "priority" ||
    overrides.colorMode === "custom"
  ) {
    target.colorMode = overrides.colorMode;
  }

  if (typeof overrides.wipEnabled === "boolean") {
    target.wipEnabled = overrides.wipEnabled;
  }

  if (overrides.backlogRanking === "automatic" || overrides.backlogRanking === "manual") {
    target.backlogRanking = overrides.backlogRanking;
  }

  if (typeof overrides.showWeekendShading === "boolean") {
    target.showWeekendShading = overrides.showWeekendShading;
  }

  if (overrides.workingTime) {
    const working = overrides.workingTime;
    target.workingTime = {
      timezone:
        typeof working.timezone === "string" && working.timezone.trim().length > 0
          ? working.timezone.trim()
          : target.workingTime.timezone,
      startHour:
        typeof working.startHour === "number"
          ? clampHour(working.startHour)
          : target.workingTime.startHour,
      endHour:
        typeof working.endHour === "number"
          ? clampHour(working.endHour)
          : target.workingTime.endHour,
    };
  }

  if (overrides.cardFieldPresets) {
    const presets = overrides.cardFieldPresets
      .map((preset) => {
        if (!preset) {
          return null;
        }

        const field =
          typeof preset.field === "string" && preset.field.trim().length > 0
            ? preset.field.trim()
            : null;

        if (!field) {
          return null;
        }

        return { field, visible: preset.visible !== false };
      })
      .filter((preset): preset is BoardDefaultSettings["cardFieldPresets"][number] => Boolean(preset));

    if (presets.length > 0) {
      target.cardFieldPresets = presets;
    }
  }

  if (target.availableViewModes.length === 0) {
    target.availableViewModes = [...DEFAULT_BOARD_DEFAULTS.availableViewModes];
  } else {
    target.availableViewModes = Array.from(new Set(target.availableViewModes));
  }
};

const parseBoardDefaults = (value: unknown): BoardDefaultSettings => {
  const defaults = cloneDefaults();

  if (!isRecord(value)) {
    return defaults;
  }

  const overrides: PartialBoardDefaultSettings = {};

  if (isViewMode(value.defaultViewMode)) {
    overrides.defaultViewMode = value.defaultViewMode;
  }

  const modes = normalizeViewModes(value.availableViewModes);
  if (modes) {
    overrides.availableViewModes = modes;
  }

  if (typeof value.colorField === "string" && value.colorField.trim().length > 0) {
    overrides.colorField = value.colorField.trim();
  }

  if (
    value.colorMode === "status" ||
    value.colorMode === "priority" ||
    value.colorMode === "custom"
  ) {
    overrides.colorMode = value.colorMode;
  }

  if (typeof value.wipEnabled === "boolean") {
    overrides.wipEnabled = value.wipEnabled;
  }

  if (value.backlogRanking === "automatic" || value.backlogRanking === "manual") {
    overrides.backlogRanking = value.backlogRanking;
  }

  if (typeof value.showWeekendShading === "boolean") {
    overrides.showWeekendShading = value.showWeekendShading;
  }

  const working = normalizeWorkingTime(value.workingTime);
  if (working) {
    overrides.workingTime = working;
  }

  const cardPresets = normalizeCardFieldPresets(value.cardFieldPresets);
  if (cardPresets) {
    overrides.cardFieldPresets = cardPresets;
  }

  applyDefaultOverrides(defaults, overrides);
  return defaults;
};

const mergeBoardDefaults = (
  base: BoardDefaultSettings,
  overrides?: PartialBoardDefaultSettings | null
): BoardDefaultSettings => {
  const merged = cloneDefaults(base);
  if (overrides) {
    applyDefaultOverrides(merged, overrides);
  }
  return merged;
};

const buildColorRulesForDefaults = (
  defaults: BoardDefaultSettings
): BoardColorRule[] => {
  if (defaults.colorMode !== "status") {
    return [];
  }

  return DEFAULT_STATUS_COLOR_RULE_SEEDS.map((seed) => ({
    id: `${defaults.colorField}-${seed.id}`,
    label: seed.label,
    type: "status" as const,
    color: seed.color,
    field: defaults.colorField,
    value: seed.value,
    description: seed.description,
  }));
};

const resolveScopeDefaults = (scope: CreateBoardScopeInput): ResolvedScopeInput => {
  const metadata = normalizeMetadata(scope.metadata);
  const existingDefaults = parseBoardDefaults((metadata as JsonRecord).defaults);
  const defaults = mergeBoardDefaults(existingDefaults, scope.defaults);

  return {
    ...scope,
    metadata: { ...metadata, defaults },
    defaults,
  } as ResolvedScopeInput;
};

const VIEW_NAME_MAP: Record<BoardViewMode, string> = {
  table: "Table",
  kanban: "Kanban",
  timeline: "Timeline",
  calendar: "Calendar",
  master: "Master",
};

const VIEW_SLUG_MAP: Partial<Record<BoardViewMode, string>> = {
  table: "table",
  kanban: "kanban",
  timeline: "timeline",
  calendar: "calendar",
  master: "master",
};

const buildDefaultViewConfiguration = (
  mode: BoardViewMode,
  defaults: BoardDefaultSettings
): BoardViewConfiguration => {
  const columnPreferences = {
    order: defaults.cardFieldPresets
      .filter((preset) => preset.visible)
      .map((preset) => preset.field),
    hidden: defaults.cardFieldPresets
      .filter((preset) => !preset.visible)
      .map((preset) => preset.field),
  };

  const configuration: BoardViewConfiguration = {
    mode,
    filters: {},
    grouping: { primary: null, swimlaneField: null, swimlanes: [] },
    sort: [],
    columnPreferences,
    timeline: null,
    colorRules: buildColorRulesForDefaults(defaults),
  };

  if (mode === "kanban" && defaults.backlogRanking === "manual") {
    configuration.sort = [
      {
        id: "manual-backlog",
        field: "backlog_rank",
        direction: "asc",
        priority: 0,
        manual: true,
        label: "Manual (backlog rank)",
      },
    ];
  }

  if (mode === "timeline") {
    configuration.timeline = {
      startField: "startDate",
      endField: "dueDate",
      dependencyField: undefined,
      showWeekends: defaults.showWeekendShading,
      workingHours: { ...defaults.workingTime },
    };
  }

  return configuration;
};

const createDefaultViewsForScope = (
  scope: ResolvedScopeInput
): CreateBoardViewInput[] => {
  const defaults = scope.defaults;
  const sequence = defaults.availableViewModes.length
    ? defaults.availableViewModes
    : DEFAULT_BOARD_DEFAULTS.availableViewModes;

  const uniqueModes = Array.from(new Set(sequence));
  if (!uniqueModes.includes(defaults.defaultViewMode)) {
    uniqueModes.unshift(defaults.defaultViewMode);
  }

  return uniqueModes.map((mode, index) => {
    const name = VIEW_NAME_MAP[mode] ?? "Saved view";
    const slug = VIEW_SLUG_MAP[mode] ?? slugify(name);

    return {
      name,
      slug,
      isDefault: mode === defaults.defaultViewMode || index === 0,
      order: index,
      configuration: buildDefaultViewConfiguration(mode, defaults) as Record<string, unknown>,
      filter: deriveFilterFromScope(scope),
    } satisfies CreateBoardViewInput;
  });
};

export interface InstantiateBoardTemplateOptions {
  templateId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  includeItems?: boolean;
  includeAutomations?: boolean;
  itemIds?: string[];
  automationRecipeSlugs?: string[];
}

export interface CopyBoardOptions {
  sourceBoardId: string;
  workspaceId: string;
  name?: string;
  description?: string | null;
  includeItems?: boolean;
  itemIds?: string[];
  includeAutomations?: boolean;
  automationRecipeSlugs?: string[];
  permissions?: {
    canCopyItems?: boolean;
    canCopyAutomations?: boolean;
  };
}

function normalizeMetadata(value: unknown): JsonRecord {
  return toRecord(value);
}

function normalizeFilters(value: unknown): JsonRecord {
  return toRecord(value);
}

const isViewMode = (value: unknown): value is BoardViewMode =>
  value === "table" ||
  value === "kanban" ||
  value === "timeline" ||
  value === "calendar" ||
  value === "master";

const parseColumnPreferences = (
  configuration: JsonRecord
): ViewColumnPreferences => {
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
};

const parseSortRule = (value: unknown, index: number): BoardViewSortRule | null => {
  if (!isRecord(value)) {
    return null;
  }

  const field = typeof value.field === "string" ? value.field : null;
  const direction =
    value.direction === "asc" || value.direction === "desc" ? value.direction : "asc";

  if (!field) {
    return null;
  }

  const priority =
    typeof value.priority === "number" && Number.isFinite(value.priority)
      ? value.priority
      : index;
  const manual = value.manual === true;
  const id = typeof value.id === "string" && value.id.trim().length > 0
    ? value.id
    : `${field}-${priority}`;
  const label = typeof value.label === "string" && value.label.trim().length > 0
    ? value.label
    : undefined;

  return { id, field, direction, priority, manual, label };
};

const parseSortRules = (value: unknown): BoardViewSortRule[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry, index) => parseSortRule(entry, index))
      .filter((rule): rule is BoardViewSortRule => Boolean(rule))
      .sort((a, b) => a.priority - b.priority);
  }

  const legacy = parseSortRule(value, 0);
  return legacy ? [legacy] : [];
};

const parseSwimlaneDefinition = (
  value: unknown,
  index: number,
  fallbackField: string | null
): BoardSwimlaneDefinition | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" && value.id.trim().length > 0
    ? value.id
    : `swimlane-${index}`;
  const label = typeof value.label === "string" && value.label.trim().length > 0
    ? value.label
    : `Swimlane ${index + 1}`;
  const color = typeof value.color === "string" && value.color.trim().length > 0
    ? value.color
    : undefined;
  const description =
    typeof value.description === "string" && value.description.trim().length > 0
      ? value.description
      : undefined;
  const order =
    typeof value.order === "number" && Number.isFinite(value.order)
      ? value.order
      : index;
  const isDefault = value.isDefault === true;
  const field =
    typeof value.field === "string" && value.field.trim().length > 0
      ? value.field
      : fallbackField ?? null;
  const laneValue = value.value ?? null;
  const valueKey = typeof value.valueKey === "string" ? value.valueKey : JSON.stringify(laneValue);

  return {
    id,
    label,
    color,
    description,
    order,
    isDefault,
    field: field ?? undefined,
    value: laneValue,
    valueKey: typeof valueKey === "string" ? valueKey : undefined,
  };
};

const parseGroupingConfiguration = (
  value: unknown
): BoardViewGroupingConfiguration => {
  if (typeof value === "string" || value == null) {
    return {
      primary: typeof value === "string" ? value : null,
      swimlaneField: null,
      swimlanes: [],
    };
  }

  if (!isRecord(value)) {
    return { primary: null, swimlaneField: null, swimlanes: [] };
  }

  const primary = typeof value.primary === "string" ? value.primary : null;
  const swimlaneField =
    typeof value.swimlaneField === "string" ? value.swimlaneField : null;

  const swimlanes = Array.isArray(value.swimlanes)
    ? value.swimlanes
        .map((entry, index) =>
          parseSwimlaneDefinition(entry, index, swimlaneField)
        )
        .filter((lane): lane is NonNullable<typeof lane> => Boolean(lane))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  return {
    primary,
    swimlaneField,
    swimlanes,
  };
};

const parseColorRules = (value: unknown): BoardColorRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => {
      if (!isRecord(entry)) {
        return null;
      }

      const id = typeof entry.id === "string" && entry.id.trim().length > 0
        ? entry.id
        : `rule-${index}`;
      const label = typeof entry.label === "string" && entry.label.trim().length > 0
        ? entry.label
        : `Rule ${index + 1}`;
      const type =
        entry.type === "priority" || entry.type === "formula" ? entry.type : "status";
      const color = typeof entry.color === "string" && entry.color.trim().length > 0
        ? entry.color
        : null;

      if (!color) {
        return null;
      }

      const field =
        typeof entry.field === "string" && entry.field.trim().length > 0
          ? entry.field
          : undefined;
      const description =
        typeof entry.description === "string" && entry.description.trim().length > 0
          ? entry.description
          : undefined;
      const expression =
        typeof entry.expression === "string" && entry.expression.trim().length > 0
          ? entry.expression
          : undefined;

      return {
        id,
        label,
        type,
        color,
        field,
        value: entry.value ?? undefined,
        description,
        expression,
      };
    })
    .filter((rule): rule is BoardColorRule => Boolean(rule));
};

const parseTimelineSettings = (
  value: unknown
): BoardViewTimelineSettings | null => {
  if (!isRecord(value)) {
    return null;
  }

  const startField = typeof value.startField === "string" ? value.startField : null;
  const endField = typeof value.endField === "string" ? value.endField : null;

  if (!startField || !endField) {
    return null;
  }

  const dependencyField =
    typeof value.dependencyField === "string" ? value.dependencyField : undefined;
  const showWeekends =
    typeof value.showWeekends === "boolean" ? value.showWeekends : undefined;
  const working = normalizeWorkingTime(value.workingHours);
  const workingHours = working
    ? {
        timezone: working.timezone ?? DEFAULT_BOARD_DEFAULTS.workingTime.timezone,
        startHour: clampHour(
          working.startHour ?? DEFAULT_BOARD_DEFAULTS.workingTime.startHour
        ),
        endHour: clampHour(working.endHour ?? DEFAULT_BOARD_DEFAULTS.workingTime.endHour),
      }
    : undefined;

  return { startField, endField, dependencyField, showWeekends, workingHours };
};

const parseViewConfiguration = (
  rawConfiguration: unknown
): BoardViewConfiguration => {
  const configuration = normalizeMetadata(rawConfiguration);
  const mode = isViewMode(configuration.mode) ? configuration.mode : "table";
  const filters = normalizeFilters(configuration.filters);
  const grouping = parseGroupingConfiguration(configuration.grouping);
  const sort = parseSortRules(configuration.sort);
  const columnPreferences = parseColumnPreferences(configuration);
  const timeline = parseTimelineSettings(configuration.timeline);
  const colorRules = parseColorRules(configuration.colorRules);

  return {
    mode,
    filters,
    grouping,
    sort,
    columnPreferences,
    timeline,
    colorRules,
  };
};

function deriveFilterFromScope(scope: CreateBoardScopeInput): CreateFilterExpressionInput {
  switch (scope.type) {
    case "container":
      return {
        type: "container",
        containerId: scope.containerId,
        containerFilters: scope.containerFilters ?? {},
        metadata: { ...(scope.metadata ?? {}), defaults: scope.defaults },
        defaults: scope.defaults,
      };
    case "query":
      return {
        type: "query",
        query: scope.query,
        queryFilters: scope.queryFilters ?? {},
        metadata: { ...(scope.metadata ?? {}), defaults: scope.defaults },
        defaults: scope.defaults,
      };
    case "hybrid":
    default:
      return {
        type: "hybrid",
        containerId: scope.containerId,
        query: scope.query,
        containerFilters: scope.containerFilters ?? {},
        queryFilters: scope.queryFilters ?? {},
        metadata: { ...(scope.metadata ?? {}), defaults: scope.defaults },
        defaults: scope.defaults,
      };
  }
}

const normalizeColorRuleType = (value: unknown): BoardColorRule["type"] => {
  if (value === "priority" || value === "formula") {
    return value;
  }
  return "status";
};

function parseTemplateScopeDefinition(raw: unknown): CreateBoardScopeInput {
  const definition = normalizeMetadata(raw);
  const metadata = normalizeMetadata(definition.metadata);
  const defaults = parseBoardDefaults(metadata.defaults);
  const metadataWithDefaults = { ...metadata, defaults };
  const typeValue = ensureString(definition.type).toLowerCase();
  const containerFilters = normalizeFilters(
    definition.containerFilters ?? definition.container_filters ?? {}
  );
  const queryFilters = normalizeFilters(
    definition.queryFilters ?? definition.query_filters ?? {}
  );

  if (typeValue === "query") {
    const query = ensureString(definition.query ?? definition.query_definition);
    if (!query) {
      throw new Error("Board template scope is missing a query definition.");
    }
      return {
        type: "query",
        query,
        queryFilters,
        metadata: metadataWithDefaults,
        defaults,
      };
    }

    if (typeValue === "hybrid") {
      const containerId = ensureString(definition.containerId ?? definition.container_id);
    const query = ensureString(definition.query ?? definition.query_definition);
    if (!containerId || !query) {
      throw new Error(
        "Board template scope requires both container and query identifiers."
      );
    }
    return {
        type: "hybrid",
        containerId,
        query,
        containerFilters,
        queryFilters,
        metadata: metadataWithDefaults,
        defaults,
      };
    }

    const containerId = ensureString(definition.containerId ?? definition.container_id);
    if (!containerId) {
      throw new Error("Board template scope is missing a container identifier.");
    }

    return {
      type: "container",
      containerId,
      containerFilters,
      metadata: metadataWithDefaults,
      defaults,
    };
  }

function parseTemplateFilterDefinition(
  raw: unknown
): CreateFilterExpressionInput | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const definition = normalizeMetadata(raw);
  const metadata = normalizeMetadata(definition.metadata);
  const refreshInterval =
    typeof definition.refreshIntervalSeconds === "number" &&
    Number.isFinite(definition.refreshIntervalSeconds)
      ? definition.refreshIntervalSeconds
      : undefined;

  const typeValue = ensureString(definition.type).toLowerCase();
  switch (typeValue) {
    case "container": {
      const containerId = ensureString(definition.containerId ?? definition.container_id);
      if (!containerId) {
        return null;
      }
      return {
        type: "container",
        containerId,
        containerFilters: normalizeFilters(
          definition.containerFilters ?? definition.container_filters ?? {}
        ),
        metadata,
        refreshIntervalSeconds: refreshInterval,
      };
    }
    case "query": {
      const query = ensureString(definition.query ?? definition.query_definition);
      if (!query) {
        return null;
      }
      return {
        type: "query",
        query,
        queryFilters: normalizeFilters(
          definition.queryFilters ?? definition.query_filters ?? {}
        ),
        metadata,
        refreshIntervalSeconds: refreshInterval,
      };
    }
    case "hybrid": {
      const containerId = ensureString(definition.containerId ?? definition.container_id);
      const query = ensureString(definition.query ?? definition.query_definition);
      if (!containerId || !query) {
        return null;
      }
      return {
        type: "hybrid",
        containerId,
        query,
        containerFilters: normalizeFilters(
          definition.containerFilters ?? definition.container_filters ?? {}
        ),
        queryFilters: normalizeFilters(
          definition.queryFilters ?? definition.query_filters ?? {}
        ),
        metadata,
        refreshIntervalSeconds: refreshInterval,
      };
    }
    default:
      return null;
  }
}

function mapTemplateField(row: BoardTemplateFieldRow): BoardTemplateField {
  return {
    id: row.id,
    templateId: row.template_id,
    key: row.field_key,
    label: row.label,
    type: row.field_type,
    configuration: normalizeMetadata(row.configuration),
    isRequired: row.is_required,
    isPrimary: row.is_primary,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateAutomation(row: BoardTemplateAutomationRow): BoardTemplateAutomation {
  return {
    id: row.id,
    templateId: row.template_id,
    recipeSlug: row.recipe_slug,
    name: row.name,
    description: row.description,
    triggerConfig: normalizeMetadata(row.trigger_config),
    actionConfig: normalizeMetadata(row.action_config),
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateItem(row: BoardTemplateItemRow): BoardTemplateItem {
  return {
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    data: normalizeMetadata(row.data),
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateColorRule(row: BoardTemplateColorRuleRow): BoardColorRule {
  return {
    id: row.id,
    label: row.label,
    type: normalizeColorRuleType(row.rule_type),
    color: row.color,
    field: row.field ?? undefined,
    value: row.value ?? undefined,
    description: row.description ?? undefined,
    expression: row.expression ?? undefined,
  };
}

function mapTemplateView(
  row: BoardTemplateViewRow & { color_rules?: BoardTemplateColorRuleRow[] | null }
): BoardTemplateView {
  const configuration = parseViewConfiguration(row.configuration);
  const colorRules = [...(row.color_rules ?? [])]
    .sort(sortByPosition)
    .map(mapTemplateColorRule);

  return {
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    isDefault: row.is_default,
    order: row.position,
    configuration: { ...configuration, colorRules },
    filter: parseTemplateFilterDefinition(row.filter_definition),
    colorRules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplate(row: BoardTemplateRowWithRelations): BoardTemplate {
  const scope = parseTemplateScopeDefinition(row.scope_definition);
  const fields = [...(row.fields ?? [])].sort(sortByPosition).map(mapTemplateField);
  const views = [...(row.views ?? [])].sort(sortByPosition).map(mapTemplateView);
  const automations = [...(row.automations ?? [])]
    .map(mapTemplateAutomation)
    .sort((a, b) => a.name.localeCompare(b.name));
  const items = [...(row.items ?? [])].sort(sortByPosition).map(mapTemplateItem);

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type,
    visibility: row.visibility,
    previewUrl: row.preview_asset_url,
    tags: Array.isArray(row.tags) ? row.tags : [],
    metadata: normalizeMetadata(row.metadata),
    scope,
    supportsItems: row.supports_items || items.length > 0,
    supportsAutomations: row.supports_automations || automations.length > 0,
    fields,
    views,
    automations,
    items,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateSummary(row: BoardTemplateRowWithRelations): BoardTemplateSummary {
  const views = row.views ?? [];
  const fields = row.fields ?? [];
  const automations = row.automations ?? [];
  const items = row.items ?? [];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    visibility: row.visibility,
    previewUrl: row.preview_asset_url,
    tags: Array.isArray(row.tags) ? row.tags : [],
    viewCount: views.length,
    fieldCount: fields.length,
    automationCount: automations.length,
    itemCount: items.length,
    supportsItems: row.supports_items || items.length > 0,
    supportsAutomations: row.supports_automations || automations.length > 0,
  };
}

function templateViewToCreateInput(
  view: BoardTemplateView,
  scope: CreateBoardScopeInput
): CreateBoardViewInput {
  const configuration: Record<string, unknown> = {
    ...view.configuration,
    filters: { ...view.configuration.filters },
    grouping: {
      ...view.configuration.grouping,
      swimlanes: [...view.configuration.grouping.swimlanes],
    },
    sort: [...view.configuration.sort],
    columnPreferences: {
      order: [...view.configuration.columnPreferences.order],
      hidden: [...view.configuration.columnPreferences.hidden],
    },
    timeline: view.configuration.timeline ?? null,
    colorRules: [...view.colorRules],
  };

  return {
    name: view.name,
    description: view.description,
    slug: view.slug,
    isDefault: view.isDefault,
    order: view.order,
    configuration,
    filter: view.filter ?? deriveFilterFromScope(scope),
  };
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
  const defaults = parseBoardDefaults(metadata.defaults);
  const metadataWithDefaults = { ...metadata, defaults };

  if (row.scope_type === "container") {
    return {
      id: row.id,
      boardId: row.board_id,
      type: "container",
      containerId: ensureString(row.container_id),
      containerFilters: normalizeFilters(filters.container ?? filters),
      metadata: metadataWithDefaults,
      defaults,
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
      metadata: metadataWithDefaults,
      defaults,
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
    metadata: metadataWithDefaults,
    defaults,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapView(
  row: BoardViewRow & { filter_expression?: BoardFilterExpressionRow | null }
): BoardViewDefinition {
  const configuration = parseViewConfiguration(row.configuration);
  const columnPreferences = configuration.columnPreferences;
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

function scopeToCreateInput(scope: BoardScope | null): CreateBoardScopeInput {
  if (!scope) {
    throw new Error("Source board is missing scope configuration.");
  }

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

function filterToCreateInput(
  filter: BoardFilterExpression | null,
  scope: CreateBoardScopeInput
): CreateFilterExpressionInput {
  if (!filter) {
    return deriveFilterFromScope(scope);
  }

  const metadata = filter.metadata ?? {};
  const refreshIntervalSeconds =
    typeof filter.refreshIntervalSeconds === "number"
      ? filter.refreshIntervalSeconds
      : undefined;

  switch (filter.type) {
    case "container":
      return {
        type: "container",
        containerId: filter.containerId,
        containerFilters: filter.containerFilters ?? {},
        metadata,
        refreshIntervalSeconds,
      };
    case "query":
      return {
        type: "query",
        query: filter.query,
        queryFilters: filter.queryFilters ?? {},
        metadata,
        refreshIntervalSeconds,
      };
    case "hybrid":
    default:
      return {
        type: "hybrid",
        containerId: filter.containerId,
        query: filter.query,
        containerFilters: filter.containerFilters ?? {},
        queryFilters: filter.queryFilters ?? {},
        metadata,
        refreshIntervalSeconds,
      };
  }
}

function viewToCreateInput(
  view: BoardViewDefinition,
  scope: CreateBoardScopeInput
): CreateBoardViewInput {
  const configuration: Record<string, unknown> = {
    ...view.configuration,
    filters: { ...view.configuration.filters },
    grouping: {
      ...view.configuration.grouping,
      swimlanes: [...view.configuration.grouping.swimlanes],
    },
    sort: [...view.configuration.sort],
    columnPreferences: {
      order: [...view.configuration.columnPreferences.order],
      hidden: [...view.configuration.columnPreferences.hidden],
    },
    timeline: view.configuration.timeline ?? null,
    colorRules: [...(view.configuration.colorRules ?? [])],
  };

  return {
    name: view.name,
    description: view.description,
    slug: view.slug,
    isDefault: view.isDefault,
    order: view.order,
    configuration,
    filter: filterToCreateInput(view.filterExpression ?? null, scope),
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

async function fetchBoardTemplateById(
  templateId: string
): Promise<BoardTemplate | null> {
  const { data, error } = await supabase
    .from("board_templates")
    .select(BOARD_TEMPLATE_SELECT)
    .eq("id", templateId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load the requested board template.");
  }

  if (!data) {
    return null;
  }

  return mapTemplate(data as BoardTemplateRowWithRelations);
}

export async function listBoardTemplates(
  workspaceId: string
): Promise<BoardTemplateSummary[]> {
  await requireUserId();
  const trimmedWorkspaceId = workspaceId?.trim();
  if (!trimmedWorkspaceId) {
    throw new Error("A workspace id is required to load board templates.");
  }

  const { data, error } = await supabase
    .from("board_templates")
    .select(
      `
        *,
        fields:board_template_fields(id, position),
        views:board_template_views(id, position),
        automations:board_template_automations(id),
        items:board_template_items(id)
      `
    )
    .or(`visibility.eq.public,workspace_id.eq.${trimmedWorkspaceId}`)
    .order("name", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load board templates.");
  }

  return (data ?? []).map((row) =>
    mapTemplateSummary(row as BoardTemplateRowWithRelations)
  );
}

export async function instantiateBoardTemplate(
  options: InstantiateBoardTemplateOptions
): Promise<HydratedBoard> {
  await requireUserId();

  const templateId = options.templateId?.trim();
  if (!templateId) {
    throw new Error("A template id is required to instantiate a board.");
  }

  const workspaceId = options.workspaceId?.trim();
  if (!workspaceId) {
    throw new Error("A workspace id is required to instantiate a board template.");
  }

  const template = await fetchBoardTemplateById(templateId);
  if (!template) {
    throw new Error("The selected board template could not be found.");
  }

  const name = options.name?.trim() || template.name.trim();
  if (!name) {
    throw new Error("A board name is required to instantiate a template.");
  }

  const description = options.description ?? template.description ?? undefined;
  const resolvedScope = resolveScopeDefaults(template.scope);

  const views = template.views.length
    ? template.views.map((view) => templateViewToCreateInput(view, resolvedScope))
    : createDefaultViewsForScope(resolvedScope);

  const createdBoard = await createBoard({
    workspaceId,
    name,
    description,
    scope: resolvedScope,
    views,
  });

  const availableItemIds = new Set(template.items.map((item) => item.id));
  const includeItems =
    template.supportsItems &&
    template.items.length > 0 &&
    (options.includeItems ?? template.supportsItems);
  const selectedItemIds = (options.itemIds ?? template.items.map((item) => item.id)).filter(
    (id): id is string => typeof id === "string" && availableItemIds.has(id)
  );

  if (includeItems && selectedItemIds.length > 0) {
    const { error } = await (supabase as any).rpc("seed_board_template_items", {
      template_id: template.id,
      board_id: createdBoard.id,
      item_ids: selectedItemIds.length > 0 ? selectedItemIds : null,
    });

    if (error) {
      throw mapSupabaseError(error, "Unable to seed template items for this board.");
    }
  }

  const availableAutomationSlugs = new Set(
    template.automations.map((automation) => automation.recipeSlug)
  );
  const includeAutomations =
    template.supportsAutomations &&
    template.automations.length > 0 &&
    (options.includeAutomations ?? template.supportsAutomations);
  const automationSlugs = (
    options.automationRecipeSlugs ??
    template.automations.map((automation) => automation.recipeSlug)
  ).filter((slug): slug is string => availableAutomationSlugs.has(slug));

  if (includeAutomations && automationSlugs.length > 0) {
    const { error } = await (supabase as any).rpc("seed_board_template_automations", {
      template_id: template.id,
      board_id: createdBoard.id,
      recipe_slugs: automationSlugs.length > 0 ? automationSlugs : null,
    });

    if (error) {
      throw mapSupabaseError(
        error,
        "Unable to seed template automations for this board."
      );
    }
  }

  return createdBoard;
}

function buildScopePayload(
  boardId: string,
  scope: ResolvedScopeInput
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

  const scope = resolveScopeDefaults(input.scope);
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

  const viewsToCreate = (input.views?.length ? input.views : null) ??
    createDefaultViewsForScope(scope);

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

export async function copyBoard(options: CopyBoardOptions): Promise<HydratedBoard> {
  await requireUserId();

  const sourceBoardId = options.sourceBoardId?.trim();
  if (!sourceBoardId) {
    throw new Error("A source board id is required to copy a board.");
  }

  const workspaceId = options.workspaceId?.trim();
  if (!workspaceId) {
    throw new Error("A workspace id is required to copy a board.");
  }

  const sourceBoard = await fetchBoardById(sourceBoardId);
  if (!sourceBoard) {
    throw new Error("Unable to locate the source board to copy.");
  }

  if (sourceBoard.workspaceId !== workspaceId) {
    throw new Error("You do not have access to copy this board.");
  }

  const scopeInput = scopeToCreateInput(sourceBoard.scope);
  const name = options.name?.trim() || `${sourceBoard.name} copy`;
  const description = options.description ?? sourceBoard.description ?? undefined;

  const permissions = options.permissions ?? {};
  const requestedItemIds = options.itemIds ?? [];
  const shouldCopyItems = Boolean(options.includeItems) || requestedItemIds.length > 0;
  if (shouldCopyItems && !permissions.canCopyItems) {
    throw new Error("You do not have permission to copy board items.");
  }

  const requestedAutomationSlugs = options.automationRecipeSlugs ?? [];
  const shouldCopyAutomations =
    Boolean(options.includeAutomations) || requestedAutomationSlugs.length > 0;
  if (shouldCopyAutomations && !permissions.canCopyAutomations) {
    throw new Error("You do not have permission to copy board automations.");
  }

  const views = sourceBoard.views.length
    ? sourceBoard.views.map((view) => viewToCreateInput(view, scopeInput))
    : [
        {
          name: "Default view",
          isDefault: true,
          configuration: {},
          filter: deriveFilterFromScope(scopeInput),
        },
      ];

  const createdBoard = await createBoard({
    workspaceId,
    name,
    description,
    scope: scopeInput,
    views,
  });

  if (shouldCopyItems) {
    const { error } = await (supabase as any).rpc("copy_board_items", {
      source_board_id: sourceBoardId,
      target_board_id: createdBoard.id,
      item_ids: requestedItemIds.length > 0 ? requestedItemIds : null,
    });

    if (error) {
      throw mapSupabaseError(error, "Unable to copy board items.");
    }
  }

  if (shouldCopyAutomations) {
    const { error } = await (supabase as any).rpc("copy_board_automations", {
      source_board_id: sourceBoardId,
      target_board_id: createdBoard.id,
      recipe_slugs: requestedAutomationSlugs.length > 0 ? requestedAutomationSlugs : null,
    });

    if (error) {
      throw mapSupabaseError(error, "Unable to copy board automations.");
    }
  }

  return createdBoard;
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
