import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JsonEditor } from "@/components/common/JsonEditor";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateReport } from "@/hooks/useReports";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectOptions } from "@/hooks/useProjectOptions";

export default function ReportCreate() {
  useDocumentTitle("Reports / New");
  const navigate = useNavigate();
  const createReport = useCreateReport();
  const { data: projects = [], isLoading: loadingProjects } = useProjectOptions(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | "none">("none");
  const [config, setConfig] = useState("{\n  \"source\": \"tasks\",\n  \"limit\": 100\n}");
  const [isConfigValid, setIsConfigValid] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name ?? project.id })),
    [projects]
  );

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
        projectId: projectId === "none" ? null : projectId,
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/reports">Reports</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>New</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">New report</h1>
        <p className="text-sm text-muted-foreground">
          Define the basics and JSON config for this report.
        </p>
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
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={(value) => setProjectId(value)}>
                <SelectTrigger id="project">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All projects</SelectItem>
                  {projectOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loadingProjects ? (
                <p className="text-xs text-muted-foreground">Loading projects…</p>
              ) : null}
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
                placeholder="{\n  \"source\": \"tasks\",\n  \"limit\": 100\n}"
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
