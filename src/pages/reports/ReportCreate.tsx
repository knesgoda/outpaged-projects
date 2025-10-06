import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useCreateReport } from "@/hooks/useReports";

interface ProjectOption {
  id: string;
  name: string;
}

const DEFAULT_CONFIG = {
  source: "tasks",
  limit: 50,
};

export default function ReportCreate() {
  const navigate = useNavigate();
  const createReport = useCreateReport();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [configText, setConfigText] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Reports / New";
  }, []);

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
      const result = await createReport.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        projectId: projectId === "all" ? null : projectId,
        config: parsedConfig,
      });
      navigate(`/reports/${result.id}`);
    } catch (mutationError: any) {
      console.error(mutationError);
      setError(mutationError?.message ?? "Could not create report.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create report</CardTitle>
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
            <Button type="submit" disabled={!isValid || createReport.isPending}>
              {createReport.isPending ? "Saving..." : "Create"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
