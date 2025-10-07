import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  Breadcrumb,
  BreadcrumbItem,
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

export default function DocsHome() {
  useDocumentTitle("Docs");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");

  const selectedId = searchParams.get("docId");
  const docsQuery = useDocsList({ q: search });
  const docQuery = useDoc(selectedId ?? undefined);

  const docs = docsQuery.data ?? [];
  const selectedDoc = docQuery.data ?? null;
  const previewHtml = useMemo(() => {
    if (!selectedDoc) return "";
    return DOMPurify.sanitize(marked.parse(selectedDoc.body_markdown ?? ""));
  }, [selectedDoc]);

  const isLoadingTree = docsQuery.isLoading;

  const handleSelect = (docId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("docId", docId);
      return next;
    });
  };

  const handleCreate = () => {
    navigate("/docs/new");
  };

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Docs</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-semibold tracking-tight">Docs & Wiki</h1>
          <p className="text-sm text-muted-foreground">
            Publish internal documentation and quick references for the team.
          </p>
        </div>
        <Button onClick={handleCreate}>New doc</Button>
      </div>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search docs"
        className="max-w-sm"
      />

      <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Outline</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[520px] overflow-y-auto">
            {isLoadingTree ? (
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
                emptyState={
                  <div className="text-sm text-muted-foreground">
                    No docs yet. Create your first page.
                  </div>
                }
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
                <Link to={`/docs/${selectedDoc.id}`}>Open</Link>
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
              <p className="text-sm text-muted-foreground">
                Choose a doc from the outline to see details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
