import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCommandK } from "./useCommandK";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { opqlSuggest, searchSuggest } from "@/services/search";
import type {
  DidYouMeanSuggestion,
  OpqlSuggestionItem,
  SearchResult,
  SuggestionHistoryEntry,
  SuggestionKind,
} from "@/types";
import { listSavedSearches } from "@/services/savedSearches";
import {
  loadOpqlHistory,
  persistOpqlHistory,
  recordOpqlSelection,
} from "@/lib/opqlHistory";
import { analyzeOpqlCursorContext } from "@/lib/opql/cursorContext";
import { formatSuggestionValue, getSuggestionInsertion } from "@/lib/opqlSuggestions";
import { useSuggestionDictionaries } from "@/hooks/useSuggestionDictionaries";
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
import { executeOfflineQuery, type OfflineQueryResult } from "@/services/offline/opqlIndex";
import {
  ArrowLeftRight,
  BadgeCheck,
  Bookmark,
  Brain,
  CalendarClock,
  CalendarMinus,
  CalendarPlus,
  CalendarRange,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock,
  Compass,
  Equal,
  Figma,
  File,
  FileText,
  FlagTriangleRight,
  Flame,
  FolderKanban,
  GitBranch,
  History,
  Inbox,
  List,
  ListChecks,
  ListTodo,
  ListX,
  Loader2,
  MessageSquare,
  XCircle,
  Pen,
  PlusCircle,
  ScanText,
  Server,
  Sparkle,
  Sparkles,
  Sun,
  User,
  UserCheck,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  task: "Tasks",
  project: "Projects",
  doc: "Docs",
  file: "Files",
  comment: "Comments",
  person: "People",
  team_member: "Team Members",
};

const TYPE_ICONS: Record<SearchResult["type"], LucideIcon> = {
  task: ListTodo,
  project: FolderKanban,
  doc: FileText,
  file: File,
  comment: MessageSquare,
  person: User,
  team_member: User,
};

const SUGGESTION_ICON_MAP: Record<string, LucideIcon> = {
  "check-square": CheckSquare,
  "folder-kanban": FolderKanban,
  "file-text": FileText,
  "message-square": MessageSquare,
  "user-circle": UserCircle,
  equals: Equal,
  "not-equal": XCircle,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "list-checks": ListChecks,
  "list-x": ListX,
  "scan-text": ScanText,
  "arrow-left-right": ArrowLeftRight,
  "calendar-minus": CalendarMinus,
  "calendar-plus": CalendarPlus,
  "calendar-range": CalendarRange,
  "calendar-clock": CalendarClock,
  "calendar-sync": CalendarClock,
  "badge-check": BadgeCheck,
  clock: Clock,
  "clock-3": Clock,
  workflow: GitBranch,
  "flag-triangle-right": FlagTriangleRight,
  flame: Flame,
  brain: Brain,
  compass: Compass,
  pen: Pen,
  server: Server,
  history: History,
  figma: Figma,
  sparkle: Sparkle,
  sparkles: Sparkles,
  users: Users,
  user: User,
  list: List,
  "list-todo": ListTodo,
};

const getSuggestionIcon = (icon?: string): LucideIcon => {
  if (!icon) return Sparkles;
  const normalized = icon.toLowerCase();
  return SUGGESTION_ICON_MAP[icon] ?? SUGGESTION_ICON_MAP[normalized] ?? Sparkles;
};

const buildPreviewSegments = (preview: DidYouMeanSuggestion["preview"]) => {
  const before = preview.before.trimEnd();
  const after = preview.after.trimStart();
  const beforeText = before.length > 20 ? `…${before.slice(-20)}` : before;
  const afterText = after.length > 20 ? `${after.slice(0, 20)}…` : after;
  return { before: beforeText, after: afterText };
};

type QuickAction = {
  id: string;
  label: string;
  description?: string;
  Icon: LucideIcon;
  onSelect: () => void;
};

const useDebouncedValue = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debounced;
};

type Suggestion = SearchResult;

export const CommandPalette = () => {
  const { open, query, setQuery, closePalette, scope } = useCommandK();
  const [tab, setTab] = useState<"search" | "actions">("search");
  const navigate = useNavigate();
  const location = useLocation();
  const lastPathnameRef = useRef(location.pathname);
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 250);
  const cursorContext = useMemo(() => {
    const context = analyzeOpqlCursorContext(query, cursor);
    return {
      ...context,
      token: context.token.trim(),
      prefix: context.prefix.trim(),
    };
  }, [query, cursor]);
  const [history, setHistory] = useState<SuggestionHistoryEntry[]>(loadOpqlHistory);
  const connectivity = useConnectivityStatus(5_000);
  const [offlineResult, setOfflineResult] = useState<OfflineQueryResult | null>(null);
  const savedSearchesQuery = useQuery({
    queryKey: ["saved-searches"],
    queryFn: listSavedSearches,
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const {
    dictionaries: suggestionDictionaries,
    signature: dictionarySignature,
    currentTeamId,
  } = useSuggestionDictionaries();

  useEffect(() => {
    persistOpqlHistory(history);
  }, [history]);

  useEffect(() => {
    let cancelled = false;
    if (!open || tab !== "search" || !query.trim()) {
      setOfflineResult(null);
      return () => {
        cancelled = true;
      };
    }

    if (connectivity.state !== "offline") {
      setOfflineResult(null);
      return () => {
        cancelled = true;
      };
    }

    void executeOfflineQuery({
      query,
      limit: 8,
      context: {
        projectId: scope.projectId ?? null,
        types: scope.types,
      },
    })
      .then((result) => {
        if (!cancelled) {
          setOfflineResult(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOfflineResult(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connectivity.state, open, query, scope.projectId, scope.types, tab]);

  const updateHistory = useCallback(
    (kind: SuggestionKind, id: string) => {
      setHistory((prev) => recordOpqlSelection(prev, kind, id));
    },
    []
  );

  const syncCursor = useCallback(() => {
    const element = inputRef.current;
    if (!element) return;
    if (document.activeElement !== element) return;
    const next = element.selectionStart ?? query.length;
    setCursor(next);
  }, [query.length]);

  useEffect(() => {
    if (!open) {
      setCursor(0);
      return;
    }
    const handle = () => syncCursor();
    document.addEventListener("selectionchange", handle);
    return () => document.removeEventListener("selectionchange", handle);
  }, [open, syncCursor]);

  useEffect(() => {
    if (!open) return;
    syncCursor();
  }, [open, query, syncCursor]);

  const historySignature = useMemo(
    () =>
      history
        .map((entry) => `${entry.kind}:${entry.id}:${entry.frequency}:${entry.lastUsed}`)
        .join("|"),
    [history]
  );

  const opqlSuggestions = useQuery({
    queryKey: [
      "opql-suggest",
      debouncedQuery,
      cursor,
      scope.projectId ?? null,
      scope.types?.join(",") ?? null,
      historySignature,
      currentTeamId ?? null,
      dictionarySignature,
      cursorContext.state,
      cursorContext.field ?? null,
      cursorContext.operator ?? null,
      cursorContext.expecting ?? null,
    ],
    queryFn: () =>
      opqlSuggest({
        text: query,
        cursor,
        grammarState: cursorContext.state,
        cursorContext,
        context: {
          projectId: scope.projectId,
          types: scope.types,
          teamId: currentTeamId,
          dictionaries: suggestionDictionaries,
        },
        history,
      }),
    enabled: open && tab === "search",
    staleTime: 1000 * 15,
  });

  const navigateAndClose = useCallback(
    (url: string) => {
      closePalette();
      navigate(url);
    },
    [closePalette, navigate]
  );

  const goToSearchPage = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const params = new URLSearchParams();
    params.set("q", trimmed);
    if (scope.projectId) {
      params.set("projectId", scope.projectId);
    }
    if (scope.types?.length) {
      params.set("type", scope.types.join(","));
    }
    closePalette();
    navigate(`/search?${params.toString()}`);
  }, [closePalette, navigate, query, scope.projectId, scope.types]);

  const applyReplacement = useCallback(
    (
      replacement: string,
      range?: { start: number; end: number },
      cursorOffset?: number
    ) => {
      const tokenRange = range ?? opqlSuggestions.data?.token ?? {
        start: query.length,
        end: query.length,
      };
      const safeRange = {
        start: Math.max(0, Math.min(tokenRange.start, query.length)),
        end: Math.max(0, Math.min(tokenRange.end, query.length)),
      };
      const before = query.slice(0, safeRange.start);
      const after = query.slice(safeRange.end).replace(/^\s+/u, "");
      const nextValue = `${before}${replacement}${after}`;
      const nextCursor = safeRange.start + (cursorOffset ?? replacement.length);
      setQuery(nextValue);
      setCursor(nextCursor);
      requestAnimationFrame(() => {
        const element = inputRef.current;
        if (!element) return;
        element.focus();
        element.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [opqlSuggestions.data?.token, query, setQuery]
  );

  const applyCompletion = useCallback(() => {
    const completion = opqlSuggestions.data?.completion;
    if (!completion) {
      const first = opqlSuggestions.data?.items?.[0];
      if (first) {
        const { text, cursorOffset } = getSuggestionInsertion(first);
        applyReplacement(text, undefined, cursorOffset);
        updateHistory(first.kind, first.id);
      }
      return;
    }
    applyReplacement(completion.insertText, completion.range, completion.cursorOffset);
    updateHistory(completion.kind, completion.id);
  }, [applyReplacement, opqlSuggestions.data, updateHistory]);

  const handleSuggestionItem = useCallback(
    (item: OpqlSuggestionItem) => {
      const { text, cursorOffset } = getSuggestionInsertion(item);
      applyReplacement(text, undefined, cursorOffset);
      updateHistory(item.kind, item.id);
    },
    [applyReplacement, updateHistory]
  );

  const handleCorrection = useCallback(
    (suggestion: DidYouMeanSuggestion) => {
      const insertion = `${suggestion.replacement} `;
      applyReplacement(insertion);
      updateHistory("correction", suggestion.id);
    },
    [applyReplacement, updateHistory]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: "new-task",
        label: "New task",
        description: "Create a task",
        Icon: PlusCircle,
        onSelect: () => navigateAndClose("/tasks/new"),
      },
      {
        id: "new-project",
        label: "New project",
        description: "Start a project",
        Icon: FolderKanban,
        onSelect: () => navigateAndClose("/projects?new=1"),
      },
      {
        id: "my-day",
        label: "Go to My Day",
        description: "Focus view",
        Icon: Sun,
        onSelect: () => navigateAndClose("/my-work?view=day"),
      },
      {
        id: "inbox",
        label: "Go to Inbox",
        description: "Catch up",
        Icon: Inbox,
        onSelect: () => navigateAndClose("/inbox"),
      },
      {
        id: "help",
        label: "Open Help",
        description: "Get support",
        Icon: CircleHelp,
        onSelect: () => navigateAndClose("/help"),
      },
    ],
    [navigateAndClose]
  );

  const savedSearchActions = useMemo(() => {
    const items = (savedSearchesQuery.data ?? []).slice(0, 5);
    return items.map((saved) => {
      const params = new URLSearchParams();
      params.set("q", saved.query);
      const filters = (saved.filters ?? {}) as {
        type?: string | null;
        projectId?: string | null;
      };
      if (filters.type && filters.type !== "all") {
        params.set("type", String(filters.type));
      }
      if (filters.projectId) {
        params.set("projectId", String(filters.projectId));
      }
      return {
        id: `saved-${saved.id}`,
        label: saved.name,
        description: saved.query,
        Icon: Bookmark,
        onSelect: () => navigateAndClose(`/search?${params.toString()}`),
      } satisfies QuickAction;
    });
  }, [navigateAndClose, savedSearchesQuery.data]);

  useEffect(() => {
    if (!open) {
      setTab("search");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      lastPathnameRef.current = location.pathname;
      return;
    }

    if (lastPathnameRef.current !== location.pathname) {
      lastPathnameRef.current = location.pathname;
      closePalette();
    }
  }, [closePalette, location.pathname, open]);

  const suggestions = useQuery({
    queryKey: [
      "command-suggest",
      debouncedQuery,
      scope.projectId ?? null,
      scope.types?.join(",") ?? null,
    ],
    queryFn: () =>
      searchSuggest({
        query: debouncedQuery,
        types: scope.types,
      }),
    enabled: open && Boolean(debouncedQuery.trim()) && debouncedQuery.trim().length >= 2,
    staleTime: 1000 * 30,
  });

  const groupedSuggestions = useMemo(() => {
    const groups = new Map<SearchResult["type"], Suggestion[]>();
    (suggestions.data?.items ?? []).forEach((item) => {
      const existing = groups.get(item.type) ?? [];
      existing.push(item);
      groups.set(item.type, existing);
    });
    return groups;
  }, [suggestions.data?.items]);

  const ghostSuffix = opqlSuggestions.data?.completion?.ghostSuffix ?? "";
  const showGhostText =
    tab === "search" && open && ghostSuffix.trim().length > 0;
  const typedUntilCursor = query.slice(0, cursor);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (tab === "search" && (event.key === "Tab" || event.key === "ArrowRight")) {
        const completion = opqlSuggestions.data?.completion;
        const hasGhost = Boolean(completion?.ghostSuffix && completion.ghostSuffix.trim().length);
        const caretAtEnd = cursor >= (opqlSuggestions.data?.token?.end ?? cursor);
        if (completion && (event.key === "Tab" || (event.key === "ArrowRight" && hasGhost && caretAtEnd))) {
          event.preventDefault();
          applyCompletion();
          return;
        }
      }

      if (event.key === "Enter" && tab === "search" && query.trim()) {
        const activeItem = document.querySelector(
          "[cmdk-item][data-selected='true']"
        );
        if (!activeItem) {
          event.preventDefault();
          goToSearchPage();
        }
      }
    },
    [applyCompletion, cursor, goToSearchPage, opqlSuggestions.data?.completion, opqlSuggestions.data?.token?.end, query, tab]
  );

  const renderSuggestion = (item: Suggestion) => {
    const Icon = TYPE_ICONS[item.type];
    return (
      <CommandItem
        key={`${item.type}-${item.url}`}
        value={`${TYPE_LABELS[item.type]} ${item.title}`}
        onSelect={() => navigateAndClose(item.url)}
      >
        <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item.title}</span>
          <span className="text-xs text-muted-foreground">
            {TYPE_LABELS[item.type]}
          </span>
        </div>
      </CommandItem>
    );
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closePalette();
        }
      }}
    >
      <div className="border-b px-3 py-2">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="relative">
        <CommandInput
          ref={inputRef}
          placeholder={
            tab === "search" ? "Search tasks, docs, people..." : "Filter actions"
          }
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setCursor(value.length);
          }}
          onKeyDown={handleInputKeyDown}
          onClick={syncCursor}
          onKeyUp={syncCursor}
          onFocus={() => requestAnimationFrame(() => syncCursor())}
          aria-label={tab === "search" ? "Search" : "Filter actions"}
        />
        {showGhostText ? (
          <div className="pointer-events-none absolute inset-0 flex items-center px-3">
            <span className="pl-6 text-sm text-muted-foreground/60 whitespace-pre">
              <span className="opacity-0">{typedUntilCursor}</span>
              {ghostSuffix}
            </span>
          </div>
        ) : null}
      </div>
      {tab === "search" && connectivity.state === "offline" ? (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="font-medium">Offline subset</span>
          <span className="text-amber-600/80">
            Showing cached results. Online search will resume automatically when you reconnect.
          </span>
        </div>
      ) : null}
      {tab === "search" && (opqlSuggestions.data?.corrections.length ?? 0) > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Did you mean</span>
          {opqlSuggestions.data?.corrections.map((correction) => {
            const segments = buildPreviewSegments(correction.preview);
            return (
              <button
                key={correction.id}
                type="button"
                onClick={() => handleCorrection(correction)}
                className="inline-flex items-start gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="flex flex-col items-start text-left">
                  <span>{correction.text}</span>
                  <span className="text-[10px] font-normal text-muted-foreground/80">
                    {correction.reason}
                  </span>
                  <span className="text-[10px] font-normal text-muted-foreground/70">
                    {segments.before}
                    <span className="font-semibold text-foreground">
                      {correction.preview.replacement}
                    </span>
                    {segments.after}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
      <CommandList>
        {tab === "search" ? (
          <>
            <CommandEmpty aria-live="polite">
              <div className="flex items-center justify-center gap-2">
                {suggestions.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                <span>
                  {suggestions.isFetching
                    ? "Searching..."
                    : query.trim()
                    ? connectivity.state === "offline"
                      ? offlineResult?.items?.length
                        ? "No additional cached matches"
                        : "No cached results yet"
                      : "No matches"
                    : "Type to search"}
                </span>
              </div>
            </CommandEmpty>
            {offlineResult?.items?.length ? (
              <CommandGroup heading="Offline results">
                {offlineResult.items.map((item) => renderSuggestion(item))}
                <div className="px-3 pb-2 text-xs text-muted-foreground">
                  Results from your recent searches.
                </div>
              </CommandGroup>
            ) : null}
            {offlineResult && offlineResult.reason && !offlineResult.items.length ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">
                We saved some data offline, but this query uses features not yet supported ({offlineResult.reason}).
              </div>
            ) : null}
            {opqlSuggestions.data?.items?.length ? (
              <CommandGroup heading="Query suggestions">
                {opqlSuggestions.data.items.map((item) => (
                  <CommandItem
                    key={`opql-${item.id}`}
                    value={`${item.label} ${item.description ?? ""}`}
                    onSelect={() => handleSuggestionItem(item)}
                  >
                    {(() => {
                      const Icon = getSuggestionIcon(item.icon);
                      return <Icon className="mr-2 h-4 w-4 text-amber-500" aria-hidden="true" />;
                    })()}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {formatSuggestionValue(item)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.description ?? item.label}
                      </span>
                      {item.documentation ? (
                        <span className="text-[10px] text-muted-foreground/70">
                          {item.documentation}
                        </span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {Array.from(groupedSuggestions.entries()).map(([type, items]) => (
              <CommandGroup key={type} heading={TYPE_LABELS[type]}>
                {items.map((item) => renderSuggestion(item))}
              </CommandGroup>
            ))}
            {savedSearchActions.length > 0 ? (
              <CommandGroup heading="Saved searches">
                {savedSearchActions.map(({ id, label, description, Icon, onSelect }) => (
                  <CommandItem
                    key={`search-tab-${id}`}
                    value={`${label} ${description ?? ""}`}
                    onSelect={onSelect}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{label}</span>
                      {description ? (
                        <span className="text-xs text-muted-foreground">{description}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </>
        ) : (
          <>
            <CommandEmpty aria-live="polite">No actions found</CommandEmpty>
            <CommandGroup heading="Quick actions">
              {quickActions.map(({ id, label, description, Icon, onSelect }) => (
                <CommandItem
                  key={id}
                  value={`${label} ${description ?? ""}`}
                  onSelect={onSelect}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{label}</span>
                    {description ? (
                      <span className="text-xs text-muted-foreground">{description}</span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {savedSearchActions.length > 0 ? (
              <CommandGroup heading="Saved searches">
                {savedSearchActions.map(({ id, label, description, Icon, onSelect }) => (
                  <CommandItem
                    key={id}
                    value={`${label} ${description ?? ""}`}
                    onSelect={onSelect}
                  >
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{label}</span>
                      {description ? (
                        <span className="text-xs text-muted-foreground">{description}</span>
                      ) : null}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </>
        )}
      </CommandList>
      {tab === "search" && (suggestions.data?.items?.length ?? 0) > 0 ? (
        <CommandSeparator />
      ) : null}
      {tab === "search" && query.trim() ? (
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 px-4 py-2 text-sm text-muted-foreground",
            "hover:bg-muted"
          )}
          onClick={goToSearchPage}
        >
          <span>Open full search</span>
          <span className="text-xs">Enter</span>
        </button>
      ) : null}
    </CommandDialog>
  );
};
