import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
import { listEventsMock } from "@/services/googleCalendar";
import { linkDoc } from "@/services/googleDocs";
import { addLinkedResource } from "@/services/linkedResources";
import { supabase } from "@/integrations/supabase/client";
import type { IntegrationKey } from "@/types";
import { Loader2 } from "lucide-react";

export function ProjectGoogleIntegrationsPage() {
  const { projectId = "" } = useParams();

  useEffect(() => {
    document.title = "Project Google Integrations";
  }, []);

  const { toast } = useToast();
  const {
    userIntegrations,
    isConnecting,
    isDisconnecting,
    connectIntegration,
    disconnectIntegration,
  } = useIntegrations({ projectId });

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30,
  });

  const connectionMap = useMemo(() => {
    return userIntegrations.reduce<Record<string, { id: string; displayName?: string | null }>>(
      (acc, integration) => {
        if (integration.project_id === projectId) {
          acc[integration.provider] = {
            id: integration.id,
            displayName: integration.display_name,
          };
        }
        return acc;
      },
      {}
    );
  }, [projectId, userIntegrations]);

  useEffect(() => {
    if (project?.name) {
      document.title = `${project.name} • Google integrations`;
    }
  }, [project?.name]);

  const [gmailSubject, setGmailSubject] = useState("");
  const [gmailFrom, setGmailFrom] = useState("");
  const [gmailMessageId, setGmailMessageId] = useState("");
  const [gmailLink, setGmailLink] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

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
  const [linkingDoc, setLinkingDoc] = useState(false);

  const busy = isConnecting || isDisconnecting;

  const handleConnect = async (provider: IntegrationKey) => {
    try {
      await connectIntegration({ provider: provider as any, projectId, accessData: { mock: true } });
      toast({ title: "Connected", description: `${provider} ready for this project.` });
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
      toast({ title: "Disconnected", description: "Project connection removed." });
    } catch (error: any) {
      toast({
        title: "Disconnect failed",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateTaskFromEmail = async () => {
    setCreatingTask(true);
    try {
      await createTaskFromEmail({
        projectId,
        subject: gmailSubject,
        from: gmailFrom,
        messageId: gmailMessageId,
        link: gmailLink,
      });
      toast({ title: "Task created", description: "Email captured as a task." });
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

  const handleFetchEvents = async () => {
    setFetchingEvents(true);
    try {
      const events = await listEventsMock({
        from: new Date(),
        to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        projectId,
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
        project_id: projectId,
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
    if (!docUrl.trim() || !docTitle.trim()) {
      toast({
        title: "Missing info",
        description: "Provide the doc title and URL.",
        variant: "destructive",
      });
      return;
    }

    setLinkingDoc(true);
    try {
      await linkDoc({
        entityType: "project",
        entityId: projectId,
        url: docUrl.trim(),
        title: docTitle.trim(),
        projectId,
      });
      toast({ title: "Doc linked", description: "The doc is now attached to this project." });
      setDocTitle("");
      setDocUrl("");
    } catch (error: any) {
      toast({
        title: "Unable to link doc",
        description: error?.message ?? "Try again.",
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
              <Link to="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {projectId ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}/overview`}>{project?.name ?? "Project"}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}/integrations`}>Integrations</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          ) : null}
          <BreadcrumbItem>
            <BreadcrumbPage>Google</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Google for {project?.name ?? "project"}</h1>
        <p className="text-sm text-muted-foreground">Connect Gmail, Calendar, and Docs specifically for this project.</p>
      </div>

      <Tabs defaultValue="gmail" className="space-y-6">
        <TabsList>
          <TabsTrigger value="gmail">Gmail</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="gmail" className="space-y-6">
          <ConnectCard
            title="Gmail"
            description="Keep project emails actionable."
            isConnected={Boolean(connectionMap.gmail)}
            isBusy={busy}
            onConnect={() => handleConnect("gmail")}
            onDisconnect={() => handleDisconnect("gmail")}
          />

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Create task from email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Project</Label>
                <Input value={project?.name ?? projectId} readOnly />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gmail-subject">Subject</Label>
                <Input
                  id="gmail-subject"
                  value={gmailSubject}
                  onChange={(event) => setGmailSubject(event.target.value)}
                  placeholder="Weekly review"
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
            description="Link project milestones to team calendars."
            isConnected={Boolean(connectionMap.google_calendar)}
            isBusy={busy || fetchingEvents || linkingEvent}
            onConnect={() => handleConnect("google_calendar")}
            onDisconnect={() => handleDisconnect("google_calendar")}
          />

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

          <LinkedResourcesPanel
            entityType="project"
            entityId={projectId}
            projectId={projectId}
            title="Project calendar links"
          />
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <ConnectCard
            title="Google Docs"
            description="Attach docs that matter to this project."
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
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={docTitle}
                  onChange={(event) => setDocTitle(event.target.value)}
                  placeholder="Project brief"
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
            </CardContent>
          </Card>

          <LinkedResourcesPanel
            entityType="project"
            entityId={projectId}
            projectId={projectId}
            title="Project doc links"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectGoogleIntegrationsPage;
