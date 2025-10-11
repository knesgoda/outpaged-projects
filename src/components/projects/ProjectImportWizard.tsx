import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { importFromJira, importMappedItems, type ImportItem } from "@/services/projectImports";
import { cloneProject } from "@/services/projects";

const sources = [
  {
    id: "jira",
    name: "Jira Cloud",
    description: "Connect to Jira and import issues, comments, and metadata.",
  },
  {
    id: "monday",
    name: "Monday.com",
    description: "Upload a JSON export or CSV of a Monday board to migrate items.",
  },
  {
    id: "trello",
    name: "Trello",
    description: "Drag-and-drop a Trello JSON export to convert lists and cards.",
  },
  {
    id: "asana",
    name: "Asana",
    description: "Paste CSV export from Asana to re-create tasks, sections, and assignees.",
  },
  {
    id: "csv",
    name: "Spreadsheet",
    description: "Import structured CSV or Excel exports with custom field mapping.",
  },
] as const;

type SourceId = (typeof sources)[number]["id"];

type WizardStep = "source" | "ingest" | "mapping" | "preview" | "apply";

interface ProjectImportWizardProps {
  projectId: string;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result: { imported: number; sandboxProjectId?: string }) => void;
}

const targetFields = [
  { id: "title", label: "Title" },
  { id: "description", label: "Description" },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "dueDate", label: "Due date" },
  { id: "storyPoints", label: "Story points" },
];

const normalizePriority = (value?: string | null) => {
  if (!value) return "medium";
  const normalized = value.toLowerCase();
  if (normalized.includes("high") || normalized.includes("p1")) return "high";
  if (normalized.includes("crit")) return "urgent";
  if (normalized.includes("low") || normalized.includes("p4")) return "low";
  return "medium";
};

const parseCsv = (text: string) => {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(header => header.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",");
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index]?.trim() ?? "";
      return acc;
    }, {});
  });
};

const normalizeItems = (records: Record<string, any>[], mapping: Record<string, string>) => {
  return records.map(record => ({
    title: record[mapping.title] ?? "Untitled item",
    description: mapping.description ? record[mapping.description] ?? "" : "",
    status: mapping.status ? (record[mapping.status] ?? "todo") : "todo",
    priority: normalizePriority(mapping.priority ? record[mapping.priority] : undefined),
    dueDate: mapping.dueDate ? record[mapping.dueDate] ?? undefined : undefined,
    storyPoints: mapping.storyPoints ? Number(record[mapping.storyPoints]) || undefined : undefined,
  }));
};

export function ProjectImportWizard({ projectId, projectName, open, onOpenChange, onComplete }: ProjectImportWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("source");
  const [source, setSource] = useState<SourceId | null>(null);
  const [jiraCredentials, setJiraCredentials] = useState({
    jiraUrl: "",
    email: "",
    apiToken: "",
    projectKey: "",
  });
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({ title: "name" });
  const [mappedItems, setMappedItems] = useState<ImportItem[]>([]);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetWizard = () => {
    setStep("source");
    setSource(null);
    setJiraCredentials({ jiraUrl: "", email: "", apiToken: "", projectKey: "" });
    setRecords([]);
    setMapping({ title: "name" });
    setMappedItems([]);
    setSandboxMode(false);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetWizard();
    }
    onOpenChange(nextOpen);
  };

  const handleSourceSelect = (nextSource: SourceId) => {
    setSource(nextSource);
    setStep("ingest");
  };

  const handleFileUpload = async (file: File) => {
    const text = await file.text();
    const extension = file.name.split(".").pop()?.toLowerCase();
    let parsed: Record<string, any>[] = [];

    try {
      if (extension === "json") {
        parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) {
          throw new Error("JSON export must be an array of items");
        }
      } else {
        parsed = parseCsv(text);
      }
      setRecords(parsed);
      if (parsed.length) {
        const defaultMapping: Record<string, string> = { title: Object.keys(parsed[0])[0] };
        setMapping(defaultMapping);
        setStep("mapping");
        toast({ title: "Data imported", description: `Loaded ${parsed.length} records.` });
      }
    } catch (parseError: any) {
      console.error(parseError);
      setError(parseError?.message ?? "Unable to parse the uploaded file.");
    }
  };

  const mappedPreview = useMemo(() => {
    if (!records.length) return [];
    return normalizeItems(records, mapping).slice(0, 10);
  }, [records, mapping]);

  const handleMappingContinue = () => {
    if (!records.length) {
      setError("Upload data before mapping.");
      return;
    }
    const items = normalizeItems(records, mapping);
    setMappedItems(items);
    setStep("preview");
  };

  const handleApply = async () => {
    try {
      setIsProcessing(true);
      let targetProjectId = projectId;
      let sandboxProjectId: string | undefined;

      if (sandboxMode) {
        const cloneName = `${projectName ?? "Project"} (Import Sandbox)`;
        const result = await cloneProject(projectId, {
          name: cloneName,
          options: { includeBoards: true, includeAutomations: false, includeFields: true, includeItems: false },
        });
        sandboxProjectId = result.projectId ?? result.id ?? undefined;
        if (sandboxProjectId) {
          targetProjectId = sandboxProjectId;
        }
      }

      if (source === "jira") {
        await importFromJira({
          ...jiraCredentials,
          targetProjectId,
        });
        onComplete?.({ imported: 0, sandboxProjectId });
        toast({ title: "Jira import started", description: "We will sync issues in the background." });
      } else {
        const result = await importMappedItems(targetProjectId, mappedItems);
        onComplete?.({ imported: result.inserted, sandboxProjectId });
        toast({ title: "Import complete", description: `Created ${result.inserted} items.` });
      }

      handleOpenChange(false);
    } catch (applyError: any) {
      console.error(applyError);
      setError(applyError?.message ?? "Unable to import items.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import work into {projectName ?? "this project"}</DialogTitle>
          <DialogDescription>
            Map tasks from Jira, Monday.com, Trello, Asana, or spreadsheets into a sandbox or live project.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Import issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {step === "source" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {sources.map(option => (
              <Card
                key={option.id}
                className="cursor-pointer border hover:border-primary"
                onClick={() => handleSourceSelect(option.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{option.name}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {step === "ingest" && source === "jira" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Jira URL</Label>
              <Input
                placeholder="https://your-domain.atlassian.net"
                value={jiraCredentials.jiraUrl}
                onChange={event => setJiraCredentials(prev => ({ ...prev, jiraUrl: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={jiraCredentials.email}
                onChange={event => setJiraCredentials(prev => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>API token</Label>
              <Input
                type="password"
                value={jiraCredentials.apiToken}
                onChange={event => setJiraCredentials(prev => ({ ...prev, apiToken: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Project key</Label>
              <Input
                value={jiraCredentials.projectKey}
                onChange={event => setJiraCredentials(prev => ({ ...prev, projectKey: event.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep("source")}>Back</Button>
              <Button
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    await importFromJira({
                      ...jiraCredentials,
                      targetProjectId: projectId,
                    });
                    toast({
                      title: "Jira import initiated",
                      description: "Issues will sync in the background.",
                    });
                    handleOpenChange(false);
                  } catch (jiraError: any) {
                    setError(jiraError?.message ?? "Unable to start Jira import.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={!jiraCredentials.jiraUrl || !jiraCredentials.email || !jiraCredentials.apiToken || !jiraCredentials.projectKey || isProcessing}
              >
                {isProcessing ? "Starting…" : "Start import"}
              </Button>
            </div>
          </div>
        )}

        {step === "ingest" && source && source !== "jira" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Upload export file</Label>
              <Input
                type="file"
                accept=".csv,.json"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
              />
            </div>
            <div>
              <Button variant="outline" onClick={() => setStep("source")}>Back</Button>
            </div>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Map source fields to project fields</Label>
              <p className="text-xs text-muted-foreground">
                Choose which columns map to title, status, priority, and other fields.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {targetFields.map(field => (
                <div key={field.id} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Select
                    value={mapping[field.id] ?? ""}
                    onValueChange={value => setMapping(prev => ({ ...prev, [field.id]: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {(records[0] ? Object.keys(records[0]) : ["name", "status", "priority", "due_date"]).map(column => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("ingest")}>Back</Button>
              <Button onClick={handleMappingContinue}>Continue</Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Preview items</Label>
              <p className="text-xs text-muted-foreground">
                Verify the first few rows before applying the import.
              </p>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                    <th className="px-4 py-2 text-left">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedPreview.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{item.title}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{item.status}</Badge>
                      </td>
                      <td className="px-4 py-2">{item.priority}</td>
                      <td className="px-4 py-2">{item.dueDate ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>Back</Button>
              <Button onClick={() => setStep("apply")}>Continue</Button>
            </div>
          </div>
        )}

        {step === "apply" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Import destination</Label>
              <p className="text-xs text-muted-foreground">
                You can stage the import into a sandbox clone or apply directly to {projectName ?? "this project"}.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Sandbox mode</p>
                <p className="text-xs text-muted-foreground">
                  Creates a clone of the project and imports items there so you can validate before publishing.
                </p>
              </div>
              <Switch checked={sandboxMode} onCheckedChange={setSandboxMode} />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")}>Back</Button>
              <Button onClick={handleApply} disabled={isProcessing}>
                {isProcessing ? "Importing…" : "Run import"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
