import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDocs, useDocSearch, useDeleteDoc, useUpdateDoc, useDocVersions } from "@/hooks/useDocs";
import { DocTree } from "@/components/docs/DocTree";
import { DocToolbar } from "@/components/docs/DocToolbar";
import { VersionHistory } from "@/components/docs/VersionHistory";
import { renderMarkdown } from "@/components/docs/MarkdownEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function DocsHome() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isVersionsOpen, setVersionsOpen] = useState(false);

  useEffect(() => {
    document.title = "Docs";
  }, []);

  const docsQuery = useDocs();
  const deleteDoc = useDeleteDoc();
  const updateDoc = useUpdateDoc();
  const versionsQuery = useDocVersions(isVersionsOpen ? selectedId ?? undefined : undefined);

  useEffect(() => {
    if (!selectedId && docsQuery.data?.length) {
      setSelectedId(docsQuery.data[0].id);
    }
  }, [docsQuery.data, selectedId]);

  const filteredDocs = useDocSearch(docsQuery.data, search);

  const selectedDoc = useMemo(() => {
    if (!selectedId || !docsQuery.data) {
      return null;
    }
    return docsQuery.data.find((doc) => doc.id === selectedId) ?? null;
  }, [selectedId, docsQuery.data]);

  const handleCreate = (parentId?: string | null) => {
    const params = new URLSearchParams();
    if (parentId) {
      params.set("parent", parentId);
    }
    navigate(`/docs/new${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleEdit = () => {
    if (!selectedDoc) {
      return;
    }
    navigate(`/docs/${selectedDoc.id}/edit`);
  };

  const handleOpenVersions = () => {
    if (!selectedDoc) {
      return;
    }
    setVersionsOpen(true);
  };

  const handleTogglePublish = async (value: boolean) => {
    if (!selectedDoc) {
      return;
    }
    try {
      await updateDoc.mutateAsync({ id: selectedDoc.id, patch: { is_published: value } });
      toast({ title: value ? "Doc published" : "Doc hidden" });
    } catch (error: any) {
      console.error(error);
      toast({ title: "Update failed", description: error?.message ?? "Could not update doc", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) {
      return;
    }
    const hasChildren = docsQuery.data?.some((doc) => doc.parent_id === selectedDoc.id);
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
      await deleteDoc.mutateAsync(selectedDoc.id);
      toast({ title: "Doc deleted" });
      setSelectedId(null);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Delete failed", description: error?.message ?? "Could not delete doc", variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    if (!selectedDoc) {
      return;
    }
    const url = `${window.location.origin}/docs/${selectedDoc.id}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 p-6">
      <aside className="hidden w-full max-w-xs flex-shrink-0 flex-col gap-4 rounded border bg-background p-4 md:flex">
        <Input
          placeholder="Search docs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {docsQuery.isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading docs...</div>
        ) : docsQuery.isError ? (
          <div className="py-10 text-center text-sm text-destructive">
            {docsQuery.error instanceof Error && docsQuery.error.message.includes("permission")
              ? "You do not have access."
              : "We could not load docs."}
          </div>
        ) : (
          <DocTree
            docs={filteredDocs}
            activeId={selectedId ?? undefined}
            onSelect={(doc) => setSelectedId(doc.id)}
            onCreate={handleCreate}
          />
        )}
      </aside>
      <main className="flex-1 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Docs</h1>
            <p className="text-sm text-muted-foreground">Centralize documentation for every team.</p>
          </div>
          <Button onClick={() => handleCreate(null)}>New doc</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-2">
              <span>{selectedDoc?.title ?? "Select a doc"}</span>
              {selectedDoc && (
                <DocToolbar
                  doc={selectedDoc}
                  onCreate={() => handleCreate(selectedDoc.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onShowVersions={handleOpenVersions}
                  onCopyLink={handleCopyLink}
                  onTogglePublish={handleTogglePublish}
                />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {docsQuery.isLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading doc...</div>
            ) : !selectedDoc ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Select a doc from the list to preview its contents.
              </div>
            ) : (
              <div
                className="prose max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc.body_markdown ?? "") }}
              />
            )}
          </CardContent>
        </Card>
      </main>

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
            <VersionHistory versions={versionsQuery.data ?? []} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
