import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectCard } from "@/components/integrations/ConnectCard";
import { LinkedResourcesPanel } from "@/components/linked/LinkedResourcesPanel";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useToast } from "@/hooks/use-toast";
import { createTaskFromEmail } from "@/services/gmail";
import { listEventsMock, saveCalendarDefault } from "@/services/googleCalendar";
import { linkDoc } from "@/services/googleDocs";
import { addLinkedResource } from "@/services/linkedResources";
import { supabase } from "@/integrations/supabase/client";
import type { IntegrationKey, LinkedResource } from "@/types";
import { Loader2 } from "lucide-react";

const TABS = ["gmail", "calendar", "docs"] as const;
type GoogleTab = typeof TABS[number];

type ProjectOption = { id: string; name: string };

const useProjectOptions = () =>
  useQuery({
    queryKey: ["integration-projects"],
    queryFn: async (): Promise<ProjectOption[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
    staleTime: 1000 * 60,
  });

const providerNames: Record<IntegrationKey, string> = {
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  google_docs: "Google Docs",
  github: "GitHub",
  webhooks: "Webhooks",
};

export function GoogleIntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as GoogleTab) ?? "gmail";
  const [tab, setTab] = useState<GoogleTab>(TABS.includes(initialTab) ? initialTab : "gmail");

  useEffect(() => {
    document.title = "Google Integrations";
  }, []);

  const handleTabChange = (value: string) => {
    if (TABS.includes(value as GoogleTab)) {
      setTab(value as GoogleTab);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", value);
        return next;
      });
    }
  };

  const { toast } = useToast();
  const {
    integrations,
    userIntegrations,
    isConnecting,
    isDisconnecting,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrations();

  const connectionMap = useMemo(() => {
    return userIntegrations.reduce<Record<string, { id: string; displayName?: string | null }>>(
      (acc, integration) => {
        if (!integration.project_id) {
          acc[integration.provider] = {
            id: integration.id,
            displayName: integration.display_name,
          };
        }
        return acc;
      },
      {}
    );
  }, [userIntegrations]);

  const { data: projects = [], isLoading: loadingProjects } = useProjectOptions();

  const [gmailSubject, setGmailSubject] = useState("");
  const [gmailFrom, setGmailFrom] = useState("");
  const [gmailMessageId, setGmailMessageId] = useState("");
  const [gmailLink, setGmailLink] = useState("");
  const [gmailProjectId, setGmailProjectId] = useState<string>("");
  const [creatingTask, setCreatingTask] = useState(false);

  const calendarRecord = integrations.find((item) => item.key === "google_drive");
  const [calendarId, setCalendarId] = useState<string>(
    calendarRecord?.config?.calendar_id_default ?? ""
  );
  const [savingCalendarId, setSavingCalendarId] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    id: string;
    summary: string;
    start: string;
    end: string;
    link: string;
  }>>([]);
  const [fetchingEvents, setFetchingEvents] = useState(false);
  const [eventUrl, setEventUrl] = useState("");
  const [eventTaskId, setEventTaskId] = useState("");
  const [linkingEvent, setLinkingEvent] = useState(false);

  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [docEntityId, setDocEntityId] = useState("");
  const [linkingDoc, setLinkingDoc] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

  const busy = isConnecting || isDisconnecting;

  useEffect(() => {
    const defaultId = calendarRecord?.config?.calendar_id_default;
    if (defaultId && !calendarId) {
      setCalendarId(defaultId);
    }
  }, [calendarRecord?.config?.calendar_id_default, calendarId]);

  const handleConnect = async (provider: IntegrationKey) => {
    try {
      await connectIntegration({ provider: provider as any, accessData: { mock: true } });
      toast({
        title: "Connected",
        description: `${providerNames[provider]} ready to use.`,
      });
    } catch (error: any) {
      toast({
        title: "Connect failed",
        description: error?.message ?? "Try again after refreshing.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async (provider: IntegrationKey) => {
    const existing = connectionMap[provider];
    if (!existing) return;
    try {
      await disconnectIntegration(existing.id);
      toast({ title: "Disconnected", description: "Connection removed." });
    } catch (error: any) {
      toast({
        title: "Disconnect failed",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateTaskFromEmail = async () => {
    if (!gmailProjectId) {
      toast({
        title: "Choose a project",
        description: "Select the project that should receive the task.",
        variant: "destructive",
      });
      return;
    }

    setCreatingTask(true);
    try {
      await createTaskFromEmail({
        projectId: gmailProjectId,
        subject: gmailSubject,
        from: gmailFrom,
        messageId: gmailMessageId,
        link: gmailLink,
      });

      toast({
        title: "Task created",
        description: "The email is now tracked as a task.",
      });

      setGmailSubject("");
      setGmailFrom("");
      setGmailMessageId("");
      setGmailLink("");
    } catch (error: any) {
      toast({
        title: "Unable to create task",
        description: error?.message ?? "Check the fields and try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const handleSaveCalendarId = async () => {
    if (!calendarId.trim()) {
      toast({
        title: "Calendar ID required",
        description: "Enter the default calendar ID or ICS link.",
        variant: "destructive",
      });
      return;
    }

    setSavingCalendarId(true);
    try {
      await saveCalendarDefault({ calendarId: calendarId.trim() });
      toast({ title: "Calendar saved", description: "Default calendar updated." });
    } catch (error: any) {
      toast({
        title: "Unable to save",
        description: error?.message ?? "Try again later.",
        variant: "destructive",
      });
    } finally {
      setSavingCalendarId(false);
    }
  };

  const handleFetchEvents = async () => {
    setFetchingEvents(true);
    try {
      const events = await listEventsMock({
        from: new Date(),
        to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        projectId: undefined,
      });
      setCalendarEvents(events);
    } catch (error: any) {
      toast({
        title: "Unable to fetch events",
        description: error?.message ?? "Try again soon.",
        variant: "destructive",
      });
    } finally {
      setFetchingEvents(false);
    }
  };

  const handleLinkEvent = async () => {
    if (!eventUrl.trim() || !eventTaskId.trim()) {
      toast({
        title: "Missing details",
        description: "Include the event link and task ID.",
        variant: "destructive",
      });
      return;
    }

    setLinkingEvent(true);
    try {
      await addLinkedResource({
        provider: "google_calendar",
        external_type: "event",
        external_id: eventUrl.trim(),
        url: eventUrl.trim(),
        title: "Calendar event",
        metadata: {},
        entity_type: "task",
        entity_id: eventTaskId.trim(),
        project_id: null,
      });
      toast({ title: "Event linked", description: "The task now references the calendar event." });
      setEventUrl("");
      setEventTaskId("");
    } catch (error: any) {
      toast({
        title: "Unable to link event",
        description: error?.message ?? "Try again.",
        variant: "destructive",
      });
    } finally {
      setLinkingEvent(false);
    }
  };

  const handleLinkDoc = async () => {
    if (!docEntityId.trim() || !docUrl.trim() || !docTitle.trim()) {
      toast({
        title: "Missing info",
        description: "Provide the doc ID, title, and URL.",
        variant: "destructive",
      });
      return;
    }

    setLinkingDoc(true);
    try {
      const resource = await linkDoc({
        entityType: "doc",
        entityId: docEntityId.trim(),
        url: docUrl.trim(),
        title: docTitle.trim(),
        projectId: null,
      });
      toast({ title: "Doc linked", description: "The document is now tracked." });
      setDocPreviewUrl(resource.url ?? docUrl.trim());
    } catch (error: any) {
      toast({
        title: "Unable to link doc",
        description: error?.message ?? "Check the details and try again.",
        variant: "destructive",
      });
    } finally {
      setLinkingDoc(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/integrations">Integrations</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Google</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Google integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect Gmail, Calendar, and Docs for smoother coordination.
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="gmail">Gmail</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="gmail" className="space-y-6">
          <ConnectCard
            title="Gmail"
            description="Use your inbox to create tasks and follow-ups."
            isConnected={Boolean(connectionMap.gmail)}
            isBusy={busy}
            onConnect={() => handleConnect("gmail")}
            onDisconnect={() => handleDisconnect("gmail")}
          >
            {connectionMap.gmail?.displayName ? (
              <p className="text-sm text-muted-foreground">
                Connected as {connectionMap.gmail.displayName}
              </p>
            ) : null}
          </ConnectCard>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Create task from email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="gmail-project">Project</Label>
                <select
                  id="gmail-project"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={gmailProjectId}
                  onChange={(event) => setGmailProjectId(event.target.value)}
                  disabled={loadingProjects}
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-subject">Subject</Label>
                <Input
                  id="gmail-subject"
                  value={gmailSubject}
                  onChange={(event) => setGmailSubject(event.target.value)}
                  placeholder="Weekly planning thread"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-from">From</Label>
                <Input
                  id="gmail-from"
                  value={gmailFrom}
                  onChange={(event) => setGmailFrom(event.target.value)}
                  placeholder="sender@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-message">Message ID</Label>
                <Input
                  id="gmail-message"
                  value={gmailMessageId}
                  onChange={(event) => setGmailMessageId(event.target.value)}
                  placeholder="<unique-message-id@domain.com>"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-link">Link (optional)</Label>
                <Input
                  id="gmail-link"
                  value={gmailLink}
                  onChange={(event) => setGmailLink(event.target.value)}
                  placeholder="https://mail.google.com/..."
                />
              </div>
              <Button onClick={handleCreateTaskFromEmail} disabled={creatingTask}>
                {creatingTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create task
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <ConnectCard
            title="Google Calendar"
            description="Sync key dates with shared calendars."
            isConnected={Boolean(connectionMap.google_calendar)}
            isBusy={busy || savingCalendarId || fetchingEvents}
            onConnect={() => handleConnect("google_calendar")}
            onDisconnect={() => handleDisconnect("google_calendar")}
          >
            <div className="space-y-2">
              <Label htmlFor="calendar-id">Default calendar</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="calendar-id"
                  value={calendarId}
                  onChange={(event) => setCalendarId(event.target.value)}
                  placeholder="Primary calendar ID or ICS URL"
                  disabled={savingCalendarId}
                />
                <Button onClick={handleSaveCalendarId} disabled={savingCalendarId}>
                  {savingCalendarId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          </ConnectCard>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Upcoming events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleFetchEvents} variant="outline" size="sm" disabled={fetchingEvents}>
                {fetchingEvents ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Fetch sample events
              </Button>
              <div className="space-y-2">
                {calendarEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events fetched yet.</p>
                ) : (
                  calendarEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border px-3 py-2 text-sm">
                      <p className="font-medium">{event.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.start).toLocaleString()} – {new Date(event.end).toLocaleString()}
                      </p>
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View event
                      </a>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Link event to task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="event-url">Event link</Label>
                <Input
                  id="event-url"
                  value={eventUrl}
                  onChange={(event) => setEventUrl(event.target.value)}
                  placeholder="https://calendar.google.com/event?..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-task">Task ID</Label>
                <Input
                  id="event-task"
                  value={eventTaskId}
                  onChange={(event) => setEventTaskId(event.target.value)}
                  placeholder="Task UUID"
                />
              </div>
              <Button onClick={handleLinkEvent} disabled={linkingEvent}>
                {linkingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Link event
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <ConnectCard
            title="Google Docs"
            description="Attach docs and share live updates."
            isConnected={Boolean(connectionMap.google_docs)}
            isBusy={busy || linkingDoc}
            onConnect={() => handleConnect("google_docs")}
            onDisconnect={() => handleDisconnect("google_docs")}
          />

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Link a doc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="doc-id">Doc ID</Label>
                <Input
                  id="doc-id"
                  value={docEntityId}
                  onChange={(event) => setDocEntityId(event.target.value)}
                  placeholder="Document entity ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={docTitle}
                  onChange={(event) => setDocTitle(event.target.value)}
                  placeholder="Quarterly brief"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-url">Google Doc URL</Label>
                <Input
                  id="doc-url"
                  value={docUrl}
                  onChange={(event) => setDocUrl(event.target.value)}
                  placeholder="https://docs.google.com/document/..."
                />
              </div>
              <Button onClick={handleLinkDoc} disabled={linkingDoc}>
                {linkingDoc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Link doc
              </Button>
              {docPreviewUrl ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preview</p>
                  <iframe
                    title="Google Doc preview"
                    src={`${docPreviewUrl}${docPreviewUrl.includes("?") ? "&" : "?"}embedded=true`}
                    className="h-64 w-full rounded-md border"
                    allow="clipboard-write; encrypted-media"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {docEntityId ? (
            <LinkedResourcesPanel
              entityType="doc"
              entityId={docEntityId}
              projectId={null}
              title="Doc links"
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GoogleIntegrationsPage;
