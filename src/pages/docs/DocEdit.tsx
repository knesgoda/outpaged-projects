import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { Switch } from "@/components/ui/switch";
import { MarkdownEditor } from "@/components/docs/MarkdownEditor";
import { useDoc, useDocs, useUpdateDoc } from "@/hooks/useDocs";
import { createDocVersionFromCurrent } from "@/services/docs";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChangesPrompt } from "@/hooks/useUnsavedChangesPrompt";

export default function DocEdit() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const docQuery = useDoc(docId);
  const docsQuery = useDocs();
  const updateDoc = useUpdateDoc();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [parentId, setParentId] = useState<string | "none">("none");
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setDirty] = useState(false);

  useEffect(() => {
    if (docQuery.data) {
      setTitle(docQuery.data.title);
      setBody(docQuery.data.body_markdown ?? "");
      setParentId(docQuery.data.parent_id ?? "none");
      setIsPublished(docQuery.data.is_published);
      document.title = `Docs / ${docQuery.data.title} / Edit`;
    }
  }, [docQuery.data]);

  useUnsavedChangesPrompt(isDirty);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!docId || !docQuery.data) {
      return;
    }
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      if (title.trim() !== docQuery.data.title || body !== (docQuery.data.body_markdown ?? "")) {
        await createDocVersionFromCurrent(docId);
      }
      if (parentId !== "none" && descendantIds.has(parentId)) {
        setError("Select a parent outside of this doc's subtree.");
        return;
      }

      await updateDoc.mutateAsync({
        id: docId,
        patch: {
          title: title.trim(),
          body_markdown: body,
          parent_id: parentId === "none" ? null : parentId,
          is_published: isPublished,
          version: docQuery.data.version + 1,
        },
      });
      setDirty(false);
      toast({ title: "Doc updated" });
      navigate(`/docs/${docId}`);
    } catch (mutationError: any) {
      console.error(mutationError);
      setError(mutationError?.message ?? "Could not update doc.");
    }
  };

  if (docQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading doc...</div>;
  }

  if (docQuery.isError || !docQuery.data) {
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

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        onChange={() => setDirty(true)}
      >
        <Card>
          <CardHeader>
            <CardTitle>Edit doc</CardTitle>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Parent</Label>
                <Select value={parentId} onValueChange={setParentId}>
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
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Published
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                </Label>
              </div>
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
            <Button type="submit" disabled={updateDoc.isPending}>
              {updateDoc.isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
