import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";

import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import {
  ProjectSort,
  ProjectStatus,
  SortDirection,
  useArchiveProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

interface UrlState {
  q: string;
  status: ProjectStatus | "all";
  sort: ProjectSort;
  dir: SortDirection;
  page: number;
  pageSize: number;
}

const statusOptions: Array<{ value: UrlState["status"]; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const sortOptions: Array<{ value: ProjectSort; label: string }> = [
  { value: "updated_at", label: "Updated" },
  { value: "created_at", label: "Created" },
  { value: "name", label: "Name" },
];

const pageSizeOptions = [10, 20, 50];

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  archived: "Archived",
};

const getStatusVariant = (status: ProjectStatus) => {
  return status === "archived" ? "secondary" : "default";
};

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

  const isDialogOpen = searchParams.get("new") === "1";
  const setDialogOpen = useCallback(
    (open: boolean) => {
      const next = new URLSearchParams(searchParams);
      if (open) {
        next.set("new", "1");
      } else {
        next.delete("new");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const urlState = useMemo<UrlState>(() => {
    const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const rawPageSize = Number.parseInt(searchParams.get("pageSize") ?? "20", 10);
    const statusParam = (searchParams.get("status") ?? "all") as UrlState["status"];
    const sortParam = (searchParams.get("sort") ?? "updated_at") as ProjectSort;
    const dirParam = (searchParams.get("dir") ?? "desc") as SortDirection;

    return {
      q: searchParams.get("q") ?? "",
      status: statusOptions.some(option => option.value === statusParam) ? statusParam : "all",
      sort: sortOptions.some(option => option.value === sortParam) ? sortParam : "updated_at",
      dir: dirParam === "asc" ? "asc" : "desc",
      page: Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage,
      pageSize: Number.isNaN(rawPageSize) ? 20 : Math.min(Math.max(rawPageSize, 5), 100),
    };
  }, [searchParams]);

  useEffect(() => {
      setSearchValue(urlState.q);
    }, [urlState.q]);

  const applyParams = useCallback(
    (patch: Partial<UrlState>, options: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams);

      if (options.resetPage) {
        next.set("page", "1");
      }

      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          next.delete(key);
          return;
        }

        if (key === "status" && value === "all") {
          next.delete(key);
          return;
        }

        next.set(key, String(value));
      });

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const trimmed = searchValue.trim();
    if (trimmed === urlState.q) {
      return;
    }

    const handle = setTimeout(() => {
      applyParams({ q: trimmed || undefined }, { resetPage: true });
    }, 300);

    return () => clearTimeout(handle);
  }, [applyParams, searchValue, urlState.q]);

  const queryInput = useMemo(
    () => ({
      q: urlState.q,
      status: urlState.status,
      page: urlState.page,
      pageSize: urlState.pageSize,
      sort: urlState.sort,
      dir: urlState.dir,
    }),
    [urlState],
  );

  const { data, isLoading, isError, error, refetch } = useProjects(queryInput);
  const projects = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / urlState.pageSize));
  const hasResults = total > 0;
  const startIndex = hasResults ? (urlState.page - 1) * urlState.pageSize + 1 : 0;
  const endIndex = hasResults ? startIndex + Math.max(projects.length - 1, 0) : 0;

  useEffect(() => {
    if (isLoading || isError) {
      return;
    }

    if (total === 0 && urlState.page !== 1) {
      applyParams({ page: 1 });
      return;
    }

    if (urlState.page > pageCount) {
      applyParams({ page: pageCount });
    }
  }, [applyParams, isError, isLoading, pageCount, total, urlState.page]);

  const archiveMutation = useArchiveProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const handleOpenProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleArchive = async (projectId: string) => {
    try {
      await archiveMutation.mutateAsync({ id: projectId });
      toast({ title: "Project archived" });
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Could not archive",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnarchive = async (projectId: string) => {
    try {
      await updateMutation.mutateAsync({ id: projectId, patch: { status: "active" } });
      toast({ title: "Project restored" });
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Could not restore",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteMutation.mutateAsync({ id: projectId });
      toast({ title: "Project deleted" });
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Could not delete",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateSuccess = (projectId: string) => {
    setDialogOpen(false);
    navigate(`/projects/${projectId}`);
  };

  const isMutating =
    archiveMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const filters: string[] = [];
  if (urlState.status !== "all") {
    const statusLabel = statusOptions.find(option => option.value === urlState.status)?.label;
    if (statusLabel) {
      filters.push(statusLabel);
    }
  }
  if (urlState.q) {
    filters.push(`"${urlState.q}"`);
  }

  const pageTitle = filters.length > 0 ? `Projects - ${filters.join(" / ")}` : "Projects";

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Projects</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              Search, filter, and manage every project.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={event => setSearchValue(event.target.value)}
              placeholder="Search projects"
              className="pl-9"
            />
          </div>
          <Select
            value={urlState.status}
            onValueChange={value => applyParams({ status: value as UrlState["status"] }, { resetPage: true })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={urlState.sort}
            onValueChange={value => applyParams({ sort: value as ProjectSort })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => applyParams({ dir: urlState.dir === "asc" ? "desc" : "asc" })}
            aria-label="Toggle sort direction"
          >
            <ArrowUpDown className={`h-4 w-4 ${urlState.dir === "asc" ? "rotate-180" : ""}`} />
          </Button>
          <Select
            value={String(urlState.pageSize)}
            onValueChange={value => applyParams({ pageSize: Number(value) }, { resetPage: true })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Page size" />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(option => (
                <SelectItem key={option} value={String(option)}>
                  {option} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>We hit a snag</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {error instanceof Error ? error.message : "Projects could not load. Try again."}
            </span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[16%]">Updated</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No projects found. Adjust your filters or create a new one.
                </TableCell>
              </TableRow>
            ) : (
              projects.map(project => (
                <TableRow key={project.id} className="cursor-pointer" onClick={() => handleOpenProject(project.id)}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{project.name}</span>
                      {project.description ? (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {project.description}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || "No description yet."}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(project.status)}>
                      {statusLabels[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={event => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onSelect={() => handleOpenProject(project.id)}>
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => navigate(`/projects/${project.id}/settings`)}>
                          Edit
                        </DropdownMenuItem>
                        {project.status === "archived" ? (
                          <DropdownMenuItem
                            disabled={isMutating}
                            onSelect={() => handleUnarchive(project.id)}
                          >
                            Unarchive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            disabled={isMutating}
                            onSelect={() => handleArchive(project.id)}
                          >
                            Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={isMutating}
                          className="text-destructive focus:text-destructive"
                          onSelect={() => handleDelete(project.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        {hasResults ? (
          <p className="text-sm text-muted-foreground">
            {`Showing ${startIndex}-${endIndex} of ${total} projects`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No projects to display</p>
        )}
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={event => {
                  event.preventDefault();
                  if (urlState.page > 1) {
                    applyParams({ page: urlState.page - 1 });
                  }
                }}
                className={urlState.page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                {urlState.page}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={event => {
                  event.preventDefault();
                  if (urlState.page < pageCount) {
                    applyParams({ page: urlState.page + 1 });
                  }
                }}
                className={urlState.page >= pageCount ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <NewProjectDialog
        open={isDialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
