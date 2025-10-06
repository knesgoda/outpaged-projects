import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { useGoal, useGoals, useUpdateGoal } from "@/hooks/useGoals";
import { useOKRCycles } from "@/hooks/useOKRCycles";
import type { Goal } from "@/types";

const STATUS_OPTIONS: Goal["status"][] = ["on_track", "at_risk", "off_track", "paused", "done", "archived"];

type ProjectOption = { id: string; name: string | null };

export default function GoalEdit() {
  const { goalId, projectId: projectContextId } = useParams<{ goalId: string; projectId?: string }>();
  const navigate = useNavigate();

  const { data: goal, isLoading, isError, error } = useGoal(goalId);
  const updateGoalMutation = useUpdateGoal(goalId ?? "");
  const { data: cycles } = useOKRCycles();
  const { data: potentialParents } = useGoals({ includeArchived: true });

  const { data: projects } = useQuery({
    queryKey: ["projects", "options"],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data, error: queryError } = await supabase.from("projects").select("id, name").order("name");
      if (queryError) throw queryError;
      return (data as ProjectOption[]) ?? [];
    },
    staleTime: 60_000,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>();
  const [cycleId, setCycleId] = useState<string | undefined>();
  const [parentGoalId, setParentGoalId] = useState<string | undefined>();
  const [status, setStatus] = useState<Goal["status"]>("on_track");
  const [weight, setWeight] = useState("1");
  const [isPrivate, setIsPrivate] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (projectContextId || goal?.project_id) {
      const contextId = goal?.project_id ?? projectContextId;
      document.title = goal?.title
        ? `Projects / ${contextId ?? ""} / Goals / ${goal.title}`
        : `Projects / ${contextId ?? ""} / Goals / Edit`;
    } else {
      document.title = goal ? `Goals / ${goal.title}` : "Goals / Edit";
    }
  }, [goal, projectContextId]);

  useEffect(() => {
    if (!goal) return;
    setTitle(goal.title);
    setDescription(goal.description ?? "");
    setProjectId(goal.project_id ?? undefined);
    setCycleId(goal.cycle_id ?? undefined);
    setParentGoalId(goal.parent_goal_id ?? undefined);
    setStatus(goal.status);
    setWeight(String(goal.weight ?? 1));
    setIsPrivate(goal.is_private);
  }, [goal]);

  const parentOptions = useMemo(
    () =>
      (potentialParents ?? []).filter((candidate) => {
        if (!goal) return false;
        if (candidate.id === goal.id) return false;
        return true;
      }),
    [goal, potentialParents]
  );

  if (!goalId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Goal not found.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <AlertDescription>Loading goal...</AlertDescription>
        </CardContent>
      </Card>
    );
  }

  if (isError || !goal) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(error as Error)?.message ?? "Goal not found."}</AlertDescription>
      </Alert>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }

    const parsedWeight = Number(weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setFormError("Weight must be greater than zero.");
      return;
    }

    try {
      await updateGoalMutation.mutateAsync({
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
      setFormError(submitError.message ?? "Failed to update goal.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit goal</h1>
        <p className="text-sm text-muted-foreground">Update alignment, status, and visibility.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goal details</CardTitle>
          <CardDescription>Adjust fields and share new context with your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select value={projectId ?? "none"} onValueChange={(value) => setProjectId(value === "none" ? undefined : value)}>
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
                    {parentOptions.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.title}
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

            {formError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to save</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateGoalMutation.isLoading}>
                {updateGoalMutation.isLoading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
