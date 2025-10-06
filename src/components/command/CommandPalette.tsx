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
import { searchSuggest } from "@/services/search";
import type { SearchResult } from "@/types";
import { listSavedSearches } from "@/services/savedSearches";
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
};

const TYPE_ICONS: Record<SearchResult["type"], LucideIcon> = {
  task: ListTodo,
  project: FolderKanban,
  doc: FileText,
  file: File,
  comment: MessageSquare,
  person: User,
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

type Suggestion = Awaited<ReturnType<typeof searchSuggest>> extends Array<infer Item>
  ? Item
  : never;

export const CommandPalette = () => {
  const { open, query, setQuery, closePalette, scope } = useCommandK();
  const [tab, setTab] = useState<"search" | "actions">("search");
  const navigate = useNavigate();
  const location = useLocation();
  const lastPathnameRef = useRef(location.pathname);
  const debouncedQuery = useDebouncedValue(query, 250);
  const savedSearchesQuery = useQuery({
    queryKey: ["saved-searches"],
    queryFn: listSavedSearches,
    enabled: open,
    staleTime: 1000 * 60 * 5,
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
        onSelect: () => navigateAndClose("/projects/new"),
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
    queryFn: () => searchSuggest(debouncedQuery),
    enabled: open && Boolean(debouncedQuery.trim()),
    staleTime: 1000 * 30,
  });

  const groupedSuggestions = useMemo(() => {
    const groups = new Map<SearchResult["type"], Suggestion[]>();
    (suggestions.data ?? []).forEach((item) => {
      const existing = groups.get(item.type) ?? [];
      existing.push(item);
      groups.set(item.type, existing);
    });
    return groups;
  }, [suggestions.data]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
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
    [goToSearchPage, query, tab]
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
      <CommandInput
        placeholder={tab === "search" ? "Search tasks, docs, people..." : "Filter actions"}
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleInputKeyDown}
        aria-label={tab === "search" ? "Search" : "Filter actions"}
      />
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
      {tab === "search" && (suggestions.data?.length ?? 0) > 0 ? (
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
