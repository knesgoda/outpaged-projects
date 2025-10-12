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
import { formatSuggestionValue } from "@/lib/opqlSuggestions";
import { useSuggestionDictionaries } from "@/hooks/useSuggestionDictionaries";
import {
  CircleHelp,
  FileText,
  File,
  FolderKanban,
  Inbox,
  ListTodo,
  Loader2,
  MessageSquare,
  Bookmark,
  PlusCircle,
  Sun,
  User,
  Sparkles,
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
  const [history, setHistory] = useState<SuggestionHistoryEntry[]>(loadOpqlHistory);
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
    ],
    queryFn: () =>
      opqlSuggest({
        text: query,
        cursor,
        grammarState: "root",
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
    (replacement: string, range?: { start: number; end: number }) => {
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
      const nextCursor = safeRange.start + replacement.length;
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
        const insertion = `${formatSuggestionValue(first)} `;
        applyReplacement(insertion);
        updateHistory(first.kind, first.id);
      }
      return;
    }
    applyReplacement(completion.insertText, completion.range);
    updateHistory(completion.kind, completion.id);
  }, [applyReplacement, opqlSuggestions.data, updateHistory]);

  const handleSuggestionItem = useCallback(
    (item: OpqlSuggestionItem) => {
      const insertion = `${formatSuggestionValue(item)} `;
      applyReplacement(insertion);
      updateHistory(item.kind, item.id);
    },
    [applyReplacement, updateHistory]
  );

  const handleCorrection = useCallback(
    (text: string) => {
      const insertion = `${text} `;
      applyReplacement(insertion);
      updateHistory("correction", text);
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
        projectId: scope.projectId,
        types: scope.types,
      }),
    enabled: open && Boolean(debouncedQuery.trim()),
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
      {tab === "search" && (opqlSuggestions.data?.corrections.length ?? 0) > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium">Did you mean</span>
          {opqlSuggestions.data?.corrections.map((correction) => (
            <button
              key={correction.id}
              type="button"
              onClick={() => handleCorrection(correction.text)}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {correction.text}
              <span className="text-[10px] font-normal text-muted-foreground/80">
                {correction.reason}
              </span>
            </button>
          ))}
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
                    ? "No matches"
                    : "Type to search"}
                </span>
              </div>
            </CommandEmpty>
            {opqlSuggestions.data?.items?.length ? (
              <CommandGroup heading="Query suggestions">
                {opqlSuggestions.data.items.map((item) => (
                  <CommandItem
                    key={`opql-${item.id}`}
                    value={`${item.label} ${item.description ?? ""}`}
                    onSelect={() => handleSuggestionItem(item)}
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-amber-500" aria-hidden="true" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {formatSuggestionValue(item)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.description ?? item.label}
                      </span>
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
