import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JsonEditor } from "@/components/common/JsonEditor";
import { getReport, updateReport } from "@/services/reports";
import { useToast } from "@/hooks/use-toast";
import { Report } from "@/types";

export default function ReportEdit() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configText, setConfigText] = useState("{}");
  const [configError, setConfigError] = useState<string | null>(null);
  const [parsedConfig, setParsedConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      if (!reportId) return;
      try {
        setLoading(true);
        const data = await getReport(reportId);
        if (!data) {
          setError("Report not found");
          return;
        }
        setReport(data);
        setName(data.name);
        setDescription(data.description ?? "");
        const configString = JSON.stringify(data.config ?? {}, null, 2);
        setConfigText(configString);
        setParsedConfig(data.config ?? {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load report");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportId) return;

    if (!name.trim()) {
      toast({
        title: "Name is required",
        description: "Enter a name for your report.",
        variant: "destructive",
      });
      return;
    }

    if (configError) {
      toast({
        title: "Invalid config",
        description: "Fix the JSON config before saving.",
        variant: "destructive",
      });
      return;
    }

    let configToSave = parsedConfig;
    if (configText.trim()) {
      try {
        configToSave = JSON.parse(configText);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid JSON";
        setConfigError(message);
        toast({
          title: "Invalid config",
          description: message,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setSaving(true);
      await updateReport(reportId, {
        name: name.trim(),
        description: description.trim() || null,
        config: configToSave,
      });
      toast({ title: "Report saved", description: "Changes applied." });
      navigate(`/reports/${reportId}`);
    } catch (error) {
      toast({
        title: "Could not save report",
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Loading report...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate("/reports")}>Back to reports</Button>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Report not found</CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit report</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="report-name">Name</Label>
              <Input
                id="report-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>

            <JsonEditor
              id="report-config"
              label="Config"
              description="Update the JSON settings that power this report."
              value={configText}
              onChange={setConfigText}
              onValidJson={setParsedConfig}
              onValidationChange={setConfigError}
            />

            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" asChild disabled={saving}>
                <Link to={`/reports/${reportId}`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
