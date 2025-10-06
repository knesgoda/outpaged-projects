import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JsonEditor } from "@/components/common/JsonEditor";
import { useReport, useUpdateReport } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportEdit() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, isError, error } = useReport(reportId);
  const updateReport = useUpdateReport(reportId ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [config, setConfig] = useState("{}");
  const [isConfigValid, setIsConfigValid] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!report) return;
    setName(report.name);
    setDescription(report.description ?? "");
    try {
      setConfig(JSON.stringify(report.config ?? {}, null, 2));
    } catch (_error) {
      setConfig("{}");
    }
  }, [report]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load the report.";
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  }

  if (!report || !reportId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Report not found.</p>
        <Button variant="link" onClick={() => navigate("/reports")}>Back to reports</Button>
      </div>
    );
  }

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
      await updateReport.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        config: parsedConfig,
      });
      navigate(`/reports/${reportId}`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save report.";
      setFormError(message);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Edit report</h1>
        <p className="text-sm text-muted-foreground">Update the report details and JSON config.</p>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="config">Config (JSON)</Label>
              <JsonEditor
                value={config}
                onChange={setConfig}
                onValidationChange={setIsConfigValid}
              />
              {!isConfigValid && <p className="text-sm text-destructive">Config must be valid JSON.</p>}
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(`/reports/${reportId}`)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateReport.isPending}>
                {updateReport.isPending ? "Saving" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
