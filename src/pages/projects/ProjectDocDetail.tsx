import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocToolbar } from "@/components/docs/DocToolbar";
import { VersionHistory } from "@/components/docs/VersionHistory";
import { renderMarkdown } from "@/components/docs/MarkdownEditor";
import { useDoc, useDocs, useDeleteDoc, useUpdateDoc, useDocVersions } from "@/hooks/useDocs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createDocVersionFromCurrent } from "@/services/docs";
import { useProjectMeta } from "@/hooks/useProjectMeta";

export default function ProjectDocDetail() {
  const { projectId, docId } = useParams<{ projectId: string; docId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVersionsOpen, setVersionsOpen] = useState(false);
  const [isMoveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string>("none");

  const docQuery = useDoc(docId);
  const docsQuery = useDocs({ projectId });
  const deleteDoc = useDeleteDoc();
  const updateDoc = useUpdateDoc();
  const versionsQuery = useDocVersions(isVersionsOpen ? docId : undefined);

  const projectMeta = useProjectMeta(projectId);

  useEffect(() => {
    const projectLabel = projectMeta.data?.name ?? projectId ?? "Project";
    if (docQuery.data?.title) {
      document.title = `Projects / ${projectLabel} / Docs / ${docQuery.data.title}`;
    } else {
      document.title = `Projects / ${projectLabel} / Docs`;
    }
  }, [docQuery.data?.title, projectMeta.data?.name, projectId]);

  const docMatchesProject = docQuery.data?.project_id === projectId;

  const hasChildren = useMemo(() => {
    if (!docQuery.data || !docsQuery.data) {
      return false;
    }
    return docsQuery.data.some((doc) => doc.parent_id === docQuery.data!.id);
  }, [docQuery.data, docsQuery.data]);

  const descendantIds = useMemo(() => {
    if (!docQuery.data || !docsQuery.data) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    const walk = (id: string) => {
      docsQuery.data
        ?.filter((doc) => doc.parent_id === id)
        .forEach((child) => {
          if (!ids.has(child.id)) {
            ids.add(child.id);
            walk(child.id);
          }
        });
    };
    walk(docQuery.data.id);
    return ids;
  }, [docQuery.data, docsQuery.data]);

  const parentOptions = useMemo(() => {
    if (!docsQuery.data || !docQuery.data) {
      return [];
    }
    return docsQuery.data.filter(
      (doc) => doc.id !== docQuery.data!.id && !descendantIds.has(doc.id)
    );
  }, [docsQuery.data, docQuery.data, descendantIds]);

  const handleDelete = async () => {
    if (!docQuery.data || !docId) {
      return;
    }
    if (hasChildren) {
      toast({
        title: "Cannot delete",
        description: "Move or delete child pages before removing this doc.",
        variant: "destructive",
      });
      return;
    }
    const confirmed = window.confirm("Delete this doc?");
    if (!confirmed) {
      return;
    }
    try {
      await deleteDoc.mutateAsync(docId);
      toast({ title: "Doc deleted" });
      navigate(`/projects/${projectId}/docs`);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Delete failed", description: error?.message ?? "Could not delete doc", variant: "destructive" });
    }
  };

  const handleTogglePublish = async (value: boolean) => {
    if (!docId) {
      return;
    }
    try {
      await updateDoc.mutateAsync({ id: docId, patch: { is_published: value } });
      toast({ title: value ? "Doc published" : "Doc hidden" });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Update failed", description: error?.message ?? "Could not update doc", variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    if (!projectId || !docId) {
      return;
    }
    const url = `${window.location.origin}/projects/${projectId}/docs/${docId}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  };

  const handleMove = async () => {
    if (!docId) {
      return;
    }
    const parent_id = moveTarget === "none" ? null : moveTarget;
    if (parent_id && descendantIds.has(parent_id)) {
      toast({
        title: "Invalid move",
        description: "Choose a parent outside of this doc's subtree.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateDoc.mutateAsync({ id: docId, patch: { parent_id } });
      toast({ title: "Doc moved" });
      setMoveOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Move failed", description: error?.message ?? "Could not move doc", variant: "destructive" });
    }
  };

  const handleRestore = async (version: number) => {
    if (!docId || !docQuery.data) {
      return;
    }
    try {
      const { data, error } = await supabase
        .from("doc_versions")
        .select("title, body_markdown")
        .eq("doc_id", docId)
        .eq("version", version)
        .maybeSingle();
      if (error || !data) {
        throw error ?? new Error("Version not found");
      }
      await createDocVersionFromCurrent(docId);
      await updateDoc.mutateAsync({
        id: docId,
        patch: {
          title: data.title,
          body_markdown: data.body_markdown ?? "",
          version: docQuery.data.version + 1,
        },
      });
      toast({ title: "Version restored" });
      setVersionsOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Restore failed", description: error?.message ?? "Could not restore version", variant: "destructive" });
    }
  };

  if (docQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading doc...</div>;
  }

  if (docQuery.isError || !docMatchesProject) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>We could not load this doc</AlertTitle>
          <AlertDescription>
            {docQuery.error instanceof Error && docQuery.error.message.includes("permission")
              ? "You do not have access."
              : "Try reloading the page."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!docQuery.data) {
    return <div className="p-6 text-sm text-muted-foreground">Doc not found.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{docQuery.data.title}</h1>
          <p className="text-sm text-muted-foreground">Version {docQuery.data.version}</p>
        </div>
        <Button onClick={() => navigate(`/projects/${projectId}/docs/${docId}/edit`)}>Edit</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <DocToolbar
              doc={docQuery.data}
              onCreate={() => navigate(`/projects/${projectId}/docs/new?parent=${docQuery.data.id}`)}
              onEdit={() => navigate(`/projects/${projectId}/docs/${docId}/edit`)}
              onDelete={handleDelete}
              onMove={() => {
                setMoveTarget(docQuery.data?.parent_id ?? "none");
                setMoveOpen(true);
              }}
              onShowVersions={() => setVersionsOpen(true)}
              onCopyLink={handleCopyLink}
              onTogglePublish={handleTogglePublish}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="prose max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(docQuery.data.body_markdown ?? "") }}
          />
        </CardContent>
      </Card>

      <Dialog open={isVersionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
          </DialogHeader>
          {versionsQuery.isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading versions...</div>
          ) : versionsQuery.isError ? (
            <div className="py-6 text-center text-sm text-destructive">Could not load versions.</div>
          ) : (
            <VersionHistory versions={versionsQuery.data ?? []} onRestore={handleRestore} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move doc</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Top level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Top level</SelectItem>
                {parentOptions.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={updateDoc.isPending}>
              {updateDoc.isPending ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
