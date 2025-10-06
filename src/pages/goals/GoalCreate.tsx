import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useCreateGoal, useGoals } from "@/hooks/useGoals";
import { useOKRCycles } from "@/hooks/useOKRCycles";
import type { Goal } from "@/types";

const STATUS_OPTIONS: Goal["status"][] = ["on_track", "at_risk", "off_track", "paused", "done"];

type ProjectOption = { id: string; name: string | null };

type GoalCreateProps = {
  projectId?: string;
  projectName?: string;
};

export default function GoalCreate({ projectId: initialProjectId, projectName }: GoalCreateProps = {}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [cycleId, setCycleId] = useState<string | undefined>();
  const [parentGoalId, setParentGoalId] = useState<string | undefined>();
  const [status, setStatus] = useState<Goal["status"]>("on_track");
  const [weight, setWeight] = useState("1");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGoalMutation = useCreateGoal();
  const { data: cycles } = useOKRCycles();
  const { data: potentialParents } = useGoals({ includeArchived: true });

  const { data: projects } = useQuery({
    queryKey: ["projects", "options"],
    queryFn: async (): Promise<ProjectOption[]> => {
      if (initialProjectId) {
        const { data, error: queryError } = await supabase
          .from("projects")
          .select("id, name")
          .eq("id", initialProjectId)
          .maybeSingle();
        if (queryError) throw queryError;
        if (!data) return [];
        return [data as ProjectOption];
      }

      const { data, error: queryError } = await supabase.from("projects").select("id, name").order("name");
      if (queryError) throw queryError;
      return (data as ProjectOption[]) ?? [];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (initialProjectId) {
      document.title = projectName
        ? `Projects / ${projectName} / Goals / New`
        : `Projects / ${initialProjectId} / Goals / New`;
    } else {
      document.title = "Goals / New";
    }
  }, [initialProjectId, projectName]);

  useEffect(() => {
    if (!cycles || cycles.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const activeCycle = cycles.find((cycle) => today >= cycle.starts_on && today <= cycle.ends_on);
    if (activeCycle) {
      setCycleId((prev) => prev ?? activeCycle.id);
    }
  }, [cycles]);

  const parentOptions = useMemo(
    () =>
      (potentialParents ?? []).filter((goal) => {
        if (goal.status === "archived") return false;
        return true;
      }),
    [potentialParents]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const parsedWeight = Number(weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError("Weight must be greater than zero.");
      return;
    }

    try {
      const goal = await createGoalMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        project_id: projectId,
        cycle_id: cycleId,
        parent_goal_id: parentGoalId,
        status,
        weight: parsedWeight,
        is_private: isPrivate,
      });

      if (goal.project_id) {
        navigate(`/projects/${goal.project_id}/goals/${goal.id}`);
      } else {
        navigate(`/goals/${goal.id}`);
      }
    } catch (submitError: any) {
      setError(submitError.message ?? "Failed to create goal.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create goal</h1>
        <p className="text-sm text-muted-foreground">
          {projectName ? `Goals will appear inside ${projectName}.` : "Define the outcome, alignment, and visibility for your new goal."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal details</CardTitle>
          <CardDescription>Provide context so teams can align work quickly.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Launch the new onboarding journey"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the impact, success measures, and context for this goal."
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                {initialProjectId ? (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {projectName ?? projects?.[0]?.name ?? "Project"}
                  </div>
                ) : (
                  <Select
                    value={projectId ?? "none"}
                    onValueChange={(value) => setProjectId(value === "none" ? undefined : value)}
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {(projects ?? []).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name ?? "Untitled project"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cycle">Cycle</Label>
                <Select value={cycleId ?? "none"} onValueChange={(value) => setCycleId(value === "none" ? undefined : value)}>
                  <SelectTrigger id="cycle">
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No cycle</SelectItem>
                    {(cycles ?? []).map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parent">Parent goal</Label>
                <Select
                  value={parentGoalId ?? "none"}
                  onValueChange={(value) => setParentGoalId(value === "none" ? undefined : value)}
                >
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="Top level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Top level</SelectItem>
                    {parentOptions.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as Goal["status"])}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <Label htmlFor="privacy">Private goal</Label>
                  <p className="text-xs text-muted-foreground">Only you can view private goals until shared.</p>
                </div>
                <Switch id="privacy" checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Unable to save</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGoalMutation.isLoading}>
                {createGoalMutation.isLoading ? "Saving..." : "Create goal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
