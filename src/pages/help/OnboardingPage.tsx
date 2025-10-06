import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  link?: { label: string; to: string };
};

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "create-project",
    title: "Create a project",
    description: "Set up your first project so you can plan and assign work.",
    link: { label: "New project", to: "/projects/new" },
  },
  {
    id: "invite-members",
    title: "Invite teammates",
    description: "Add collaborators so everyone can start working together.",
    link: { label: "Manage people", to: "/people" },
  },
  {
    id: "create-tasks",
    title: "Create tasks",
    description: "Add a few tasks to capture the work you want to track.",
    link: { label: "Add task", to: "/tasks/new" },
  },
  {
    id: "open-calendar",
    title: "Open the calendar",
    description: "Review deadlines and upcoming work at a glance.",
    link: { label: "View calendar", to: "/calendar" },
  },
  {
    id: "run-report",
    title: "Run a report",
    description: "Get insights on workload and progress with a quick report.",
    link: { label: "Open reports", to: "/reports" },
  },
];

type ChecklistProgress = Record<string, boolean>;

const STORAGE_KEY = "help.onboarding.progress.v1";

export function OnboardingPage() {
  const defaultProgress = useMemo<ChecklistProgress>(() => {
    return CHECKLIST_ITEMS.reduce<ChecklistProgress>((acc, item) => {
      acc[item.id] = false;
      return acc;
    }, {});
  }, []);

  const [progress, setProgress] = useState<ChecklistProgress>(defaultProgress);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      setStatus("ready");
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChecklistProgress;
        setProgress({ ...defaultProgress, ...parsed });
      }
      setStatus("ready");
    } catch (error) {
      console.error("Unable to load onboarding progress", error);
      setErrorMessage("We could not load your saved progress. You can still use the checklist below.");
      setStatus("error");
    }
  }, [defaultProgress]);

  useEffect(() => {
    if (typeof window === "undefined" || status !== "ready") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error("Unable to save onboarding progress", error);
      setErrorMessage("We could not save your progress. Try clearing some storage space and refresh.");
      setStatus("error");
    }
  }, [progress, status]);

  const toggleItem = (id: string) => {
    setProgress((previous) => ({ ...previous, [id]: !previous[id] }));
  };

  const resetProgress = () => {
    setProgress(defaultProgress);
    setStatus("ready");
    setErrorMessage(null);
  };

  const completedCount = useMemo(
    () => CHECKLIST_ITEMS.filter((item) => progress[item.id]).length,
    [progress]
  );
  const totalCount = CHECKLIST_ITEMS.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const hasChecklist = totalCount > 0;

  return (
    <div className="space-y-8 p-6">
      <Helmet>
        <title>Help / Onboarding</title>
      </Helmet>
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Onboarding checklist</h1>
        <p className="max-w-2xl text-muted-foreground">
          Track your setup progress. Complete the quickstart tasks below to get the most out of OutPaged PM.
        </p>
      </header>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertTitle>Progress issue</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="max-w-3xl">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="text-lg">Your progress</CardTitle>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} steps complete
            </p>
          </div>
          <div className="space-y-2">
            <Progress value={completionPercent} aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent} />
            <p className="text-xs text-muted-foreground">{completionPercent}% complete</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="space-y-3">
              {Array.from({ length: CHECKLIST_ITEMS.length }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-md" />
              ))}
            </div>
          )}

          {status !== "loading" && hasChecklist && (
            <ul className="space-y-4">
              {CHECKLIST_ITEMS.map((item) => {
                const isDone = Boolean(progress[item.id]);
                return (
                  <li key={item.id} className="rounded-md border p-4 transition hover:bg-muted/40">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        <Checkbox
                          id={item.id}
                          checked={isDone}
                          onCheckedChange={() => toggleItem(item.id)}
                          aria-describedby={`${item.id}-description`}
                        />
                        <div>
                          <label htmlFor={item.id} className="text-base font-medium">
                            {item.title}
                          </label>
                          <p id={`${item.id}-description`} className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      {item.link && (
                        <Button asChild variant={isDone ? "secondary" : "outline"} size="sm" className="self-start md:self-center">
                          <Link to={item.link.to}>{item.link.label}</Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {status !== "loading" && !hasChecklist && (
            <p className="rounded-md border bg-muted/50 p-4 text-sm text-muted-foreground">
              No onboarding tasks configured yet. Check back soon for guided steps.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={resetProgress}>
            Reset progress
          </Button>
          <Button asChild variant="outline">
            <Link to="/help">Back to help</Link>
          </Button>
        </CardFooter>
      </Card>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Next steps</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Explore templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              Kickstart your workspace by browsing project templates and sample automation recipes.
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link to="/templates">Browse templates</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              Ensure the right teammates have access by reviewing workspace roles and security settings.
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/security">Open security</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Watch the product tour</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              See the highlights of OutPaged PM in a short overview video to share with your team.
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <Link to="/help/shortcuts">View shortcuts</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default OnboardingPage;
