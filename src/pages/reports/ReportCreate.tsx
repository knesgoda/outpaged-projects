import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JsonEditor } from "@/components/common/JsonEditor";
import { useCreateReport } from "@/hooks/useReports";

export default function ReportCreate() {
  const navigate = useNavigate();
  const createReport = useCreateReport();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState("{}");
  const [isConfigValid, setIsConfigValid] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }

    let parsedConfig: any = {};
    if (config.trim()) {
      try {
        parsedConfig = JSON.parse(config);
      } catch (_error) {
        setFormError("Config must be valid JSON.");
        setIsConfigValid(false);
        return;
      }
    }

    try {
      const report = await createReport.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        config: parsedConfig,
      });
      navigate(`/reports/${report.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create report.";
      setFormError(message);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">New report</h1>
        <p className="text-sm text-muted-foreground">Define the basics and JSON config for this report.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Report details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Weekly status"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context for teammates"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="config">Config (JSON)</Label>
              <JsonEditor
                value={config}
                onChange={setConfig}
                onValidationChange={setIsConfigValid}
                placeholder="{\n  \"filters\": [],\n  \"visuals\": []\n}"
              />
              {!isConfigValid && <p className="text-sm text-destructive">Config must be valid JSON.</p>}
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createReport.isPending}>
                {createReport.isPending ? "Creating" : "Create report"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
