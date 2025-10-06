import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useProjectsLite } from "@/hooks/useProjectsLite";
import { useReport, useUpdateReport } from "@/hooks/useReports";
import { setBreadcrumbLabel } from "@/state/breadcrumbs";

interface FormValues {
  name: string;
  description: string;
  projectId: string;
  config: string;
}

export default function ReportEdit() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId ?? "";
  const navigate = useNavigate();
  const { data: report, isLoading, isError } = useReport(params.reportId);
  const { data: projects = [] } = useProjectsLite();
  const updateMutation = useUpdateReport(reportId);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      projectId: "workspace",
      config: "",
    },
  });

  useEffect(() => {
    if (report) {
      reset({
        name: report.name,
        description: report.description ?? "",
        projectId: report.project_id ?? "workspace",
        config: JSON.stringify(report.config ?? {}, null, 2),
      });
      document.title = `Reports / ${report.name} / Edit`;
    }
  }, [report, reset]);

  useEffect(() => {
    if (!report) {
      document.title = "Reports";
    }
  }, [report]);

  useEffect(() => {
    if (report?.id && report.name) {
      const path = `/reports/${report.id}`;
      setBreadcrumbLabel(path, report.name);
      return () => setBreadcrumbLabel(path, null);
    }
  }, [report?.id, report?.name]);

  const onSubmit = handleSubmit(async (values) => {
    if (!reportId) return;
    try {
      setJsonError(null);
      const parsedConfig = values.config ? JSON.parse(values.config) : {};
      const project_id = values.projectId === "workspace" ? null : values.projectId;
      await updateMutation.mutateAsync({
        name: values.name.trim(),
        description: values.description.trim() || null,
        config: parsedConfig,
        project_id,
      });
      navigate(`/reports/${reportId}`);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setJsonError("Config must be valid JSON.");
        return;
      }
      setJsonError((error as Error).message);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <Alert variant={isError ? "destructive" : "default"}>
        <AlertTitle>{isError ? "Could not load report" : "Report not found"}</AlertTitle>
        <AlertDescription>
          {isError ? "Try refreshing the page." : "The requested report does not exist."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Edit report</h1>
        <p className="text-muted-foreground">Update settings for {report.name}.</p>
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
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...register("description")} />
            </div>

            <div className="space-y-2">
              <Label>Project scope</Label>
              <Select
                value={watch("projectId")}
                onValueChange={(value) => {
                  setValue("projectId", value, { shouldDirty: true });
                }}
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
            onClick={() => navigate(`/reports/${reportId}`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
