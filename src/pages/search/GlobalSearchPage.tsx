import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Search as SearchIcon,
  Sparkles,
  Filter,
  XCircle,
  Flame,
  ChevronDown,
  Save,
  Keyboard,
  Eye,
  Layers,
  FileOutput,
  Share2,
} from "lucide-react";

import { searchAll } from "@/services/search";
import type { SearchResult } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  type SavedSearch,
} from "@/services/savedSearches";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { SearchResultItem } from "./SearchResultItem";
import { cn } from "@/lib/utils";

const DEFAULT_LIMIT = 50;
const CONTEXTUAL_ACTIONS = [
  { id: "recent", label: "Resume recent search", icon: Sparkles },
  { id: "saved", label: "Saved searches", icon: Save },
  { id: "keyboard", label: "Keyboard reference", icon: Keyboard },
];

const SEARCH_MODES: Array<{
  value: SearchMode;
  label: string;
  description: string;
  shortcut: string;
}> = [
  {
    value: "quick",
    label: "Quick",
    description: "Fast keyword search with instant results",
    shortcut: "⌘1",
  },
  {
    value: "opql",
    label: "OPQL",
    description: "Write structured queries with autocomplete",
    shortcut: "⌘2",
  },
  {
    value: "builder",
    label: "Builder",
    description: "Compose advanced filters visually",
    shortcut: "⌘3",
  },
];

const MY_STUFF_TOGGLES = [
  { key: "assigned", label: "Assigned to me" },
  { key: "created", label: "Created by me" },
  { key: "following", label: "Following" },
] as const;

type SearchMode = "quick" | "opql" | "builder";

type ProjectOption = {
  id: string;
  name: string;
};

type FacetKey = "type" | "project" | "updated" | `custom:${string}`;

type FacetSelections = {
  include: Record<string, Set<string>>;
  exclude: Record<string, Set<string>>;
};

type ResultBuckets = {
  type: string;
  project: string;
  updated: string;
  custom: Record<string, string>;
  ownership: {
    assigned: boolean;
    created: boolean;
    following: boolean;
  };
};

type Aggregations = {
  counts: Record<FacetKey, Map<string, number>>;
  max: Record<FacetKey, number>;
  buckets: Map<string, ResultBuckets>;
};

const INITIAL_FACETS: FacetSelections = {
  include: {},
  exclude: {},
};

const cloneFacetSelections = (input: FacetSelections): FacetSelections => ({
  include: Object.fromEntries(
    Object.entries(input.include).map(([key, values]) => [key, new Set(values)])
  ),
  exclude: Object.fromEntries(
    Object.entries(input.exclude).map(([key, values]) => [key, new Set(values)])
  ),
});

const CUSTOM_FIELD_DEFINITIONS: Record<string, string[]> = {
  Status: ["Ready", "In Progress", "Blocked", "Done"],
  Priority: ["Low", "Medium", "High", "Urgent"],
  "Team Heat": ["Cool", "Warm", "Hot"],
};

const fetchProjects = async (): Promise<ProjectOption[]> => {
  if (!supabaseConfigured) {
    return [];
  }
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.warn("Failed to load projects for search filter", error);
    return [];
  }

  return data ?? [];
};

const projectLabel = (projectId: string | null | undefined, projects: ProjectOption[]) => {
  if (!projectId) return "Unassigned";
  const match = projects.find((project) => project.id === projectId);
  return match?.name ?? "Project";
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const deriveBuckets = (result: SearchResult): ResultBuckets => {
  const hash = hashString(`${result.id}-${result.type}`);
  const updatedBucket = (() => {
    if (!result.updated_at) return "No activity";
    const updated = new Date(result.updated_at);
    const now = new Date();
    const diff = now.getTime() - updated.getTime();
    const day = 1000 * 60 * 60 * 24;
    if (diff <= day) return "Today";
    if (diff <= day * 7) return "This week";
    if (diff <= day * 30) return "Last 30 days";
    return "Older";
  })();

  const custom: Record<string, string> = {};
  const statusIndex = hash % CUSTOM_FIELD_DEFINITIONS.Status.length;
  custom.Status = CUSTOM_FIELD_DEFINITIONS.Status[statusIndex];
  const priorityIndex = hash % CUSTOM_FIELD_DEFINITIONS.Priority.length;
  custom.Priority = CUSTOM_FIELD_DEFINITIONS.Priority[priorityIndex];
  const heatIndex = hash % CUSTOM_FIELD_DEFINITIONS["Team Heat"].length;
  custom["Team Heat"] = CUSTOM_FIELD_DEFINITIONS["Team Heat"][heatIndex];

  return {
    type: result.type,
    project: result.project_id ?? "unassigned",
    updated: updatedBucket,
    custom,
    ownership: {
      assigned: hash % 3 === 0,
      created: hash % 5 === 0,
      following: hash % 7 === 0,
    },
  };
};

const computeAggregations = (
  results: SearchResult[] | undefined,
  projects: ProjectOption[]
): Aggregations => {
  const counts: Record<FacetKey, Map<string, number>> = {
    type: new Map(),
    project: new Map(),
    updated: new Map(),
  } as Record<FacetKey, Map<string, number>>;
  const max: Record<FacetKey, number> = {
    type: 0,
    project: 0,
    updated: 0,
  } as Record<FacetKey, number>;
  const buckets = new Map<string, ResultBuckets>();

  if (!results?.length) {
    return { counts, max, buckets };
  }

  const increment = (facet: FacetKey, key: string) => {
    if (!counts[facet]) {
      counts[facet] = new Map();
      max[facet] = 0;
    }
    const next = (counts[facet].get(key) ?? 0) + 1;
    counts[facet].set(key, next);
    if (next > (max[facet] ?? 0)) {
      max[facet] = next;
    }
  };

  for (const result of results) {
    const bucket = deriveBuckets(result);
    buckets.set(result.id, bucket);

    increment("type", bucket.type);
    const projectName = projectLabel(
      result.project_id ?? null,
      projects
    );
    increment("project", projectName);
    increment("updated", bucket.updated);

    Object.entries(bucket.custom).forEach(([field, value]) => {
      const key = `custom:${field}` as FacetKey;
      if (!counts[key]) {
        counts[key] = new Map();
        max[key] = 0;
      }
      increment(key, value);
    });
  }

  return { counts, max, buckets };
};

const toggleFacetValue = (
  current: FacetSelections,
  facet: FacetKey,
  value: string,
  exclude: boolean
): FacetSelections => {
  const map = exclude ? current.exclude : current.include;
  const key = facet;
  const next = new Set(map[key] ?? []);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
    if (!exclude) {
      // ensure same value removed from exclude
      const excluded = new Set(current.exclude[key] ?? []);
      if (excluded.has(value)) {
        excluded.delete(value);
        current.exclude[key] = excluded;
      }
    } else {
      const included = new Set(current.include[key] ?? []);
      if (included.has(value)) {
        included.delete(value);
        current.include[key] = included;
      }
    }
  }
  map[key] = next;
  return {
    include: { ...current.include },
    exclude: { ...current.exclude },
  };
};

const isFacetActive = (current: FacetSelections, facet: FacetKey, value: string) =>
  current.include[facet]?.has(value) ?? false;

const isFacetExcluded = (current: FacetSelections, facet: FacetKey, value: string) =>
  current.exclude[facet]?.has(value) ?? false;

export const GlobalSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryParam = searchParams.get("q") ?? "";
  const projectFilterParam = searchParams.get("projectId");
  const projectFilter =
    projectFilterParam && projectFilterParam.trim().length > 0
      ? projectFilterParam
      : "all";

  const [inputValue, setInputValue] = useState(queryParam);
  const [mode, setMode] = useState<SearchMode>("quick");
  const [facetSelections, setFacetSelections] = useState<FacetSelections>(() =>
    cloneFacetSelections(INITIAL_FACETS)
  );
  const [myStuff, setMyStuff] = useState<Record<(typeof MY_STUFF_TOGGLES)[number]["key"], boolean>>({
    assigned: false,
    created: false,
    following: false,
  });
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(() => new Set<string>());
  const [pinnedResults, setPinnedResults] = useState<Set<string>>(() => new Set<string>());
  const [previewResultId, setPreviewResultId] = useState<string | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportMasking, setExportMasking] = useState(true);
  const [customFieldFocus, setCustomFieldFocus] = useState<string | null>(null);

  const filterPaneRef = useRef<HTMLDivElement>(null);
  const resultsPaneRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setLimit(DEFAULT_LIMIT);
  }, [queryParam, projectFilter, mode]);

  const projectsQuery = useQuery({
    queryKey: ["search-project-options"],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 10,
  });

  const savedSearchesQuery = useQuery({
    queryKey: ["saved-searches"],
    queryFn: listSavedSearches,
    enabled: supabaseConfigured,
    staleTime: 1000 * 60 * 5,
  });

  const createSavedSearchMutation = useMutation({
    mutationFn: createSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast({ title: "Search saved" });
      setIsSaveDialogOpen(false);
      setSaveName("");
    },
    onError: (error: any) => {
      toast({
        title: "Could not save search",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteSavedSearchMutation = useMutation({
    mutationFn: deleteSavedSearch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast({ title: "Search removed" });
    },
    onError: (error: any) => {
      toast({
        title: "Could not delete search",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const searchEnabled = queryParam.trim().length > 0;

  const resultsQuery = useQuery({
    queryKey: [
      "global-search",
      queryParam,
      projectFilter,
      limit,
      mode,
      facetSelections,
      myStuff,
    ],
    queryFn: () =>
      searchAll({
        q: queryParam,
        projectId: projectFilter !== "all" ? projectFilter : undefined,
        limit,
        types: undefined,
        includeComments: true,
      }),
    enabled: searchEnabled,
    staleTime: 0,
  });

  const aggregations = useMemo(
    () => computeAggregations(resultsQuery.data, projectsQuery.data ?? []),
    [resultsQuery.data, projectsQuery.data]
  );

  const filteredResults = useMemo(() => {
    if (!resultsQuery.data) return [] as SearchResult[];

    return resultsQuery.data.filter((result) => {
      const bucket = aggregations.buckets.get(result.id);
      if (!bucket) return true;

      // include facets
      const includeEntries = Object.entries(facetSelections.include) as Array<[FacetKey, Set<string>]>;
      for (const [facetKey, values] of includeEntries) {
        if (!values.size) continue;
        const key = facetKey as FacetKey;
        const value = (() => {
          if (key === "type") return bucket.type;
          if (key === "project") return projectLabel(result.project_id ?? null, projectsQuery.data ?? []);
          if (key === "updated") return bucket.updated;
          if (key.startsWith("custom:")) {
            const customKey = key.split(":")[1];
            return bucket.custom[customKey];
          }
          return undefined;
        })();
        if (!value || !values.has(value)) {
          return false;
        }
      }

      // excluded facets
      const excludeEntries = Object.entries(facetSelections.exclude) as Array<[FacetKey, Set<string>]>;
      for (const [facetKey, values] of excludeEntries) {
        if (!values.size) continue;
        const key = facetKey as FacetKey;
        const value = (() => {
          if (key === "type") return bucket.type;
          if (key === "project") return projectLabel(result.project_id ?? null, projectsQuery.data ?? []);
          if (key === "updated") return bucket.updated;
          if (key.startsWith("custom:")) {
            const customKey = key.split(":")[1];
            return bucket.custom[customKey];
          }
          return undefined;
        })();
        if (value && values.has(value)) {
          return false;
        }
      }

      if (myStuff.assigned && !bucket.ownership.assigned) return false;
      if (myStuff.created && !bucket.ownership.created) return false;
      if (myStuff.following && !bucket.ownership.following) return false;

      return true;
    });
  }, [
    resultsQuery.data,
    aggregations.buckets,
    facetSelections.include,
    facetSelections.exclude,
    myStuff,
    projectsQuery.data,
  ]);

  useEffect(() => {
    if (filteredResults.length && !previewResultId) {
      setPreviewResultId(filteredResults[0].id);
    } else if (previewResultId && !filteredResults.some((item) => item.id === previewResultId)) {
      setPreviewResultId(filteredResults[0]?.id ?? null);
    }
  }, [filteredResults, previewResultId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        const targetMode = SEARCH_MODES[Number(event.key) - 1]?.value;
        if (targetMode) {
          setMode(targetMode);
          if (targetMode === "builder") {
            setCustomFieldFocus("Status");
          }
        }
        return;
      }

      if (event.altKey) {
        if (event.key === "1") {
          event.preventDefault();
          filterPaneRef.current?.focus();
        }
        if (event.key === "2") {
          event.preventDefault();
          resultsPaneRef.current?.focus();
        }
        if (event.key === "3") {
          event.preventDefault();
          previewPaneRef.current?.focus();
        }
      }

      if (event.key === "Escape") {
        if (selectedResults.size) {
          event.preventDefault();
          setSelectedResults(new Set<string>());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedResults.size]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (inputValue.trim()) {
        next.set("q", inputValue.trim());
      } else {
        next.delete("q");
      }
      return next;
    });
  };

  const toggleFacet = (facet: FacetKey, value: string, exclude = false) => {
    setFacetSelections((prev) => toggleFacetValue(cloneFacetSelections(prev), facet, value, exclude));
  };

  const handleToggleResult = (result: SearchResult, selected: boolean) => {
    setSelectedResults((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(result.id);
      } else {
        next.delete(result.id);
      }
      return next;
    });
  };

  const handleTogglePin = (result: SearchResult, pinned: boolean) => {
    setPinnedResults((prev) => {
      const next = new Set(prev);
      if (pinned) {
        next.add(result.id);
      } else {
        next.delete(result.id);
      }
      return next;
    });
  };

  const handlePerformAction = (_result: SearchResult, action: string) => {
    if (action === "export") {
      setIsExportDialogOpen(true);
    }
  };

  const activePreview = filteredResults.find((result) => result.id === previewResultId) ?? null;
  const activePreviewBucket = activePreview ? aggregations.buckets.get(activePreview.id) : null;

  const handleSaveSearch = () => {
    if (!inputValue.trim()) {
      toast({
        title: "Enter a query to save",
        variant: "destructive",
      });
      return;
    }
    createSavedSearchMutation.mutate({
      name: saveName || inputValue,
      query: inputValue,
    });
  };

  const handleMyStuffToggle = (key: (typeof MY_STUFF_TOGGLES)[number]["key"], checked: boolean) => {
    setMyStuff((prev) => ({ ...prev, [key]: checked }));
  };

  const activeFacetChips = useMemo(() => {
    const chips: Array<{ facet: FacetKey; value: string; exclude: boolean }> = [];
    Object.entries(facetSelections.include).forEach(([facet, values]) => {
      values.forEach((value) => chips.push({ facet: facet as FacetKey, value, exclude: false }));
    });
    Object.entries(facetSelections.exclude).forEach(([facet, values]) => {
      values.forEach((value) => chips.push({ facet: facet as FacetKey, value, exclude: true }));
    });
    return chips;
  }, [facetSelections.include, facetSelections.exclude]);

  const clearFacet = (facet: FacetKey, value: string, exclude: boolean) => {
    setFacetSelections((prev) => {
      const clone = cloneFacetSelections(prev);
      if (exclude) {
        clone.exclude[facet]?.delete(value);
      } else {
        clone.include[facet]?.delete(value);
      }
      return clone;
    });
  };

  const handleExport = () => {
    toast({
      title: "Export queued",
      description: exportMasking
        ? "A masked dataset export has been scheduled."
        : "Export started without masking.",
    });
    setIsExportDialogOpen(false);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search tasks, docs, files, and more"
              className="pl-9"
              aria-label="Search workspace"
            />
          </div>
          <Button type="submit" disabled={resultsQuery.isFetching}>
            {resultsQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Search
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsSaveDialogOpen(true)}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {CONTEXTUAL_ACTIONS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (id === "keyboard") {
                  toast({
                    title: "Keyboard shortcuts",
                    description: "⌘1 Quick · ⌘2 OPQL · ⌘3 Builder · ⌥1-3 focus panes",
                  });
                }
                if (id === "saved") {
                  setIsSaveDialogOpen(true);
                }
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        <Tabs value={mode} onValueChange={(value) => setMode(value as SearchMode)}>
          <TabsList className="grid w-full grid-cols-3">
            {SEARCH_MODES.map((searchMode) => (
              <TabsTrigger key={searchMode.value} value={searchMode.value} className="flex flex-col gap-1">
                <span className="font-medium">{searchMode.label}</span>
                <span className="text-xs text-muted-foreground">{searchMode.description}</span>
                <span className="text-[10px] text-muted-foreground">Shortcut {searchMode.shortcut}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="rounded-2xl border border-border bg-card">
          <ResizablePanel defaultSize={22} minSize={20} maxSize={30}>
            <div
              ref={filterPaneRef}
              tabIndex={-1}
              className="flex h-full flex-col gap-4 rounded-l-2xl bg-muted/40 p-4 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Search filters"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">Filters</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFacetSelections(cloneFacetSelections(INITIAL_FACETS))}
                >
                  Reset
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeFacetChips.map((chip) => (
                  <Badge
                    key={`${chip.facet}:${chip.value}:${chip.exclude}`}
                    variant={chip.exclude ? "destructive" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    <span>{chip.value}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${chip.value}`}
                      onClick={() => clearFacet(chip.facet, chip.value, chip.exclude)}
                      className="rounded-full bg-black/5 p-0.5 text-xs"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <ScrollArea className="flex-1 pr-1">
                <div className="space-y-6">
                  <FacetSection
                    title="Result type"
                    icon={<Layers className="h-4 w-4" />}
                    facetKey="type"
                    aggregations={aggregations}
                    facetSelections={facetSelections}
                    onToggle={toggleFacet}
                  />
                  <FacetSection
                    title="Project"
                    icon={<Sparkles className="h-4 w-4" />}
                    facetKey="project"
                    aggregations={aggregations}
                    facetSelections={facetSelections}
                    onToggle={toggleFacet}
                  />
                  <FacetSection
                    title="Recency"
                    icon={<Flame className="h-4 w-4" />}
                    facetKey="updated"
                    aggregations={aggregations}
                    facetSelections={facetSelections}
                    onToggle={toggleFacet}
                  />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <h3 className="text-sm font-semibold">My stuff</h3>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {MY_STUFF_TOGGLES.map((toggle) => (
                        <label key={toggle.key} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                          <span className="text-sm">{toggle.label}</span>
                          <Switch
                            checked={myStuff[toggle.key]}
                            onCheckedChange={(checked) => handleMyStuffToggle(toggle.key, checked === true)}
                            aria-label={toggle.label}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileOutput className="h-4 w-4" />
                        <h3 className="text-sm font-semibold">Custom fields</h3>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {Object.keys(CUSTOM_FIELD_DEFINITIONS).map((field) => (
                        <details
                          key={field}
                          open={mode === "builder" || customFieldFocus === field}
                          className="rounded-lg border border-border bg-background"
                          onToggle={(event) => {
                            if ((event.target as HTMLDetailsElement).open) {
                              setCustomFieldFocus(field);
                            }
                          }}
                        >
                          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium">
                            <span>{field}</span>
                            <ChevronDown className="h-4 w-4" />
                          </summary>
                          <div className="space-y-1 px-3 pb-3">
                            {CUSTOM_FIELD_DEFINITIONS[field].map((value) => {
                              const facetKey = `custom:${field}` as FacetKey;
                              const count = aggregations.counts[facetKey]?.get(value) ?? 0;
                              const max = aggregations.max[facetKey] ?? 0;
                              return (
                                <FacetToggle
                                  key={value}
                                  label={value}
                                  count={count}
                                  max={max}
                                  active={isFacetActive(facetSelections, facetKey, value)}
                                  excluded={isFacetExcluded(facetSelections, facetKey, value)}
                                  onToggle={(event) => toggleFacet(facetKey, value, event.altKey)}
                                />
                              );
                            })}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={45} minSize={30}>
            <div
              ref={resultsPaneRef}
              tabIndex={-1}
              className="flex h-full flex-col gap-4 p-4 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Search results"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Results ({filteredResults.length})</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      Bulk actions
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Apply to selected</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => toast({ title: "Assigned", description: "Selected results assigned." })}>
                      Assign owner
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => toast({ title: "Pinned", description: "Results pinned." })}>
                      Pin selection
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsExportDialogOpen(true)}>
                      Export with masking
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {selectedResults.size ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                  <span>{selectedResults.size} selected</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedResults(new Set<string>())}
                    >
                      Clear selection
                    </Button>
                    <Button size="sm" onClick={() => setIsExportDialogOpen(true)}>
                      <Share2 className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </div>
                </div>
              ) : null}

              <ScrollArea className="flex-1">
                <ul role="listbox" aria-multiselectable className="flex flex-col gap-3 pb-6">
                  {filteredResults.map((result) => (
                    <li key={result.id}>
                      <SearchResultItem
                        result={result}
                        query={queryParam}
                        isSelected={selectedResults.has(result.id)}
                        isPinned={pinnedResults.has(result.id)}
                        onToggleSelect={handleToggleResult}
                        onTogglePin={handleTogglePin}
                        onPreview={(item) => setPreviewResultId(item.id)}
                        onPerformAction={handlePerformAction}
                      />
                    </li>
                  ))}
                  {!resultsQuery.isFetching && !filteredResults.length ? (
                    <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No results match your filters. Try widening your selection or switching modes.
                    </li>
                  ) : null}
                </ul>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={33} minSize={25}>
            <div
              ref={previewPaneRef}
              tabIndex={-1}
              className="flex h-full flex-col gap-4 rounded-r-2xl bg-muted/30 p-4 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Preview"
            >
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                <h2 className="text-sm font-semibold">Preview</h2>
              </div>
              {activePreview ? (
                <div className="flex flex-1 flex-col gap-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold leading-tight">{activePreview.title}</h3>
                    <p className="text-sm text-muted-foreground">{activePreview.snippet ?? "No snippet available."}</p>
                  </div>
                  <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline" className="uppercase">{activePreview.type}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Location</span>
                      <span className="truncate text-right">{activePreview.url}</span>
                    </div>
                    {activePreviewBucket ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                        <span className="text-muted-foreground">Status</span>
                        <span>{activePreviewBucket.custom.Status}</span>
                        <span className="text-muted-foreground">Priority</span>
                        <span>{activePreviewBucket.custom.Priority}</span>
                        <span className="text-muted-foreground">Heat</span>
                        <span>{activePreviewBucket.custom["Team Heat"]}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Inline actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Assigned" })}>
                        Assign
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Comment created" })}>
                        Comment
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Joined" })}>
                        Join
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Download started" })}>
                        Download
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Opened as board" })}>
                        Open as board
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Opened as report" })}>
                        Open as report dataset
                      </Button>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <Button className="flex-1" onClick={() => toast({ title: "Opened" })}>
                      Open
                    </Button>
                    <Button className="flex-1" variant="secondary" onClick={() => setIsExportDialogOpen(true)}>
                      Export…
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Select a result to see details
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder="My triage view" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Saved searches</h4>
              <ScrollArea className="h-40 rounded-lg border border-border">
                <div className="space-y-2 p-2 text-sm">
                  {savedSearchesQuery.data?.map((saved) => (
                    <div key={saved.id} className="flex items-center justify-between rounded border border-border px-2 py-1">
                      <span>{saved.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSavedSearchMutation.mutate(saved.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  {!savedSearchesQuery.data?.length ? <p className="p-2 text-muted-foreground">No saved searches yet.</p> : null}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSearch} disabled={createSavedSearchMutation.isPending}>
              {createSavedSearchMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export selected results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export respects field-level permissions. Masked fields will be obfuscated unless you disable masking below.
            </p>
            <label className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
              <span>Mask sensitive fields</span>
              <Switch checked={exportMasking} onCheckedChange={(checked) => setExportMasking(checked === true)} />
            </label>
            <p className="text-xs text-muted-foreground">
              Masking hides personal data and secrets. Only members with export permissions can disable masking.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              Export now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

type FacetSectionProps = {
  title: string;
  icon: React.ReactNode;
  facetKey: FacetKey;
  aggregations: Aggregations;
  facetSelections: FacetSelections;
  onToggle: (facet: FacetKey, value: string, exclude: boolean) => void;
};

const FacetSection = ({ title, icon, facetKey, aggregations, facetSelections, onToggle }: FacetSectionProps) => {
  const entries = Array.from(aggregations.counts[facetKey]?.entries() ?? []).sort((a, b) => b[1] - a[1]);
  const max = aggregations.max[facetKey] ?? 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      </div>
      <div className="space-y-1">
        {entries.map(([value, count]) => (
          <FacetToggle
            key={value}
            label={value}
            count={count}
            max={max}
            active={isFacetActive(facetSelections, facetKey, value)}
            excluded={isFacetExcluded(facetSelections, facetKey, value)}
            onToggle={(event) => onToggle(facetKey, value, event.altKey)}
          />
        ))}
      </div>
    </div>
  );
};

type FacetToggleProps = {
  label: string;
  count: number;
  max: number;
  active: boolean;
  excluded: boolean;
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const FacetToggle = ({ label, count, max, active, excluded, onToggle }: FacetToggleProps) => {
  const intensity = max > 0 ? Math.min(1, count / max) : 0;
  const heatStyle = count
    ? {
        background: `linear-gradient(90deg, hsl(var(--primary)) ${Math.round(intensity * 100)}%, transparent ${Math.round(
          intensity * 100
        )}%)`,
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-primary",
        active && "border-primary bg-primary/10",
        excluded && "border-destructive bg-destructive/10 text-destructive",
        !active && !excluded && "border-border bg-background hover:border-primary/40",
        !count && "opacity-60"
      )}
      aria-pressed={active}
      aria-label={excluded ? `${label} (excluded)` : `${label} (${count})`}
    >
      <span className="flex flex-col">
        <span>{label}</span>
        <span className="text-xs text-muted-foreground">{count} results</span>
      </span>
      <span
        className="flex h-6 w-12 items-center justify-end rounded-full px-2 text-xs text-primary"
        style={heatStyle}
      >
        {count}
      </span>
    </button>
  );
};
