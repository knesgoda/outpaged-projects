import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { useDocs, useCreateDoc } from "@/hooks/useDocs";
import { useToast } from "@/hooks/use-toast";
import { useProjectMeta } from "@/hooks/useProjectMeta";

export default function ProjectDocCreate() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [parentId, setParentId] = useState<string | "none">("none");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const projectMeta = useProjectMeta(projectId);

  useEffect(() => {
    const projectLabel = projectMeta.data?.name ?? projectId ?? "Project";
    document.title = `Projects / ${projectLabel} / Docs / New`;
  }, [projectMeta.data?.name, projectId]);

  useEffect(() => {
    const parent = searchParams.get("parent");
    if (parent) {
      setParentId(parent);
    }
  }, [searchParams]);

  const docsQuery = useDocs({ projectId });
  const createDoc = useCreateDoc();

  const availableParents = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!projectId) {
      setError("Missing project.");
      return;
    }

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      const doc = await createDoc.mutateAsync({
        title: title.trim(),
        body_markdown: body,
        project_id: projectId,
        parent_id: parentId === "none" ? null : parentId,
      });
      toast({ title: "Doc created" });
      navigate(`/projects/${projectId}/docs/${doc.id}`);
    } catch (mutationError: any) {
      console.error(mutationError);
      setError(mutationError?.message ?? "Could not create doc.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create doc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
              <Label>Parent</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Top level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Top level</SelectItem>
                  {availableParents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <MarkdownEditor value={body} onChange={setBody} />
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDoc.isPending}>
              {createDoc.isPending ? "Saving..." : "Create"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
