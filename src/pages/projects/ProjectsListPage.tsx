import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, ExternalLink, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ProjectStatus,
  ProjectSummary,
  useArchiveProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/useProjects";
import { getProjectStatusLabel, getProjectStatusVariant } from "./status";

import { ProjectFormDialog } from "./ProjectFormDialog";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Archived", value: "archived" },
] as const;

const SORT_OPTIONS = [
  { label: "Updated", value: "updated_at", defaultDir: "desc" as const },
  { label: "Created", value: "created_at", defaultDir: "desc" as const },
  { label: "Name", value: "name", defaultDir: "asc" as const },
];

type StatusFilterValue = (typeof STATUS_OPTIONS)[number]["value"];
type SortField = (typeof SORT_OPTIONS)[number]["value"];
type SortDirection = "asc" | "desc";

type TableAction = "open" | "edit" | "archive" | "restore" | "delete";

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProjectSummary | null>(null);

  useEffect(() => {
    document.title = "Projects | Outpaged";
    return () => {
      document.title = "Outpaged";
    };
  }, []);

  useEffect(() => {
    const urlSearch = searchParams.get("q") ?? "";
    if (urlSearch !== searchInput) {
      setSearchInput(urlSearch);
    }
  }, [searchParams, searchInput]);

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) {
      return;
    }
    const params = new URLSearchParams(searchParams);
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    params.delete("page");
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  const statusParam = (searchParams.get("status") ?? "all") as StatusFilterValue;
  const statusFilter = STATUS_OPTIONS.some((option) => option.value === statusParam)
    ? statusParam
    : "all";

  const sortParam = (searchParams.get("sort") ?? "updated_at") as SortField;
  const sortOption = SORT_OPTIONS.find((option) => option.value === sortParam) ?? SORT_OPTIONS[0];
  const dirParam = (searchParams.get("dir") ?? sortOption.defaultDir) as SortDirection;
  const sortDirection: SortDirection = dirParam === "asc" || dirParam === "desc" ? dirParam : sortOption.defaultDir;

  const pageSizeParam = Number.parseInt(searchParams.get("pageSize") ?? "", 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeParam as (typeof PAGE_SIZE_OPTIONS)[number])
    ? (pageSizeParam as (typeof PAGE_SIZE_OPTIONS)[number])
    : DEFAULT_PAGE_SIZE;

  const pageParam = Number.parseInt(searchParams.get("page") ?? "", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : DEFAULT_PAGE;

  const query = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      status: statusFilter === "all" ? undefined : (statusFilter as Exclude<StatusFilterValue, "all"> as ProjectStatus),
      page,
      pageSize,
      sort: sortOption.value,
      dir: sortDirection,
    }),
    [debouncedSearch, statusFilter, page, pageSize, sortOption.value, sortDirection],
  );

  const {
    data: projects,
    total,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useProjects(query);

  const { mutateAsync: archiveProject, isPending: isArchiving } = useArchiveProject();
  const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProject();
  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject();

  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0;

  useEffect(() => {
    if (!isLoading && pageCount > 0 && page > pageCount) {
      const params = new URLSearchParams(searchParams);
      params.set("page", pageCount.toString());
      setSearchParams(params, { replace: true });
    }
  }, [isLoading, page, pageCount, searchParams, setSearchParams]);

  const handleStatusChange = (value: StatusFilterValue) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const handleSortChange = (value: SortField) => {
    const option = SORT_OPTIONS.find((item) => item.value === value) ?? SORT_OPTIONS[0];
    const params = new URLSearchParams(searchParams);
    params.set("sort", option.value);
    params.set("dir", option.defaultDir);
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const toggleSortDirection = () => {
    const params = new URLSearchParams(searchParams);
    params.set("dir", sortDirection === "asc" ? "desc" : "asc");
    params.delete("page");
    setSearchParams(params, { replace: true });
  };

  const handlePageSizeChange = (value: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("pageSize", value.toString());
    params.set("page", DEFAULT_PAGE.toString());
    setSearchParams(params, { replace: true });
  };

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", nextPage.toString());
    setSearchParams(params, { replace: true });
  };

  const openDialog = (mode: "create" | "edit", project?: ProjectSummary) => {
    setDialogMode(mode);
    setSelectedProject(project ?? null);
    setDialogOpen(true);
  };

  const handleProjectAction = async (action: TableAction, project: ProjectSummary) => {
    try {
      switch (action) {
        case "open":
          navigate(`/projects/${project.id}`);
          break;
        case "edit":
          openDialog("edit", project);
          break;
        case "archive":
          await archiveProject({ id: project.id });
          toast({ title: "Project archived" });
          refetch();
          break;
        case "restore":
          await updateProject({ id: project.id, patch: { status: "active" as ProjectStatus } });
          toast({ title: "Project restored" });
          refetch();
          break;
        case "delete":
          setPendingDelete(project);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProject({ id: pendingDelete.id });
      toast({ title: "Project deleted" });
      setPendingDelete(null);
      refetch();
    } catch (err) {
      console.error(err);
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const isMutating = isArchiving || isUpdating || isDeleting;

  const handleDialogSuccess = (projectId: string) => {
    refetch();
    navigate(`/projects/${projectId}`);
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-72" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-32" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-6 w-20 rounded-full" />
        </TableCell>
        <TableCell className="w-[80px] text-right">
          <Skeleton className="ml-auto h-8 w-8 rounded-full" />
        </TableCell>
      </TableRow>
    ));

  const projectsEmpty = !isLoading && projects.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Search and manage all workspace projects.</p>
        </div>
        <Button onClick={() => openDialog("create")}>
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: StatusFilterValue) => handleStatusChange(value)}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Select value={sortOption.value} onValueChange={(value: SortField) => handleSortChange(value)}>
            <SelectTrigger aria-label="Sort projects">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={toggleSortDirection} aria-label="Toggle sort direction">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {isFetching ? "Refreshing projects..." : `Showing ${projects.length} of ${total} projects`}
        </p>
        <Select value={String(pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
          <SelectTrigger className="w-[140px]" aria-label="Items per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load projects</AlertTitle>
          <AlertDescription>
            {(error as Error | undefined)?.message ?? "Please try again."}
            <Button variant="link" className="ml-2 px-0" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && renderSkeletonRows()}
          {!isLoading &&
            projects.map((project) => (
              <TableRow key={project.id} className="cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{project.name}</span>
                    <span className="text-xs text-muted-foreground">{project.id}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-lg">
                  <p className="truncate text-muted-foreground">{project.description || "No description"}</p>
                </TableCell>
                <TableCell>
                  {project.updated_at
                    ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
                    : "–"}
                </TableCell>
                <TableCell>
                  <Badge variant={getProjectStatusVariant(project.status)}>
                    {getProjectStatusLabel(project.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Project actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleProjectAction("open", project)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleProjectAction("edit", project)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {project.status === "archived" ? (
                        <DropdownMenuItem onClick={() => handleProjectAction("restore", project)}>
                          <ArrowUpDown className="mr-2 h-4 w-4 rotate-90" />
                          Restore
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleProjectAction("archive", project)}>
                          <ArrowUpDown className="mr-2 h-4 w-4 rotate-90" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleProjectAction("delete", project)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          {projectsEmpty && (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                No projects found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (page > 1) {
                    handlePageChange(page - 1);
                  }
                }}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    onClick={(event) => {
                      event.preventDefault();
                      handlePageChange(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page === pageCount}
                className={page === pageCount ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  if (page < pageCount) {
                    handlePageChange(page + 1);
                  }
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <ProjectFormDialog
        open={dialogOpen}
        mode={dialogMode}
        project={selectedProject}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {pendingDelete && (
        <Alert variant="destructive" className="flex items-center justify-between">
          <div>
            <AlertTitle>Delete project?</AlertTitle>
            <AlertDescription>
              This cannot be undone. {pendingDelete.name} will be removed permanently.
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isMutating}>
              Delete
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}

