import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type TemplateEditMode = "create" | "edit";

type TemplateEditProps = {
  mode: TemplateEditMode;
};

export default function TemplateEdit({ mode }: TemplateEditProps) {
  const navigate = useNavigate();
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && templateId) {
      document.title = `Templates / ${templateId} / Edit`;
    } else {
      document.title = "Templates / New";
    }
  }, [mode, templateId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    if (mode === "edit" && templateId) {
      navigate(`/templates/${templateId}`);
    } else {
      navigate("/templates");
    }
  };

  if (mode === "edit" && !templateId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Template not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "edit" ? "Edit template" : "New template"}
        </h1>
        <p className="text-sm text-muted-foreground">Fill out template basics.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Template info</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="template-name">
                Name
              </label>
              <Input
                id="template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="template-description">
                Description
              </label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
