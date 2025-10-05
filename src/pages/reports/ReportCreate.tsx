import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JsonEditor } from "@/components/common/JsonEditor";
import { createReport } from "@/services/reports";
import { useToast } from "@/hooks/use-toast";

export default function ReportCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configText, setConfigText] = useState("{}");
  const [configError, setConfigError] = useState<string | null>(null);
  const [parsedConfig, setParsedConfig] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setIsSubmitting(true);
      const report = await createReport({
        name: name.trim(),
        description: description.trim() || undefined,
        config: configToSave,
      });
      toast({ title: "Report created", description: "Your report is ready." });
      navigate(`/reports/${report.id}`);
    } catch (error) {
      toast({
        title: "Could not create report",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Create report</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="report-name">Name</Label>
              <Input
                id="report-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Monthly revenue snapshot"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Summarize what this report highlights"
                rows={4}
              />
            </div>

            <JsonEditor
              id="report-config"
              label="Config"
              description="Provide optional JSON settings to power the report."
              value={configText}
              onChange={setConfigText}
              onValidJson={setParsedConfig}
              onValidationChange={setConfigError}
            />

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
