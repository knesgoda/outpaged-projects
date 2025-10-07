import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Link,
  unstable_usePrompt as usePrompt,
  useBeforeUnload,
  useNavigate,
  useParams,
} from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { useCreateDocVersion, useDoc, useDocsList, useUpdateDoc } from "@/hooks/useDocs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectSummary } from "@/hooks/useProjectOptions";

export default function ProjectDocEdit() {
  const params = useParams<{ projectId: string; docId: string }>();
  const projectIdParam = params.projectId;
  const docIdParam = params.docId;
  const docId = docIdParam ?? "";
  const navigate = useNavigate();
  const docQuery = useDoc(docIdParam ?? undefined);
  const updateDoc = useUpdateDoc(docId);
  const snapshot = useCreateDocVersion(docId);
  const docsQuery = useDocsList({ projectId: projectIdParam ?? undefined });
  const project = useProjectSummary(projectIdParam);

  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<string | "none">("none");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  const projectName = project.data?.name ?? projectIdParam ?? "Project";
  useDocumentTitle(docQuery.data ? `Projects / ${projectName} / Docs / ${docQuery.data.title} / Edit` : "Docs / Edit");

  useEffect(() => {
    const doc = docQuery.data;
    if (!doc) return;
    setTitle(doc.title);
    setParentId(doc.parent_id ?? "none");
    setBody(doc.body_markdown ?? "");
    setIsPublished(doc.is_published);
    setHasSaved(false);
  }, [docQuery.data]);

  const parentOptions = useMemo(() => {
    return (docsQuery.data ?? [])
      .filter((doc) => doc.id !== docIdParam)
      .map((doc) => ({ id: doc.id, title: doc.title }));
  }, [docsQuery.data, docIdParam]);

  const doc = docQuery.data;
  const docParent = doc?.parent_id ?? "none";
  const shouldBlock = Boolean(
    doc &&
      !hasSaved &&
      (title !== doc.title ||
        body !== (doc.body_markdown ?? "") ||
        isPublished !== doc.is_published ||
        parentId !== docParent)
  );

  usePrompt({
    when: shouldBlock,
    message: "You have unsaved changes. Leave without saving?",
  });

  useBeforeUnload((event) => {
    if (!shouldBlock) return;
    event.preventDefault();
    event.returnValue = "";
  });

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

  if (!docIdParam || !projectIdParam || !doc) {
    return (
      <section className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Doc not found.</p>
        <Button variant="link" onClick={() => navigate(`/projects/${projectIdParam ?? ""}/docs`)}>
          Back to docs
        </Button>
      </section>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }

    try {
      if (!docIdParam) {
        throw new Error("Doc id missing.");
      }
      await updateDoc.mutateAsync({
        title: title.trim(),
        body_markdown: body,
        parent_id: parentId === "none" ? null : parentId,
        is_published: isPublished,
      });
      await snapshot.mutateAsync();
      setHasSaved(true);
      navigate(`/projects/${projectIdParam}/docs/${docIdParam}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the doc.";
      setFormError(message);
    }
  };

  const handleCancel = () => {
    if (shouldBlock && !window.confirm("Discard changes?")) {
      return;
    }
    setHasSaved(true);
    if (projectIdParam && docIdParam) {
      navigate(`/projects/${projectIdParam}/docs/${docIdParam}`);
    } else if (projectIdParam) {
      navigate(`/projects/${projectIdParam}/docs`);
    } else {
      navigate("/projects");
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
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
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectIdParam}/docs/${docIdParam}`}>{doc.title}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit project doc</h1>
        <p className="text-sm text-muted-foreground">Update the doc and keep teammates informed.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Doc details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent</Label>
              <Select value={parentId} onValueChange={(value) => setParentId(value)}>
                <SelectTrigger id="parent">
                  <SelectValue placeholder="No parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent</SelectItem>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Content</Label>
              <MarkdownEditor value={body} onChange={setBody} />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="published">Published</Label>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDoc.isPending || snapshot.isPending}>
                {updateDoc.isPending || snapshot.isPending ? "Saving" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
