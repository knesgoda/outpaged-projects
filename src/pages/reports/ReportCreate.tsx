import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreateReport } from "@/hooks/useReports";
import { useProjectsLite } from "@/hooks/useProjectsLite";

interface FormValues {
  name: string;
  description: string;
  projectId: string;
  config: string;
}

const DEFAULT_CONFIG = JSON.stringify(
  {
    resource: "tasks",
    limit: 100,
    select: ["id", "name", "status", "project_id", "updated_at"],
    orderBy: "updated_at",
  },
  null,
  2
);

export default function ReportCreate() {
  const navigate = useNavigate();
  const { data: projects = [] } = useProjectsLite();
  const createMutation = useCreateReport();
  const [jsonError, setJsonError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      projectId: "workspace",
      config: DEFAULT_CONFIG,
    },
  });

  useEffect(() => {
    document.title = "Reports / New";
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    try {
      setJsonError(null);
      const parsedConfig = values.config ? JSON.parse(values.config) : {};
      const projectId = values.projectId === "workspace" ? null : values.projectId;

      const report = await createMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        projectId,
        config: parsedConfig,
      });

      navigate(`/reports/${report.id}`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setJsonError("Config must be valid JSON.");
        return;
      }
      setJsonError((error as Error).message);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New report</h1>
        <p className="text-muted-foreground">
          Define a data view and run it on demand.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Report details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input type="hidden" {...register("projectId")} />
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Weekly status snapshot"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Explain what this report tracks"
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Project scope</Label>
              <Select
                defaultValue="workspace"
                onValueChange={(value) => setValue("projectId", value)}
              >
                <SelectTrigger className="sm:w-72">
                  <SelectValue placeholder="Workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name ?? "Untitled project"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={12}
              className="font-mono text-sm"
              {...register("config", { required: true })}
            />
            {jsonError && (
              <Alert variant="destructive">
                <AlertDescription>{jsonError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/reports")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}
