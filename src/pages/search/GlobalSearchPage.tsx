import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchResultItem } from "./SearchResultItem";
import { Loader2, Search as SearchIcon, Trash2 } from "lucide-react";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  type SavedSearch,
} from "@/services/savedSearches";
import { useToast } from "@/hooks/use-toast";

const TYPE_FILTERS: Array<{ value: "all" | SearchResult["type"]; label: string }> = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "project", label: "Projects" },
  { value: "doc", label: "Docs" },
  { value: "file", label: "Files" },
  { value: "comment", label: "Comments" },
  { value: "person", label: "People" },
];

const DEFAULT_LIMIT = 20;

type ProjectOption = {
  id: string;
  name: string;
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
  const typeParam = searchParams.get("type");
  const [inputValue, setInputValue] = useState(queryParam);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const activeType: "all" | SearchResult["type"] = TYPE_FILTERS.some(
    (filter) => filter.value === typeParam
  )
    ? (typeParam as SearchResult["type"] | "all")
    : "all";

  const [selectedType, setSelectedType] = useState<
    "all" | SearchResult["type"]
  >(activeType);
  const [selectedProject, setSelectedProject] = useState(projectFilter);

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setSelectedType(activeType);
  }, [activeType]);

  useEffect(() => {
    setSelectedProject(projectFilter);
  }, [projectFilter]);

  useEffect(() => {
    setLimit(DEFAULT_LIMIT);
  }, [queryParam, selectedProject, selectedType]);

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
      selectedType,
      selectedProject,
      limit,
    ],
    queryFn: () =>
      searchAll({
        q: queryParam,
        projectId:
          selectedProject !== "all" ? selectedProject : undefined,
        limit,
        types: selectedType === "all" ? undefined : [selectedType],
        includeComments:
          selectedType === "all" || selectedType === "comment",
      }),
    enabled: searchEnabled,
    staleTime: 0,
  });

  const counts = useMemo(() => {
    const map = new Map<SearchResult["type"], number>();
    (resultsQuery.data ?? []).forEach((result) => {
      map.set(result.type, (map.get(result.type) ?? 0) + 1);
    });
    return map;
  }, [resultsQuery.data]);

  const groupedResults = useMemo(() => {
    if (!resultsQuery.data) {
      return [] as Array<[SearchResult["type"], SearchResult[]]>;
    }
    const groups = new Map<SearchResult["type"], SearchResult[]>();
    resultsQuery.data.forEach((item) => {
      if (selectedType !== "all" && item.type !== selectedType) {
        return;
      }
      const existing = groups.get(item.type) ?? [];
      existing.push(item);
      groups.set(item.type, existing);
    });
    return TYPE_FILTERS.filter((filter) => filter.value !== "all")
      .map((filter) => [filter.value, groups.get(filter.value) ?? []] as [
        SearchResult["type"],
        SearchResult[]
      ])
      .filter(([, items]) => items.length > 0);
  }, [resultsQuery.data, selectedType]);

  const totalResults = resultsQuery.data?.length ?? 0;
  const showLoadMore = resultsQuery.data
    ? resultsQuery.data.length >= limit
    : false;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const trimmed = inputValue.trim();
    if (trimmed) {
      next.set("q", trimmed);
    } else {
      next.delete("q");
    }
    setLimit(DEFAULT_LIMIT);
    setSearchParams(next);
    queryClient.invalidateQueries({ queryKey: ["global-search"] });
  };

  const handleTypeChange = (value: string) => {
    if (value === selectedType) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (value === "all") {
      next.delete("type");
    } else {
      next.set("type", value);
    }
    setLimit(DEFAULT_LIMIT);
    setSelectedType(value as "all" | SearchResult["type"]);
    setSearchParams(next);
    queryClient.invalidateQueries({ queryKey: ["global-search"] });
  };

  const handleProjectChange = (value: string) => {
    if (value === selectedProject) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (value === "all") {
      next.delete("projectId");
    } else {
      next.set("projectId", value);
    }
    setLimit(DEFAULT_LIMIT);
    setSelectedProject(value);
    setSearchParams(next);
    queryClient.invalidateQueries({ queryKey: ["global-search"] });
  };

  const handleOpenSaveDialog = () => {
    setSaveName(queryParam.trim() || "");
    setIsSaveDialogOpen(true);
  };

  const handleSaveSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = queryParam.trim();
    const trimmedName = saveName.trim();
    if (!trimmedQuery || !trimmedName) {
      return;
    }
    const filters: Record<string, unknown> = {};
    if (selectedType !== "all") {
      filters.type = selectedType;
    }
    if (selectedProject !== "all") {
      filters.projectId = selectedProject;
    }
    createSavedSearchMutation.mutate({
      name: trimmedName,
      query: trimmedQuery,
      filters,
    });
  };

  const applySavedSearch = (saved: SavedSearch) => {
    const next = new URLSearchParams();
    next.set("q", saved.query);
    const filters = (saved.filters ?? {}) as {
      type?: string | null;
      projectId?: string | null;
    };
    const typeValue =
      filters.type && filters.type !== "all"
        ? (String(filters.type) as SearchResult["type"] | "all")
        : "all";
    if (typeValue !== "all") {
      next.set("type", typeValue);
    }
    const projectValue =
      filters.projectId && String(filters.projectId).trim().length > 0
        ? String(filters.projectId)
        : "all";
    if (projectValue !== "all") {
      next.set("projectId", projectValue);
    }
    setSelectedType(typeValue);
    setSelectedProject(projectValue);
    setLimit(DEFAULT_LIMIT);
    setSearchParams(next);
    queryClient.invalidateQueries({ queryKey: ["global-search"] });
  };

  const handleDeleteSavedSearch = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deleteSavedSearchMutation.mutate(id);
  };

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Search</h1>
          <p className="text-sm text-muted-foreground">
            Find tasks, projects, docs, files, comments, and teammates.
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-xl items-center gap-2"
        >
          <div className="relative w-full">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Search across work"
              className="pl-10"
              aria-label="Global search"
            />
          </div>
          <Button type="submit">Search</Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenSaveDialog}
            disabled={
              !searchEnabled ||
              createSavedSearchMutation.isPending ||
              !supabaseConfigured
            }
          >
            Save search
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={selectedType}
          onValueChange={handleTypeChange}
          className="w-full md:w-auto"
        >
          <TabsList className="flex flex-wrap justify-start">
            {TYPE_FILTERS.map((filter) => (
              <TabsTrigger
                key={filter.value}
                value={filter.value}
                className="gap-1"
                onClick={() => handleTypeChange(filter.value)}
              >
                {filter.label}
                {filter.value !== "all" ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {counts.get(filter.value as SearchResult["type"]) ?? 0}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={selectedProject} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {(projectsQuery.data ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Result summary</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {TYPE_FILTERS.filter((filter) => filter.value !== "all").map((filter) => (
                <li key={filter.value} className="flex items-center justify-between">
                  <span>{filter.label}</span>
                  <span>{counts.get(filter.value as SearchResult["type"]) ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Saved searches</h2>
            {!supabaseConfigured ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Connect Supabase to save searches.
              </p>
            ) : savedSearchesQuery.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading saved searches...</p>
            ) : savedSearchesQuery.data?.length ? (
              <ul className="mt-3 space-y-2">
                {savedSearchesQuery.data.map((saved) => (
                  <li
                    key={saved.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-transparent px-3 py-2 hover:border-border hover:bg-muted/60"
                  >
                    <button
                      type="button"
                      className="flex flex-1 flex-col items-start gap-1 text-left"
                      onClick={() => applySavedSearch(saved)}
                    >
                      <span className="text-sm font-medium">{saved.name}</span>
                      <span className="w-full truncate text-xs text-muted-foreground">{saved.query}</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(event) => handleDeleteSavedSearch(saved.id, event)}
                      disabled={deleteSavedSearchMutation.isPending}
                      aria-label="Delete saved search"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No saved searches yet.</p>
            )}
          </div>
        </aside>

        <main className="space-y-6">
          {!searchEnabled ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Start typing to search your workspace.
            </div>
          ) : resultsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Searching...
            </div>
          ) : resultsQuery.isError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {(resultsQuery.error as Error)?.message ?? "Search failed."}
            </div>
          ) : totalResults === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No results yet. Try refining your keywords or filters.
            </div>
          ) : (
            groupedResults.map(([type, items]) => (
              <section key={type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {TYPE_FILTERS.find((filter) => filter.value === type)?.label ?? type}
                  </h2>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <SearchResultItem key={`${item.type}-${item.id}`} result={item} query={queryParam} />
                  ))}
                </ul>
              </section>
            ))
          )}

          {showLoadMore && searchEnabled ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setLimit((value) => value + DEFAULT_LIMIT)}>
                Load more
              </Button>
            </div>
          ) : null}
        </main>
      </div>
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveSearch}>
            <Input
              value={saveName}
              onChange={(event) => setSaveName(event.target.value)}
              placeholder="Search name"
              autoFocus
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createSavedSearchMutation.isPending ||
                  !saveName.trim() ||
                  !queryParam.trim()
                }
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalSearchPage;
