codex/implement-integrations-with-google-and-github
import { ReactNode, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TabBar } from "@/components/common/TabBar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

export type ProjectSummary = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  project_key?: string | null;
  owner_id?: string | null;
  created_at?: string | null;
  owner?: { full_name?: string | null } | null;
};

type ProjectPageTemplateChildren = ReactNode | ((args: {
  projectId: string;
  project: ProjectSummary | null;
  isLoading: boolean;
}) => ReactNode);
import { ReactNode } from "react";
codex/implement-global-search-and-command-k-palette
import TabBar from "@/components/common/TabBar";
import { TabBar } from "@/components/common/TabBar";
import { useProjectId } from "@/hooks/useProjectId";

interface ProjectPageTemplateProps {
  title: string;
  description: string;
codex/implement-integrations-with-google-and-github
  children?: ProjectPageTemplateChildren;
  children?: ReactNode;
  headerExtras?: ReactNode;
}
export function ProjectPageTemplate({
  title,
  description,
  children,
  headerExtras,
}: ProjectPageTemplateProps) {
  const projectId = useProjectId();

  const openCommandPalette = () => {
    if (!projectId) return;
    document.dispatchEvent(
      new CustomEvent("open-command-palette", { detail: { projectId } })
    );
  };
export function ProjectPageTemplate({ title, description, children }: ProjectPageTemplateProps) {
codex/implement-integrations-with-google-and-github
  const { projectId = "" } = useParams();

  const {
    data: project,
    isLoading,
    error,
  } = useQuery<ProjectSummary | null>({
    queryKey: ["project", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error: queryError } = await supabase
        .from("projects")
        .select(
          `id, name, code, description, status, start_date, end_date, project_key, owner_id, created_at,
           owner:profiles!projects_owner_id_fkey ( full_name )`
        )
        .eq("id", projectId)
        .maybeSingle();

      if (queryError) {
        throw queryError;
      }

      return (data as ProjectSummary | null) ?? null;
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    const projectName = project?.name ?? "Project";
    document.title = `${projectName} • ${title}`;
  }, [project?.name, title]);

  const renderedChildren = useMemo(() => {
    if (typeof children === "function") {
      return children({ projectId, project: project ?? null, isLoading });
    }
    return children ?? null;
  }, [children, project, projectId, isLoading]);

  const showLoadingFallback = isLoading && !renderedChildren;
  const showEmptyFallback = !isLoading && !renderedChildren;
  const projectNotFound = !isLoading && !project && !error && Boolean(projectId);

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {projectId ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/projects/${projectId}/overview`}>
                      {project?.name ?? "Project"}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : null}
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              {isLoading ? (
                <Skeleton className="h-8 w-48" />
              ) : (
                <h1 className="text-3xl font-semibold tracking-tight">{project?.name ?? "Project"}</h1>
              )}
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">View: {title}</Badge>
              {project?.code ? <Badge variant="outline">Code: {project.code}</Badge> : null}
            </div>
          </div>
          {projectId ? (
            <p className="text-xs text-muted-foreground">Project ID: {projectId}</p>
          ) : null}
        </header>
      </div>

      <TabBar />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load project</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="rounded-lg border bg-background p-6 shadow-sm">
        {showLoadingFallback ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : showEmptyFallback ? (
          <p className="text-sm text-muted-foreground">Content for this view is coming soon.</p>
        ) : projectNotFound ? (
          <Alert>
            <AlertTitle>Project not found</AlertTitle>
            <AlertDescription>Check the URL or choose a different project.</AlertDescription>
          </Alert>
        ) : (
          renderedChildren
        )}
  const projectId = useProjectId()

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Project reference: {projectId ?? "Unknown"}</span>
          {projectId ? (
            <button
              type="button"
              onClick={openCommandPalette}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Search in project"
              aria-label="Search in project"
            >
              Search in project
            </button>
          ) : null}
          {headerExtras}
        </div>
      </header>

      <TabBar />

      <div className="rounded-lg border bg-background p-6 text-muted-foreground">
        {children ?? "Content for this view is coming soon."}
      </div>
    </section>
  );
}
