import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useReport, useUpdateReport } from "@/hooks/useReports";

interface ProjectOption {
  id: string;
  name: string;
}

export default function ReportEdit() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const reportQuery = useReport(reportId);
  const updateReport = useUpdateReport();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [configText, setConfigText] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reportQuery.data) {
      setName(reportQuery.data.name);
      setDescription(reportQuery.data.description ?? "");
      setProjectId(reportQuery.data.project_id ?? "all");
      setConfigText(JSON.stringify(reportQuery.data.config ?? {}, null, 2));
      document.title = `Reports / ${reportQuery.data.name} / Edit`;
    }
  }, [reportQuery.data]);

  const projectsQuery = useQuery<ProjectOption[]>({
    queryKey: ["projects", "options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) {
        console.error("Failed to load projects", error);
        throw error;
      }
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const isValid = useMemo(() => name.trim().length > 0, [name]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportId) {
      return;
    }
    setError(null);

    let parsedConfig: any;
    try {
      parsedConfig = configText.trim() ? JSON.parse(configText) : {};
    } catch (_parseError) {
      setError("Config must be valid JSON.");
      return;
    }

    if (!isValid) {
      setError("Name is required.");
      return;
    }

    try {
      const result = await updateReport.mutateAsync({
        id: reportId,
        patch: {
          name: name.trim(),
          description: description.trim() || null,
          project_id: projectId === "all" ? null : projectId,
          config: parsedConfig,
        },
      });
      navigate(`/reports/${result.id}`);
    } catch (mutationError: any) {
      console.error(mutationError);
      setError(mutationError?.message ?? "Could not update report.");
    }
  };

  if (reportQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading report...</div>
    );
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm text-destructive">We could not load this report.</p>
        <Button variant="outline" size="sm" onClick={() => reportQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Something went wrong</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Weekly status report"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Summarize the purpose of this report"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Project scope</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projectsQuery.data?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="config">Config JSON</Label>
              <Textarea
                id="config"
                value={configText}
                onChange={(event) => setConfigText(event.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Configure source, filters, and limits using JSON.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || updateReport.isPending}>
              {updateReport.isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
