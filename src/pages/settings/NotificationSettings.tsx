import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationPrefs, useSaveNotificationPrefs } from "@/hooks/useNotificationPrefs";
import type { NotificationPreferences } from "@/types";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PREFS: NotificationPreferences = {
  user_id: "",
  in_app: {
    mention: true,
    assigned: true,
    comment_reply: true,
    status_change: true,
    due_soon: true,
    automation: true,
    file_shared: true,
    doc_comment: true,
  },
  email: {
    mention: false,
    assigned: false,
    comment_reply: false,
    status_change: false,
    due_soon: true,
    automation: false,
    file_shared: false,
    doc_comment: false,
  },
  digest_frequency: "daily",
  updated_at: new Date().toISOString(),
};

const CATEGORIES: Array<{
  key: keyof typeof DEFAULT_PREFS.in_app;
  label: string;
  description: string;
}> = [
  { key: "mention", label: "Mentions", description: "When someone @mentions you." },
  { key: "assigned", label: "Assignments", description: "Tasks assigned directly to you." },
  { key: "comment_reply", label: "Comment replies", description: "Replies to threads you start." },
  { key: "status_change", label: "Status changes", description: "Tracked work changes state." },
  { key: "due_soon", label: "Due soon", description: "Reminders one day before due." },
  { key: "automation", label: "Automations", description: "Automation runs and results." },
  { key: "file_shared", label: "Files shared", description: "Files shared with you." },
  { key: "doc_comment", label: "Doc comments", description: "Feedback on docs you own." },
];

const DIGEST_OPTIONS: Array<{ value: NotificationPreferences["digest_frequency"]; label: string }> = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export function NotificationSettingsPage() {
  const { toast } = useToast();
  const prefsQuery = useNotificationPrefs();
  const savePrefs = useSaveNotificationPrefs();
  const [formState, setFormState] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [initialState, setInitialState] = useState<NotificationPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    document.title = "Notifications Settings";
  }, []);

  useEffect(() => {
    if (prefsQuery.data) {
      setFormState(prefsQuery.data);
      setInitialState(prefsQuery.data);
    } else if (!prefsQuery.isLoading && !prefsQuery.error) {
      setFormState(DEFAULT_PREFS);
      setInitialState(DEFAULT_PREFS);
    }
  }, [prefsQuery.data, prefsQuery.isLoading, prefsQuery.error]);

  const isDirty = useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(initialState);
  }, [formState, initialState]);

  const handleToggle = (channel: "in_app" | "email", key: keyof typeof DEFAULT_PREFS.in_app, value: boolean) => {
    setFormState((previous) => ({
      ...previous,
      [channel]: {
        ...previous[channel],
        [key]: value,
      },
    }));
  };

  const handleDigestChange = (value: NotificationPreferences["digest_frequency"]) => {
    setFormState((previous) => ({
      ...previous,
      digest_frequency: value,
    }));
  };

  const handleReset = () => {
    setFormState(initialState);
  };

  const handleSave = () => {
    savePrefs.mutate(
      {
        in_app: formState.in_app,
        email: formState.email,
        digest_frequency: formState.digest_frequency,
      },
      {
        onSuccess: (updated) => {
          setInitialState(updated);
          setFormState(updated);
          toast({ title: "Preferences saved" });
        },
        onError: (error) => {
          toast({
            title: "Unable to save",
            description: error.message ?? "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-foreground">Notification settings</h1>
        <p className="text-sm text-muted-foreground">Choose how you stay informed.</p>
      </header>

      {prefsQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">We couldn't load your notification preferences.</p>
            <p>{prefsQuery.error instanceof Error ? prefsQuery.error.message : "Try again in a few moments."}</p>
            <Button size="sm" onClick={() => prefsQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-[2fr,1fr,1fr] items-center gap-4 text-sm font-medium text-muted-foreground">
              <span>Category</span>
              <span className="text-center">In-app</span>
              <span className="text-center">Email</span>
            </div>
            <div className="space-y-4">
              {prefsQuery.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`pref-skeleton-${index}`}
                    className="flex items-center justify-between rounded-lg border border-dashed p-4"
                  >
                    <div className="h-4 w-1/3 rounded bg-muted/60" />
                    <div className="h-6 w-10 rounded bg-muted/40" />
                    <div className="h-6 w-10 rounded bg-muted/40" />
                  </div>
                ))
              ) : (
                CATEGORIES.map((category) => (
                  <div
                    key={category.key}
                    className="grid grid-cols-[2fr,1fr,1fr] items-center gap-4 rounded-lg border p-4 transition hover:bg-muted/20"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{category.label}</p>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={formState.in_app[category.key] ?? false}
                        onCheckedChange={(checked) => handleToggle("in_app", category.key, checked)}
                        aria-label={`${category.label} in-app`}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={formState.email[category.key] ?? false}
                        onCheckedChange={(checked) => handleToggle("email", category.key, checked)}
                        aria-label={`${category.label} email`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Digest summary</h2>
              <p className="text-sm text-muted-foreground">
                Receive a summary email if there hasn't been activity recently.
              </p>
              <Select
                value={formState.digest_frequency}
                onValueChange={(value: NotificationPreferences["digest_frequency"]) => handleDigestChange(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select digest frequency" />
                </SelectTrigger>
                <SelectContent>
                  {DIGEST_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleReset} disabled={!isDirty || savePrefs.isPending}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={!isDirty || savePrefs.isPending}>
                {savePrefs.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
