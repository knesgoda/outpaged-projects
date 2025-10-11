import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createBoard,
  executeBoardView,
  listBoardsForWorkspace,
  listBoardTemplates,
  instantiateBoardTemplate,
  subscribeToBoard,
  updateBoardViewConfiguration,
} from "@/services/boards/boardService";
import type {
  BoardType,
  HydratedBoard,
  BoardViewResult,
  BoardViewConfiguration,
  CreateBoardScopeInput,
  ViewColumnPreferences,
  BoardTemplateSummary,
  BoardViewMode,
  PartialBoardDefaultSettings,
} from "@/types/boards";
import { useWorkspaceContextOptional } from "@/state/workspace";
import { ViewColumnSchemaControls } from "@/components/boards/columns/ViewColumnSchemaControls";
import { BoardViewCanvas, type BoardViewRecord } from "@/features/boards/views";
import { cn } from "@/lib/utils";

const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  container: "Container",
  query: "Query",
  hybrid: "Hybrid",
};

const EMPTY_COLUMN_PREFERENCES: ViewColumnPreferences = {
  order: [],
  hidden: [],
};

const buildDefaultViewConfiguration = (): BoardViewConfiguration => ({
  mode: "table",
  filters: {},
  grouping: { primary: null, swimlaneField: null, swimlanes: [] },
  sort: [],
  columnPreferences: { order: [], hidden: [] },
  timeline: null,
  colorRules: [],
});

const VIEW_STORAGE_PREFIX = "boards:last-view:";

type JsonRecord = Record<string, unknown>;

type MergeMode = "append" | "prepend";

const DEFAULT_BOARD_NAME = "New board";
const DEFAULT_VIEW_NAME = "Default view";
const DEFAULT_ENABLED_VIEW_MODES: Record<BoardViewMode, boolean> = {
  table: true,
  kanban: true,
  timeline: true,
  calendar: true,
  master: false,
};
const DEFAULT_CARD_FIELD_PRESETS = [
  { field: "status", visible: true },
  { field: "assignee", visible: true },
  { field: "dueDate", visible: true },
  { field: "priority", visible: true },
  { field: "tags", visible: false },
];
const VIEW_MODE_LABELS: Record<BoardViewMode, string> = {
  table: "Table",
  kanban: "Kanban",
  timeline: "Timeline",
  calendar: "Calendar",
  master: "Master",
};
const STATUS_COLOR_RULE_SEEDS = [
  { id: "planned", label: "Planned", value: "Planned", color: "#94a3b8" },
  { id: "in-progress", label: "In progress", value: "In progress", color: "#3b82f6" },
  { id: "blocked", label: "Blocked", value: "Blocked", color: "#ef4444" },
  { id: "review", label: "In review", value: "In review", color: "#f97316" },
  { id: "done", label: "Done", value: "Done", color: "#16a34a" },
];

function useOptionalWorkspaceId(): string | null {
  const context = useWorkspaceContextOptional();
  return context?.currentWorkspace?.id ?? null;
}

function parseJsonInput(value: string, label: string): JsonRecord {
  if (!value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonRecord;
    }
    throw new Error();
  } catch (_error) {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function parseHourString(value: string, fallback: number): number {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  const [hourPart] = value.split(":");
  const parsed = Number.parseInt(hourPart ?? "", 10);
  if (Number.isFinite(parsed)) {
    return Math.min(23, Math.max(0, parsed));
  }
  return fallback;
}

const getItemKey = (item: JsonRecord, index: number) => {
  if (typeof item.id === "string" || typeof item.id === "number") {
    return String(item.id);
  }
  if (typeof item.uuid === "string") {
    return item.uuid;
  }
  if (typeof item.key === "string") {
    return item.key;
  }
  return `item-${index}`;
};

const dedupeItems = (items: JsonRecord[]) => {
  const seen = new Set<string>();
  const output: JsonRecord[] = [];

  items.forEach((item, index) => {
    const key = getItemKey(item, index);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  });

  return output;
};

const mergeViewItems = (
  current: JsonRecord[] = [],
  incoming: JsonRecord[] = [],
  mode: MergeMode
) => {
  if (mode === "prepend") {
    return dedupeItems([...incoming, ...current]);
  }

  return dedupeItems([...current, ...incoming]);
};

const loadPersistedViewId = (boardId: string) => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(`${VIEW_STORAGE_PREFIX}${boardId}`);
};

const persistViewId = (boardId: string, viewId: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`${VIEW_STORAGE_PREFIX}${boardId}`, viewId);
};

const clearPersistedViewId = (boardId: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(`${VIEW_STORAGE_PREFIX}${boardId}`);
};

export default function BoardsPage() {
  const workspaceId = useOptionalWorkspaceId();
  const { toast } = useToast();

  const [boards, setBoards] = useState<HydratedBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [viewResult, setViewResult] = useState<BoardViewResult | null>(null);
  const [pendingPreferences, setPendingPreferences] =
    useState<ViewColumnPreferences | null>(null);
  const [configurationDraft, setConfigurationDraft] =
    useState<BoardViewConfiguration | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const [isLoadingBoards, setIsLoadingBoards] = useState(false);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [isRefreshingView, setIsRefreshingView] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState(DEFAULT_BOARD_NAME);
  const [newBoardType, setNewBoardType] = useState<BoardType>("container");
  const [newContainerId, setNewContainerId] = useState("");
  const [newQueryDefinition, setNewQueryDefinition] = useState("status:open");
  const [newContainerFilters, setNewContainerFilters] = useState("{}");
  const [newQueryFilters, setNewQueryFilters] = useState("{}");
  const [newViewName, setNewViewName] = useState(DEFAULT_VIEW_NAME);
  const [templates, setTemplates] = useState<BoardTemplateSummary[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [includeTemplateItems, setIncludeTemplateItems] = useState(false);
  const [includeTemplateAutomations, setIncludeTemplateAutomations] = useState(false);
  const [defaultViewMode, setDefaultViewMode] = useState<BoardViewMode>("table");
  const [enabledViewModes, setEnabledViewModes] = useState<Record<BoardViewMode, boolean>>(
    () => ({ ...DEFAULT_ENABLED_VIEW_MODES })
  );
  const [colorField, setColorField] = useState("status");
  const [colorMode, setColorMode] = useState<"status" | "priority" | "custom">("status");
  const [wipEnabled, setWipEnabled] = useState(false);
  const [backlogRanking, setBacklogRanking] = useState<"manual" | "automatic">("manual");
  const [showWeekendShading, setShowWeekendShading] = useState(true);
  const [workingStart, setWorkingStart] = useState("09:00");
  const [workingEnd, setWorkingEnd] = useState("17:00");
  const [workingTimezone, setWorkingTimezone] = useState("UTC");
  const [cardFieldPresets, setCardFieldPresets] = useState(
    DEFAULT_CARD_FIELD_PRESETS.map((preset) => ({ ...preset }))
  );
  const viewModes: BoardViewMode[] = ["table", "kanban", "timeline", "calendar"];

  const resetBoardDefaults = useCallback(() => {
    setDefaultViewMode("table");
    setEnabledViewModes({ ...DEFAULT_ENABLED_VIEW_MODES });
    setColorField("status");
    setColorMode("status");
    setWipEnabled(false);
    setBacklogRanking("manual");
    setShowWeekendShading(true);
    setWorkingStart("09:00");
    setWorkingEnd("17:00");
    setWorkingTimezone("UTC");
    setCardFieldPresets(DEFAULT_CARD_FIELD_PRESETS.map((preset) => ({ ...preset })));
  }, []);

  const buildDefaultSettingsPayload = useCallback((): PartialBoardDefaultSettings => {
    const activeModes = (Object.entries(enabledViewModes) as Array<[BoardViewMode, boolean]>)
      .filter(([, enabled]) => enabled)
      .map(([mode]) => mode);

    const ensuredModes = activeModes.includes(defaultViewMode)
      ? activeModes
      : [defaultViewMode, ...activeModes];

    return {
      defaultViewMode,
      availableViewModes: ensuredModes,
      colorField: colorField.trim() || "status",
      colorMode,
      wipEnabled,
      backlogRanking,
      showWeekendShading,
      workingTime: {
        timezone: workingTimezone.trim() || "UTC",
        startHour: parseHourString(workingStart, 9),
        endHour: parseHourString(workingEnd, 17),
      },
      cardFieldPresets: cardFieldPresets.map((preset) => ({ ...preset })),
    } satisfies PartialBoardDefaultSettings;
  }, [
    backlogRanking,
    cardFieldPresets,
    colorField,
    colorMode,
    defaultViewMode,
    enabledViewModes,
    showWeekendShading,
    workingEnd,
    workingStart,
    workingTimezone,
    wipEnabled,
  ]);

  const handleViewModeToggle = useCallback(
    (mode: BoardViewMode, enabled: boolean) => {
      setEnabledViewModes((previous) => {
        const next = { ...previous, [mode]: enabled };
        const active = (Object.entries(next) as Array<[BoardViewMode, boolean]>)
          .filter(([, value]) => value)
          .map(([key]) => key);

        if (active.length === 0) {
          return previous;
        }

        if (!active.includes(defaultViewMode)) {
          setDefaultViewMode(active[0]);
        }

        return next;
      });
    },
    [defaultViewMode]
  );

  const handleDefaultViewModeChange = useCallback((value: BoardViewMode) => {
    setDefaultViewMode(value);
    setEnabledViewModes((previous) => ({ ...previous, [value]: true }));
  }, []);

  const handleCardPresetVisibilityChange = useCallback((field: string, visible: boolean) => {
    setCardFieldPresets((current) =>
      current.map((preset) =>
        preset.field === field ? { ...preset, visible } : preset
      )
    );
  }, []);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) {
      return null;
    }
    return templates.find((template) => template.id === selectedTemplateId) ?? null;
  }, [templates, selectedTemplateId]);

  const loadBoards = useCallback(async () => {
    if (!workspaceId) {
      setBoards([]);
      return;
    }

    setIsLoadingBoards(true);
    setBoardError(null);
    try {
      const data = await listBoardsForWorkspace(workspaceId);
      setBoards(data);
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingBoards(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (!isCreateOpen || !workspaceId) {
      return;
    }

    let cancelled = false;
    setIsLoadingTemplates(true);
    setTemplateError(null);

    listBoardTemplates(workspaceId)
      .then((data) => {
        if (!cancelled) {
          setTemplates(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setTemplateError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingTemplates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isCreateOpen, workspaceId]);

  useEffect(() => {
    if (!isCreateOpen) {
      setSelectedTemplateId(null);
      setIncludeTemplateItems(false);
      setIncludeTemplateAutomations(false);
    }
  }, [isCreateOpen]);

  useEffect(() => {
    if (!selectedTemplate) {
      setIncludeTemplateItems(false);
      setIncludeTemplateAutomations(false);
      return;
    }

    setIncludeTemplateItems(selectedTemplate.supportsItems);
    setIncludeTemplateAutomations(selectedTemplate.supportsAutomations);
    setNewBoardType(selectedTemplate.type);

    if (
      newBoardName === DEFAULT_BOARD_NAME ||
      newBoardName === selectedTemplate.name
    ) {
      setNewBoardName(selectedTemplate.name);
    }
  }, [selectedTemplate, newBoardName]);

  useEffect(() => {
    if (!selectedBoardId && boards.length > 0) {
      setSelectedBoardId(boards[0].id);
      return;
    }

    if (
      selectedBoardId &&
      boards.length > 0 &&
      !boards.some((board) => board.id === selectedBoardId)
    ) {
      const fallbackBoard = boards[0];
      setSelectedBoardId(fallbackBoard?.id ?? null);
    }
  }, [boards, selectedBoardId]);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? null,
    [boards, selectedBoardId]
  );

  const selectedView = useMemo(() => {
    if (!selectedBoard) {
      return null;
    }
    return (
      selectedBoard.views.find((view) => view.id === selectedViewId) ??
      selectedBoard.views.find((view) => view.isDefault) ??
      selectedBoard.views[0] ??
      null
    );
  }, [selectedBoard, selectedViewId]);

  const selectedBoardIdRef = selectedBoard?.id ?? null;

  useEffect(() => {
    if (selectedView) {
      setPendingPreferences(selectedView.columnPreferences);
      setConfigurationDraft(selectedView.configuration);
    } else {
      setPendingPreferences(null);
      setConfigurationDraft(null);
    }
  }, [selectedView]);

  const effectivePreferences = pendingPreferences ?? EMPTY_COLUMN_PREFERENCES;

  const availableColumns = useMemo(() => {
    const keys = new Set<string>();
    effectivePreferences.order.forEach((column) => keys.add(column));
    effectivePreferences.hidden.forEach((column) => keys.add(column));

    for (const item of viewResult?.items ?? []) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        Object.keys(item as Record<string, unknown>).forEach((key) =>
          keys.add(key)
        );
      }
    }

    return Array.from(keys);
  }, [effectivePreferences.hidden, effectivePreferences.order, viewResult]);

  useEffect(() => {
    if (!selectedBoard) {
      setSelectedViewId(null);
      setViewResult(null);
      return;
    }

    const { id, views } = selectedBoard;
    const persisted = loadPersistedViewId(id);
    const candidate =
      views.find((view) => view.id === persisted) ??
      views.find((view) => view.isDefault) ??
      views[0] ??
      null;

    setSelectedViewId(candidate?.id ?? null);
  }, [selectedBoard]);

  useEffect(() => {
    if (!selectedBoardIdRef || !selectedViewId) {
      return;
    }

    persistViewId(selectedBoardIdRef, selectedViewId);
  }, [selectedBoardIdRef, selectedViewId]);

  useEffect(() => {
    if (!selectedBoardIdRef || !selectedViewId) {
      return;
    }

    let cancelled = false;
    setIsLoadingView(true);
    setIsRefreshingView(false);
    setIsLoadingMore(false);
    setViewError(null);

    executeBoardView(selectedBoardIdRef, selectedViewId)
      .then((result) => {
        if (!cancelled) {
          setViewResult(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setViewError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingView(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBoardIdRef, selectedViewId]);

  useEffect(() => {
    if (!selectedBoardId) {
      return;
    }

    const subscription = subscribeToBoard(selectedBoardId, () => {
      void loadBoards();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedBoardId, loadBoards]);

  const handleRefresh = useCallback(async () => {
    if (!selectedBoardIdRef || !selectedViewId) {
      return;
    }

    setIsRefreshingView(true);
    setViewError(null);

    try {
      const result = await executeBoardView(selectedBoardIdRef, selectedViewId, {
        since: viewResult?.refreshedAt ?? null,
      });

      setViewResult((current) =>
        current
          ? {
              ...result,
              items: mergeViewItems(current.items, result.items, "prepend"),
              hasMore: result.hasMore,
              cursor: result.cursor,
            }
          : result
      );
    } catch (error) {
      setViewError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRefreshingView(false);
    }
  }, [selectedBoardIdRef, selectedViewId, viewResult?.refreshedAt]);

  const handleLoadMore = useCallback(async () => {
    if (!selectedBoardIdRef || !selectedViewId || !viewResult?.cursor) {
      return;
    }

    setIsLoadingMore(true);
    setViewError(null);

    try {
      const result = await executeBoardView(selectedBoardIdRef, selectedViewId, {
        cursor: viewResult.cursor,
        limit: viewResult.items.length || undefined,
      });

      setViewResult((current) =>
        current
          ? {
              ...result,
              items: mergeViewItems(current.items, result.items, "append"),
              hasMore: result.hasMore,
              cursor: result.cursor,
            }
          : result
      );
    } catch (error) {
      setViewError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedBoardIdRef, selectedViewId, viewResult]);

  const handleViewItemsChange = useCallback(
    (items: BoardViewRecord[]) => {
      setViewResult((current) => {
        if (!current) {
          return {
            items,
            cursor: null,
            hasMore: false,
            refreshedAt: new Date().toISOString(),
            durationMs: null,
          } satisfies BoardViewResult;
        }

        return {
          ...current,
          items,
        } satisfies BoardViewResult;
      });
    },
    []
  );

  const handleViewConfigurationChange = useCallback(
    async (next: BoardViewConfiguration) => {
      if (!selectedBoard || !selectedView) {
        return;
      }

      setConfigurationDraft(next);

      try {
        await updateBoardViewConfiguration(
          selectedView.id,
          next,
          next.columnPreferences
        );

        setBoards((previous) =>
          previous.map((board) => {
            if (board.id !== selectedBoard.id) {
              return board;
            }

            return {
              ...board,
              views: board.views.map((view) =>
                view.id === selectedView.id
                  ? {
                      ...view,
                      configuration: next,
                      columnPreferences: next.columnPreferences,
                    }
                  : view
              ),
            } satisfies HydratedBoard;
          })
        );
      } catch (error) {
        setConfigurationDraft(selectedView.configuration);
        toast({
          title: "Unable to update view",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    },
    [selectedBoard, selectedView, setBoards, toast]
  );

  const handlePreferencesChange = useCallback(
    (next: ViewColumnPreferences) => {
      setPendingPreferences(next);
    },
    []
  );

  const handlePreferencesReset = useCallback(() => {
    setPendingPreferences({ order: [], hidden: [] });
  }, []);

  const handlePreferencesSave = useCallback(async () => {
    if (!selectedBoard || !selectedView) {
      return;
    }

    const next = pendingPreferences ?? EMPTY_COLUMN_PREFERENCES;
    setIsSavingPreferences(true);
    try {
      const updatedConfiguration = {
        ...selectedView.configuration,
        columnPreferences: next,
      };

      await updateBoardViewConfiguration(
        selectedView.id,
        updatedConfiguration,
        next
      );

      setBoards((previous) =>
        previous.map((board) => {
          if (board.id !== selectedBoard.id) {
            return board;
          }

          return {
            ...board,
            views: board.views.map((view) =>
              view.id === selectedView.id
                ? {
                    ...view,
                    configuration: updatedConfiguration,
                    columnPreferences: next,
                  }
                : view
            ),
          };
        })
      );

      setConfigurationDraft(updatedConfiguration as BoardViewConfiguration);
      setPendingPreferences(next);
      toast({
        title: "View updated",
        description: "Column visibility preferences saved for this view.",
      });
    } catch (error) {
      toast({
        title: "Unable to save preferences",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  }, [
    pendingPreferences,
    selectedBoard,
    selectedView,
    setBoards,
    toast,
  ]);

  const handleBoardChange = (value: string) => {
    setSelectedBoardId(value);
    setSelectedViewId(null);
    setViewResult(null);
    setConfigurationDraft(null);
  };

  const handleViewChange = (value: string) => {
    setSelectedViewId(value);
    setViewResult(null);
    setConfigurationDraft(null);
  };

  const handleBoardCreated = useCallback(
    (created: HydratedBoard) => {
      setBoards((previous) => {
        const withoutDuplicate = previous.filter((board) => board.id !== created.id);
        return [...withoutDuplicate, created].sort((a, b) => a.name.localeCompare(b.name));
      });

      const defaultView =
        created.views.find((view) => view.isDefault) ?? created.views[0] ?? null;

      setSelectedBoardId(created.id);
      setSelectedViewId(defaultView?.id ?? null);
      if (defaultView?.id) {
        persistViewId(created.id, defaultView.id);
      } else {
        clearPersistedViewId(created.id);
      }

      toast({
        title: "Board created",
        description: `${created.name} is ready to use.`,
      });

      setIsCreateOpen(false);
      setNewBoardName(DEFAULT_BOARD_NAME);
      setNewContainerId("");
      setNewQueryDefinition("status:open");
      setNewContainerFilters("{}");
      setNewQueryFilters("{}");
      setNewViewName(DEFAULT_VIEW_NAME);
      setSelectedTemplateId(null);
      setIncludeTemplateItems(false);
      setIncludeTemplateAutomations(false);
      resetBoardDefaults();
    },
    [resetBoardDefaults, toast]
  );

  const handleCreateBoard = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!workspaceId) {
      toast({
        title: "Workspace required",
        description: "Select a workspace before creating a board.",
        variant: "destructive",
      });
      return;
    }

    const trimmedName = newBoardName.trim();
    if (!trimmedName) {
      toast({
        title: "Board name required",
        description: "Please provide a name for your board.",
        variant: "destructive",
      });
      return;
    }

    if (selectedTemplate) {
      setIsCreatingBoard(true);
      try {
        const created = await instantiateBoardTemplate({
          templateId: selectedTemplate.id,
          workspaceId,
          name: trimmedName,
          description: selectedTemplate.description ?? undefined,
          includeItems: selectedTemplate.supportsItems ? includeTemplateItems : false,
          includeAutomations: selectedTemplate.supportsAutomations
            ? includeTemplateAutomations
            : false,
        });

        handleBoardCreated(created);
      } catch (error) {
        toast({
          title: "Unable to apply template",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      } finally {
        setIsCreatingBoard(false);
      }
      return;
    }

    if (newBoardType !== "query" && !newContainerId.trim()) {
      toast({
        title: "Container scope missing",
        description: "Container and hybrid boards require a container scope id.",
        variant: "destructive",
      });
      return;
    }

    if (newBoardType !== "container" && !newQueryDefinition.trim()) {
      toast({
        title: "Query definition missing",
        description: "Query and hybrid boards require a saved query definition.",
        variant: "destructive",
      });
      return;
    }

    let containerFilters: JsonRecord = {};
    let queryFilters: JsonRecord = {};

    try {
      if (newBoardType !== "query") {
        containerFilters = parseJsonInput(
          newContainerFilters,
          "Container filters"
        );
      }

      if (newBoardType !== "container") {
        queryFilters = parseJsonInput(newQueryFilters, "Query filters");
      }
    } catch (error) {
      toast({
        title: "Invalid filters",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
      return;
    }

    const scopeDefaults = buildDefaultSettingsPayload();

    const scopeInput: CreateBoardScopeInput =
      newBoardType === "container"
        ? {
            type: "container",
            containerId: newContainerId.trim(),
            containerFilters,
            defaults: scopeDefaults,
          }
        : newBoardType === "query"
        ? {
            type: "query",
            query: newQueryDefinition.trim(),
            queryFilters,
            defaults: scopeDefaults,
          }
        : {
            type: "hybrid",
            containerId: newContainerId.trim(),
            query: newQueryDefinition.trim(),
            containerFilters,
            queryFilters,
            defaults: scopeDefaults,
          };

    setIsCreatingBoard(true);
    try {
      const created = await createBoard({
        workspaceId,
        name: trimmedName,
        scope: scopeInput,
      });

      handleBoardCreated(created);
    } catch (error) {
      toast({
        title: "Unable to create board",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const renderViewItems = () => {
    if (isLoadingView && !viewResult) {
      return <p className="text-sm text-muted-foreground">Loading view…</p>;
    }

    if (viewError) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Unable to load view</AlertTitle>
          <AlertDescription>{viewError}</AlertDescription>
        </Alert>
      );
    }

    if (!selectedView) {
      return (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Select a saved view to explore the board.
        </div>
      );
    }

    const baseConfiguration = configurationDraft ?? selectedView.configuration ?? buildDefaultViewConfiguration();
    const activeConfiguration: BoardViewConfiguration = {
      ...baseConfiguration,
      columnPreferences: effectivePreferences,
    };

    const items = (viewResult?.items ?? []) as BoardViewRecord[];

    return (
      <BoardViewCanvas
        items={items}
        configuration={activeConfiguration}
        isLoading={isLoadingView && !viewResult}
        hasMore={viewResult?.hasMore ?? false}
        isLoadingMore={isLoadingMore}
        onLoadMore={handleLoadMore}
        onItemsChange={handleViewItemsChange}
        onConfigurationChange={handleViewConfigurationChange}
      />
    );
  };

  const renderBoardSelector = () => (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selectedBoard?.id ?? undefined}
        onValueChange={handleBoardChange}
        disabled={boards.length === 0}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Select a board" />
        </SelectTrigger>
        <SelectContent>
          {boards.map((board) => (
            <SelectItem key={board.id} value={board.id}>
              {board.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedView?.id ?? undefined}
        onValueChange={handleViewChange}
        disabled={!selectedBoard || selectedBoard.views.length === 0}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Select a view" />
        </SelectTrigger>
        <SelectContent>
          {(selectedBoard?.views ?? []).map((view) => (
            <SelectItem key={view.id} value={view.id}>
              {view.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={handleRefresh}
        disabled={!selectedBoard || !selectedView || isRefreshingView}
      >
        {isRefreshingView ? "Refreshing…" : "Refresh view"}
      </Button>
    </div>
  );

  const currentScopeLabel = useMemo(() => {
    if (!selectedBoard?.scope) {
      return null;
    }

    const { scope } = selectedBoard;
    switch (scope.type) {
      case "container":
        return `Container: ${scope.containerId}`;
      case "query":
        return `Query: ${scope.query}`;
      case "hybrid":
        return `Hybrid: ${scope.containerId} • ${scope.query}`;
      default:
        return null;
    }
  }, [selectedBoard]);

  const renderCreateBoardForm = () => {
    if (!isCreateOpen) {
      return null;
    }

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Create a new board</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateBoard}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="board-name">Board name</Label>
              <Input
                id="board-name"
                value={newBoardName}
                onChange={(event) => setNewBoardName(event.target.value)}
                placeholder="Design insights"
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Template gallery</Label>
                {selectedTemplate ? (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setSelectedTemplateId(null)}
                    className="px-0"
                  >
                    Start from scratch
                  </Button>
                ) : null}
              </div>
              {templateError ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to load templates</AlertTitle>
                  <AlertDescription>{templateError}</AlertDescription>
                </Alert>
              ) : isLoadingTemplates ? (
                <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                  Loading templates…
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates available yet. Configure your board manually below.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template) => {
                    const isActive = selectedTemplateId === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={cn(
                          "rounded-md border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary",
                          isActive
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-muted bg-background hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="font-medium">{template.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description ??
                                "Reusable configuration for this board type."}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {BOARD_TYPE_LABELS[template.type]}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {template.viewCount} {template.viewCount === 1 ? "view" : "views"}
                          </span>
                          <span>
                            • {template.fieldCount} {template.fieldCount === 1 ? "field" : "fields"}
                          </span>
                          {template.supportsItems ? <span>• Sample items</span> : null}
                          {template.supportsAutomations ? <span>• Automations</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedTemplate ? (
              <div className="space-y-3 rounded-md border border-dashed p-4 md:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Choose which parts of {" "}
                  <span className="font-medium">{selectedTemplate.name}</span> to include.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  {selectedTemplate.supportsItems ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={includeTemplateItems}
                        onCheckedChange={setIncludeTemplateItems}
                      />
                      Include sample items ({selectedTemplate.itemCount})
                    </label>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      This template does not include sample items.
                    </span>
                  )}
                  {selectedTemplate.supportsAutomations ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={includeTemplateAutomations}
                        onCheckedChange={setIncludeTemplateAutomations}
                      />
                      Include automation recipes ({selectedTemplate.automationCount})
                    </label>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No automation recipes bundled.
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="board-type">Board type</Label>
                  <Select
                    value={newBoardType}
                    onValueChange={(value) => setNewBoardType(value as BoardType)}
                  >
                    <SelectTrigger id="board-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="query">Query</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newBoardType !== "query" ? (
                  <div className="space-y-2">
                    <Label htmlFor="container-id">Container scope id</Label>
                    <Input
                      id="container-id"
                      value={newContainerId}
                      onChange={(event) => setNewContainerId(event.target.value)}
                      placeholder="project-123"
                    />
                  </div>
                ) : null}

                {newBoardType !== "container" ? (
                  <div className="space-y-2">
                    <Label htmlFor="query-definition">Query definition</Label>
                    <Input
                      id="query-definition"
                      value={newQueryDefinition}
                      onChange={(event) => setNewQueryDefinition(event.target.value)}
                      placeholder="status:open assignee:@me"
                    />
                  </div>
                ) : null}

                {newBoardType !== "query" ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="container-filters">Container filters (JSON)</Label>
                    <Textarea
                      id="container-filters"
                      value={newContainerFilters}
                      onChange={(event) => setNewContainerFilters(event.target.value)}
                      rows={4}
                    />
                  </div>
                ) : null}

                {newBoardType !== "container" ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="query-filters">Query filters (JSON)</Label>
                    <Textarea
                      id="query-filters"
                      value={newQueryFilters}
                      onChange={(event) => setNewQueryFilters(event.target.value)}
                      rows={4}
                    />
                  </div>
                ) : null}

                <div className="space-y-3 rounded-md border border-dashed p-4 md:col-span-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Behavior defaults</h3>
                    <p className="text-xs text-muted-foreground">
                      Configure which views and policies are active the first time collaborators
                      open this board.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="default-view-mode">Default view mode</Label>
                      <Select
                        value={defaultViewMode}
                        onValueChange={(value) =>
                          handleDefaultViewModeChange(value as BoardViewMode)
                        }
                      >
                        <SelectTrigger id="default-view-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {viewModes.map((mode) => (
                            <SelectItem key={mode} value={mode} className="capitalize">
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Available views</Label>
                      <div className="grid gap-2">
                        {viewModes.map((mode) => (
                          <label key={mode} className="flex items-center gap-2 text-sm">
                            <Switch
                              checked={enabledViewModes[mode]}
                              onCheckedChange={(checked) =>
                                handleViewModeToggle(mode, checked)
                              }
                            />
                            <span className="capitalize">{mode}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color-field">Color field</Label>
                      <Input
                        id="color-field"
                        value={colorField}
                        onChange={(event) => setColorField(event.target.value)}
                        placeholder="status"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color-mode">Color mode</Label>
                      <Select
                        value={colorMode}
                        onValueChange={(value) =>
                          setColorMode(value as typeof colorMode)
                        }
                      >
                        <SelectTrigger id="color-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>WIP guard rails</Label>
                      <label className="flex items-center gap-2 text-sm">
                        <Switch checked={wipEnabled} onCheckedChange={setWipEnabled} />
                        <span>{wipEnabled ? "Enabled" : "Disabled"} on first load</span>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        When disabled, columns start without WIP limits.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="backlog-ranking">Backlog ranking</Label>
                      <Select
                        value={backlogRanking}
                        onValueChange={(value) =>
                          setBacklogRanking(value as typeof backlogRanking)
                        }
                      >
                        <SelectTrigger id="backlog-ranking">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual (backlog rank)</SelectItem>
                          <SelectItem value="automatic">Automatic (priority)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={showWeekendShading}
                          onCheckedChange={setShowWeekendShading}
                        />
                        Shade weekends in timeline
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Controls the initial timeline shading for weekends.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Working hours</Label>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Start</span>
                          <Input
                            type="time"
                            value={workingStart}
                            onChange={(event) => setWorkingStart(event.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">End</span>
                          <Input
                            type="time"
                            value={workingEnd}
                            onChange={(event) => setWorkingEnd(event.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Timezone</span>
                          <Input
                            value={workingTimezone}
                            onChange={(event) => setWorkingTimezone(event.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Card field presets</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {cardFieldPresets.map((preset) => (
                          <label key={preset.field} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={preset.visible}
                              onCheckedChange={(checked) =>
                                handleCardPresetVisibilityChange(
                                  preset.field,
                                  checked === true
                                )
                              }
                            />
                            <span className="capitalize">Show {preset.field}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="view-name">Default view name</Label>
                  <Input
                    id="view-name"
                    value={newViewName}
                    onChange={(event) => setNewViewName(event.target.value)}
                    placeholder="Active work"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={isCreatingBoard}>
                {isCreatingBoard
                  ? "Creating…"
                  : selectedTemplate
                  ? "Use template"
                  : "Create board"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Boards</h1>
            {selectedBoard ? (
              <Badge variant="secondary">{BOARD_TYPE_LABELS[selectedBoard.type]}</Badge>
            ) : null}
          </div>
          {selectedBoard?.scope ? (
            <p className="text-sm text-muted-foreground">{currentScopeLabel}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create collaborative boards backed by saved scopes and queries.
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          {renderBoardSelector()}
          <Button variant="outline" onClick={() => setIsCreateOpen((open) => !open)}>
            {isCreateOpen ? "Close creator" : "New board"}
          </Button>
        </div>
      </div>

      {boardError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load boards</AlertTitle>
          <AlertDescription>{boardError}</AlertDescription>
        </Alert>
      ) : null}

      {isLoadingBoards && boards.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading boards…
          </CardContent>
        </Card>
      ) : null}

      {!isLoadingBoards && boards.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No boards yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create your first board to organise work by container, query, or both.</p>
            <Button onClick={() => setIsCreateOpen(true)}>Create a board</Button>
          </CardContent>
        </Card>
      ) : null}

      {renderCreateBoardForm()}

      {selectedBoard ? (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{selectedView?.name ?? "Saved view"}</CardTitle>
              {viewResult ? (
                <p className="text-xs text-muted-foreground">
                  Last refreshed {new Date(viewResult.refreshedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            {selectedBoard.scope ? (
              <Badge variant="outline">{BOARD_TYPE_LABELS[selectedBoard.scope.type]}</Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedView ? (
              <ViewColumnSchemaControls
                columns={availableColumns}
                preferences={effectivePreferences}
                onChange={handlePreferencesChange}
                onSave={handlePreferencesSave}
                onReset={handlePreferencesReset}
                saving={isSavingPreferences}
              />
            ) : null}

            {renderViewItems()}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={!selectedBoard || !selectedView || isRefreshingView}
              >
                {isRefreshingView ? "Refreshing…" : "Refresh"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleLoadMore}
                disabled={!viewResult?.hasMore || isLoadingMore}
              >
                {isLoadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
