import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DocTree } from "@/components/docs/DocTree";
import { useDoc, useDocsList } from "@/hooks/useDocs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectSummary } from "@/hooks/useProjectOptions";

export default function ProjectDocsHome() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const project = useProjectSummary(projectId);
  const selectedId = searchParams.get("docId");

  const docsQuery = useDocsList({ projectId: projectId ?? undefined, q: search });
  const docQuery = useDoc(selectedId ?? undefined);

  const docs = docsQuery.data ?? [];
  const selectedDoc = docQuery.data ?? null;
  const previewHtml = useMemo(() => {
    if (!selectedDoc) return "";
    const parsed = marked.parse(selectedDoc.body_markdown ?? "");
    return DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
  }, [selectedDoc]);

  const projectName = project.data?.name ?? projectId ?? "Project";
  useDocumentTitle(`Projects / ${projectName} / Docs`);

  const handleSelect = (docId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("docId", docId);
      return next;
    });
  };

  const handleCreate = () => {
    if (!projectId) return;
    navigate(`/projects/${projectId}/docs/new`);
  };

  if (!projectId) {
    return (
      <section className="p-6">
        <p className="text-sm text-muted-foreground">Project not specified.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/projects">Projects</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}`}>{projectName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Docs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold tracking-tight">Docs for {projectName}</h1>
          <p className="text-sm text-muted-foreground">Centralize project briefs, decisions, and notes.</p>
        </div>
        <Button onClick={handleCreate}>New doc</Button>
      </div>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search project docs"
        className="max-w-sm"
      />

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Outline</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[520px] overflow-y-auto">
            {docsQuery.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-6" />
                ))}
              </div>
            ) : (
              <DocTree
                docs={docs}
                selectedId={selectedId}
                onSelect={handleSelect}
                emptyState={<div className="text-sm text-muted-foreground">No docs yet.</div>}
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{selectedDoc?.title ?? "Select a doc"}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {selectedDoc
                  ? `Last updated ${new Date(selectedDoc.updated_at).toLocaleString()}`
                  : "Choose a page to preview."}
              </p>
            </div>
            {selectedDoc ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/projects/${projectId}/docs/${selectedDoc.id}`}>Open</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            {docQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : selectedDoc ? (
              selectedDoc.body_markdown ? (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <p className="text-sm text-muted-foreground">No content yet.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Choose a doc from the outline to see details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
