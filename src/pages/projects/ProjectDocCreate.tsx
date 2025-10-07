import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { useCreateDoc, useDocsList } from "@/hooks/useDocs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectSummary } from "@/hooks/useProjectOptions";

export default function ProjectDocCreate() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const parentFromQuery = searchParams.get("parentId");
  const navigate = useNavigate();

  const createDoc = useCreateDoc();
  const docsQuery = useDocsList({ projectId: projectId ?? undefined });
  const project = useProjectSummary(projectId);

  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<string | "none">(parentFromQuery ?? "none");
  const [body, setBody] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const projectName = project.data?.name ?? projectId ?? "Project";
  useDocumentTitle(`Projects / ${projectName} / Docs / New`);

  const parentOptions = useMemo(() => {
    return (docsQuery.data ?? []).map((doc) => ({ id: doc.id, title: doc.title }));
  }, [docsQuery.data]);

  if (!projectId) {
    return (
      <section className="p-6">
        <p className="text-sm text-muted-foreground">Project not specified.</p>
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
      const doc = await createDoc.mutateAsync({
        title: title.trim(),
        body_markdown: body,
        parent_id: parentId === "none" ? null : parentId,
        project_id: projectId,
        is_published: isPublished,
      });
      navigate(`/projects/${projectId}/docs/${doc.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the doc.";
      setFormError(message);
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
              <Link to={`/projects/${projectId}`}>{projectName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={`/projects/${projectId}/docs`}>Docs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>New</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">New project doc</h1>
        <p className="text-sm text-muted-foreground">Share updates and documentation for this project.</p>
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
              <MarkdownEditor value={body} onChange={setBody} placeholder="Write in markdown" />
            </div>

            <div className="flex items-center gap-2">
              <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="published">Published</Label>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDoc.isPending}>
                {createDoc.isPending ? "Creating" : "Create doc"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
