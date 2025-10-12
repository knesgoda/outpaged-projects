// @ts-nocheck
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DocToolbar } from "@/components/docs/DocToolbar";
import { VersionHistory } from "@/components/docs/VersionHistory";
import {
  useCreateDocVersion,
  useDeleteDoc,
  useDoc,
  useDocVersions,
  useRestoreDocVersion,
  useUpdateDoc,
} from "@/hooks/useDocs";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { listDocs } from "@/services/docs";

import type { DocPage } from "@/types";

type OutlineItem = { id: string; level: number; text: string };
type DocLinkItem = { text: string; url: string; isExternal: boolean };
type TaskItem = { text: string; checked: boolean };

type DocComputedDetails = {
  html: string;
  outline: OutlineItem[];
  links: DocLinkItem[];
  tasks: TaskItem[];
  wordCount: number;
  readTimeMinutes: number;
};

function computeDetails(doc: DocPage | null): DocComputedDetails {
  if (!doc) {
    return { html: "", outline: [], links: [], tasks: [], wordCount: 0, readTimeMinutes: 1 };
  }

  const slugger = new marked.Slugger();
  const outline: OutlineItem[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = (text, level, raw) => {
    const slug = slugger.slug(raw ?? text);
    const plain = text.replace(/<[^>]+>/g, "");
    outline.push({ id: slug, level, text: plain });
    return `<h${level} id="${slug}">${text}</h${level}>`;
  };

  const rawHtml = marked.parse(doc.body_markdown ?? "", {
    renderer,
    headerIds: false,
    mangle: false,
  }) as string;
  const html = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ["id"] });

  const linkMatches = [...(doc.body_markdown.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g))];
  const links = linkMatches
    .map(([, text, url]) => ({
      text: text.trim(),
      url: url.trim(),
      isExternal: /^https?:\/\//i.test(url.trim()),
    }))
    .filter(
      (item, index, array) =>
        array.findIndex((candidate) => candidate.text === item.text && candidate.url === item.url) === index
    );

  const taskMatches = [...(doc.body_markdown.matchAll(/- \[( |x)\] (.+)/g))];
  const tasks = taskMatches.map(([, checked, text]) => ({
    text: text.trim(),
    checked: checked.trim().toLowerCase() === "x",
  }));

  const plainBody = doc.body_markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[#>*_\-]/g, " ");
  const words = plainBody
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const wordCount = words.length;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 225) || 1);

  return {
    html,
    outline,
    links,
    tasks,
    wordCount,
    readTimeMinutes,
  };
}

function scrollToHeading(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function deriveCollaborators(doc: DocPage | null) {
  if (!doc) return [] as Array<{ id: string; label: string; initials: string }>;
  const seeds = [doc.owner, doc.updated_by ?? doc.owner, doc.created_by ?? doc.owner].filter(Boolean) as string[];
  const labels = ["Owner", "Editor", "Reviewer", "Viewer"];
  const uniqueSeeds = Array.from(new Set(seeds));
  return uniqueSeeds.slice(0, labels.length).map((seed, index) => {
    const alpha = seed.replace(/[^a-z]/gi, "");
    const initials = alpha ? alpha.slice(0, 2).toUpperCase() : seed.slice(0, 2).toUpperCase();
    return {
      id: `${seed}-${index}`,
      label: labels[index] ?? `Collaborator ${index + 1}`,
      initials: initials || labels[index]?.slice(0, 2).toUpperCase() || "US",
    };
  });
}

export default function DocDetail() {
  const params = useParams<{ docId: string }>();
  const docIdParam = params.docId;
  const docId = docIdParam ?? "";
  const navigate = useNavigate();
  const [showVersions, setShowVersions] = useState(false);
  const [restoringVersionNumber, setRestoringVersionNumber] = useState<number | null>(null);

  const docQuery = useDoc(docIdParam ?? undefined);
  const deleteDoc = useDeleteDoc();
  const updateDoc = useUpdateDoc(docId);
  const createVersion = useCreateDocVersion(docId);
  const restoreVersion = useRestoreDocVersion(docId);
  const versionsQuery = useDocVersions(showVersions && docIdParam ? docIdParam : undefined);

  useDocumentTitle(docQuery.data ? `Docs / ${docQuery.data.title}` : "Docs");

  const doc = docQuery.data ?? null;
  const computed = useMemo(() => computeDetails(doc), [doc]);
  const collaborators = useMemo(() => deriveCollaborators(doc), [doc]);

  const handleDelete = async () => {
    if (!doc || !docIdParam) return;

    try {
      const children = await listDocs({ parentId: doc.id, projectId: doc.project_id ?? undefined });
      if (children.length > 0) {
        window.alert("This doc has child pages. Move or delete them before removing this doc.");
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify child docs.";
      window.alert(message);
      return;
    }

    if (!window.confirm("Delete this doc?")) {
      return;
    }

    try {
      await deleteDoc.mutateAsync(docIdParam);
      navigate("/docs");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete the doc.";
      window.alert(message);
    }
  };

  const handleTogglePublish = async (next: boolean) => {
    if (!docIdParam) return;
    try {
      await updateDoc.mutateAsync({ is_published: next });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update publish state.";
      window.alert(message);
    }
  };

  const handleSnapshot = async () => {
    if (!docIdParam) return;
    try {
      await createVersion.mutateAsync();
      setShowVersions(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create version.";
      window.alert(message);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    if (!docIdParam) return;
    try {
      setRestoringVersionNumber(versionNumber);
      await restoreVersion.mutateAsync(versionNumber);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore version.";
      window.alert(message);
    } finally {
      setRestoringVersionNumber(null);
    }
  };

  if (docQuery.isLoading) {
    return (
      <section className="space-y-4 p-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (docQuery.isError) {
    const message = docQuery.error instanceof Error ? docQuery.error.message : "Unable to load the doc.";
    return (
      <section className="p-6">
        <p className="text-sm text-destructive">{message}</p>
      </section>
    );
  }

  if (!doc || !docIdParam) {
    return (
      <section className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Doc not found.</p>
        <Button variant="link" onClick={() => navigate("/docs")}>
          Back to docs
        </Button>
      </section>
    );
  }

  const infoRows = [
    { label: "Owner", value: doc.owner || "—" },
    { label: "Created", value: formatTimestamp(doc.created_at) },
    { label: "Updated", value: formatTimestamp(doc.updated_at) },
    { label: "Version", value: `v${doc.version}` },
    { label: "Slug", value: doc.slug ?? "—" },
    { label: "State", value: doc.is_published ? "Published" : "Draft" },
    { label: "Word count", value: computed.wordCount.toLocaleString() },
    { label: "Read time", value: `~${computed.readTimeMinutes} min` },
  ];

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/docs">Docs</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>{doc.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Updated {formatTimestamp(doc.updated_at)}</span>
              <Separator orientation="vertical" className="hidden h-4 sm:block" />
              <span>Owner {doc.owner || "—"}</span>
              <Separator orientation="vertical" className="hidden h-4 sm:block" />
              <span>
                {computed.wordCount.toLocaleString()} words · ~{computed.readTimeMinutes} min read
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={doc.is_published ? "default" : "secondary"}>
              {doc.is_published ? "Published" : "Draft"}
            </Badge>
            <Badge variant="outline">v{doc.version}</Badge>
            {doc.slug ? <Badge variant="outline">{doc.slug}</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <div className="flex -space-x-2">
                {collaborators.map((person) => (
                  <Tooltip key={person.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 border border-background">
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {person.initials}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{person.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
            <Button variant="outline" size="sm">
              Follow
            </Button>
            <Button variant="outline" size="sm">
              Subscribe
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr] xl:grid-cols-[260px,1fr,220px]">
        <aside className="order-2 space-y-4 lg:order-1">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Doc context</CardTitle>
              <CardDescription>Metadata, references, and todos for this page.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs defaultValue="info" className="w-full">
                <div className="flex items-start gap-4">
                  <TabsList className="flex w-28 flex-col gap-1 bg-transparent p-0">
                    <TabsTrigger value="info" className="justify-start text-left">
                      Info
                    </TabsTrigger>
                    <TabsTrigger value="links" className="justify-start text-left">
                      Links
                    </TabsTrigger>
                    <TabsTrigger value="outline" className="justify-start text-left">
                      Outline
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="justify-start text-left">
                      Tasks
                    </TabsTrigger>
                  </TabsList>
                  <div className="min-h-[180px] flex-1">
                    <TabsContent value="info" className="m-0 space-y-3">
                      <ul className="space-y-2 text-sm">
                        {infoRows.map((row) => (
                          <li key={row.label} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium">{row.value}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-1">
                        <p className="text-xs font-medium uppercase text-muted-foreground">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">No tags yet</Badge>
                          <Button variant="ghost" size="sm">
                            Add tag
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="links" className="m-0">
                      {computed.links.length ? (
                        <ul className="space-y-2 text-sm">
                          {computed.links.map((link) => (
                            <li key={`${link.text}-${link.url}`} className="space-y-1">
                              <p className="font-medium">{link.text}</p>
                              {link.isExternal ? (
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary underline"
                                >
                                  {link.url}
                                </a>
                              ) : (
                                <Link to={link.url} className="text-xs text-primary underline">
                                  {link.url}
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No references yet.</p>
                      )}
                    </TabsContent>
                    <TabsContent value="outline" className="m-0">
                      {computed.outline.length ? (
                        <ul className="space-y-1 text-sm">
                          {computed.outline.map((heading) => (
                            <li key={heading.id}>
                              <button
                                type="button"
                                onClick={() => scrollToHeading(heading.id)}
                                className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                                style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                              >
                                {heading.text}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No headings detected.</p>
                      )}
                    </TabsContent>
                    <TabsContent value="tasks" className="m-0 space-y-2">
                      {computed.tasks.length ? (
                        computed.tasks.map((task, index) => (
                          <label key={`${task.text}-${index}`} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={task.checked} disabled />
                            <span className={task.checked ? "text-muted-foreground line-through" : undefined}>
                              {task.text}
                            </span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No inline tasks captured.</p>
                      )}
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </aside>

        <main className="order-1 space-y-6 lg:order-2">
          <Card>
            <CardHeader className="space-y-4">
              <CardTitle className="text-base">Document body</CardTitle>
              <CardDescription>Use the toolbar to manage publishing, history, and structure.</CardDescription>
              <DocToolbar
                doc={doc}
                onEdit={() => navigate(`/docs/${doc.id}/edit`)}
                onCreateChild={() => navigate(`/docs/new?parentId=${doc.id}`)}
                onShowVersions={() => setShowVersions((value) => !value)}
                onDelete={handleDelete}
                onTogglePublish={handleTogglePublish}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSnapshot}
                  disabled={createVersion.isPending}
                >
                  {createVersion.isPending ? "Saving" : "Save version"}
                </Button>
                {showVersions ? (
                  <span className="text-xs text-muted-foreground">Showing history below</span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="prose max-w-none">
              {doc.body_markdown ? (
                <div dangerouslySetInnerHTML={{ __html: computed.html }} />
              ) : (
                <p className="text-sm text-muted-foreground">No content yet.</p>
              )}
            </CardContent>
          </Card>

          {showVersions ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Version history</CardTitle>
              </CardHeader>
              <CardContent>
                {versionsQuery.isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : versionsQuery.isError ? (
                  <p className="text-sm text-destructive">Unable to load versions.</p>
                ) : (
                  <VersionHistory
                    versions={versionsQuery.data ?? []}
                    onRestore={handleRestore}
                    isRestoring={restoreVersion.isPending}
                    restoringVersion={restoringVersionNumber}
                  />
                )}
              </CardContent>
            </Card>
          ) : null}
        </main>

        <aside className="order-3 hidden xl:block">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Outline</CardTitle>
              <CardDescription>Jump to any section.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[420px]">
                {computed.outline.length ? (
                  <ul className="space-y-1 text-sm">
                    {computed.outline.map((heading) => (
                      <li key={heading.id}>
                        <button
                          type="button"
                          onClick={() => scrollToHeading(heading.id)}
                          className="w-full rounded px-2 py-1 text-left hover:bg-muted"
                          style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                        >
                          {heading.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No headings yet.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
