import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { DocToolbar } from "@/components/docs/DocToolbar";
import { VersionHistory } from "@/components/docs/VersionHistory";
import {
  useCreateDocVersion,
  useDeleteDoc,
  useDoc,
  useDocVersions,
  useRestoreDocVersion,
  useUpdateDoc,
} from "@/hooks/useDocs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectSummary } from "@/hooks/useProjectOptions";
import { listDocs } from "@/services/docs";

export default function ProjectDocDetail() {
  const params = useParams<{ projectId: string; docId: string }>();
  const projectIdParam = params.projectId;
  const docIdParam = params.docId;
  const docId = docIdParam ?? "";
  const navigate = useNavigate();
  const [showVersions, setShowVersions] = useState(false);
  const [restoringVersionNumber, setRestoringVersionNumber] = useState<number | null>(null);

  const project = useProjectSummary(projectIdParam);
  const docQuery = useDoc(docIdParam ?? undefined);
  const deleteDoc = useDeleteDoc();
  const updateDoc = useUpdateDoc(docId);
  const createVersion = useCreateDocVersion(docId);
  const restoreVersion = useRestoreDocVersion(docId);
  const versionsQuery = useDocVersions(showVersions && docIdParam ? docIdParam : undefined);

  const projectName = project.data?.name ?? projectIdParam ?? "Project";
  useDocumentTitle(
    docQuery.data ? `Projects / ${projectName} / Docs / ${docQuery.data.title}` : `Projects / ${projectName} / Docs`
  );

  const doc = docQuery.data ?? null;
  const previewHtml = useMemo(() => {
    if (!doc) return "";
    return DOMPurify.sanitize(marked.parse(doc.body_markdown ?? ""));
  }, [doc]);

  const handleDelete = async () => {
    if (!doc || !docIdParam || !projectIdParam) return;

    try {
      const children = await listDocs({ projectId: projectIdParam, parentId: doc.id });
      if (children.length > 0) {
        window.alert("This doc has child pages. Move or delete them before removing this doc.");
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify child docs.";
      window.alert(message);
      return;
    }

    if (!window.confirm("Delete this doc?")) {
      return;
    }

    try {
      await deleteDoc.mutateAsync(docIdParam);
      navigate(`/projects/${projectIdParam}/docs`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete the doc.";
      window.alert(message);
    }
  };

  const handleTogglePublish = async (next: boolean) => {
    if (!docIdParam) return;
    try {
      await updateDoc.mutateAsync({ is_published: next });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update publish state.";
      window.alert(message);
    }
  };

  const handleSnapshot = async () => {
    if (!docIdParam) return;
    try {
      await createVersion.mutateAsync();
      setShowVersions(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create version.";
      window.alert(message);
    }
  };

  if (docQuery.isLoading) {
    return (
      <section className="space-y-4 p-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (docQuery.isError) {
    const message = docQuery.error instanceof Error ? docQuery.error.message : "Unable to load the doc.";
    return (
      <section className="p-6">
        <p className="text-sm text-destructive">{message}</p>
      </section>
    );
  }

  if (!doc || !docIdParam || !projectIdParam) {
    return (
      <section className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Doc not found.</p>
        <Button variant="link" onClick={() => navigate(`/projects/${projectIdParam ?? ""}/docs`)}>
          Back to docs
        </Button>
      </section>
    );
  }

  const handleRestore = async (versionNumber: number) => {
    if (!docIdParam) return;
    try {
      setRestoringVersionNumber(versionNumber);
      await restoreVersion.mutateAsync(versionNumber);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore version.";
      window.alert(message);
    } finally {
      setRestoringVersionNumber(null);
    }
  };

  return (
    <section className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectIdParam}`}>{projectName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectIdParam}/docs`}>Docs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>{doc.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader className="space-y-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl">{doc.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Updated {new Date(doc.updated_at).toLocaleString()}
            </p>
          </div>
          <DocToolbar
            doc={doc}
            onEdit={() => navigate(`/projects/${projectIdParam}/docs/${doc.id}/edit`)}
            onCreateChild={() => navigate(`/projects/${projectIdParam}/docs/new?parentId=${doc.id}`)}
            onShowVersions={() => setShowVersions((value) => !value)}
            onDelete={handleDelete}
            onTogglePublish={handleTogglePublish}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSnapshot} disabled={createVersion.isPending}>
              {createVersion.isPending ? "Saving" : "Save version"}
            </Button>
            {showVersions ? (
              <span className="text-xs text-muted-foreground">Showing history</span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="prose max-w-none">
          {doc.body_markdown ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="text-sm text-muted-foreground">No content yet.</p>
          )}
        </CardContent>
      </Card>

      {showVersions ? (
        <Card>
          <CardHeader>
            <CardTitle>Version history</CardTitle>
          </CardHeader>
          <CardContent>
            {versionsQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : versionsQuery.isError ? (
              <p className="text-sm text-destructive">Unable to load versions.</p>
            ) : (
              <VersionHistory
                versions={versionsQuery.data ?? []}
                onRestore={handleRestore}
                isRestoring={restoreVersion.isPending}
                restoringVersion={restoringVersionNumber}
              />
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
