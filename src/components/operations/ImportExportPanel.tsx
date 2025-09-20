import { useState } from "react";
import { KeyRound, UploadCloud, Workflow } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useOperations } from "./OperationsProvider";

export function ImportExportPanel() {
  const { importJobs, exportJobs, apiTokens, recordImportJob, updateImportJobStatus, recordExport, manageToken } = useOperations();
  const [importDraft, setImportDraft] = useState({ type: "csv", mapping: "title=Title,status=Status" });
  const [exportDraft, setExportDraft] = useState({ format: "csv", scope: "incidents" });
  const [tokenDraft, setTokenDraft] = useState({ name: "" });

  const handleCreateImport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const job = recordImportJob({ type: importDraft.type as "csv" | "jira" | "monday", mapping: Object.fromEntries(importDraft.mapping.split(",").map((pair) => pair.split("="))) });
    updateImportJobStatus(job.id, "validating");
    setTimeout(() => updateImportJobStatus(job.id, "completed"), 1000);
    setImportDraft({ type: "csv", mapping: "title=Title,status=Status" });
  };

  const handleCreateExport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = apiTokens.find((t) => !t.revoked) ?? manageToken({ name: "Ops API" });
    recordExport({ format: exportDraft.format as "csv" | "json", scope: exportDraft.scope, tokenId: token.id });
    setExportDraft({ format: "csv", scope: "incidents" });
  };

  const handleCreateToken = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tokenDraft.name) return;
    manageToken({ name: tokenDraft.name });
    setTokenDraft({ name: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importers & exports</CardTitle>
        <CardDescription>
          Migrate work from CSV, Jira, and Monday, then audit every export and API token usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateImport} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label>Import source</Label>
            <Select value={importDraft.type} onValueChange={(value) => setImportDraft((prev) => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="jira">Jira</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-7 space-y-2">
            <Label>Field mapping</Label>
            <Input
              value={importDraft.mapping}
              onChange={(event) => setImportDraft((prev) => ({ ...prev, mapping: event.target.value }))}
              placeholder="title=Title,status=Status"
            />
          </div>
          <div className="lg:col-span-2 flex items-end justify-end">
            <Button type="submit">
              <UploadCloud className="h-4 w-4 mr-2" /> Queue import
            </Button>
          </div>
        </form>

        <div className="space-y-3 text-sm">
          {importJobs.length === 0 ? (
            <p className="text-muted-foreground">No imports submitted yet.</p>
          ) : (
            importJobs.map((job) => (
              <Card key={job.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Workflow className="h-4 w-4" /> {job.type.toUpperCase()} import
                  </CardTitle>
                  <CardDescription>Mapping {Object.keys(job.mapping).join(", ")}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Badge variant="outline">{job.status}</Badge>
                  {job.errors && job.errors.length > 0 && <Badge variant="destructive">{job.errors.length} errors</Badge>}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleCreateExport} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label>Format</Label>
            <Select value={exportDraft.format} onValueChange={(value) => setExportDraft((prev) => ({ ...prev, format: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-5 space-y-2">
            <Label>Scope</Label>
            <Input
              value={exportDraft.scope}
              onChange={(event) => setExportDraft((prev) => ({ ...prev, scope: event.target.value }))}
              placeholder="incidents"
            />
          </div>
          <div className="lg:col-span-4 flex items-end justify-end">
            <Button type="submit">
              Export now
            </Button>
          </div>
        </form>

        <div className="space-y-3 text-sm">
          {exportJobs.length === 0 ? (
            <p className="text-muted-foreground">No exports generated yet.</p>
          ) : (
            exportJobs.map((job) => (
              <Card key={job.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{job.format.toUpperCase()} export • {job.scope}</CardTitle>
                  <CardDescription>Token {job.tokenId}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Generated {new Date(job.createdAt).toLocaleString()}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleCreateToken} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="token-name">API token name</Label>
            <Input
              id="token-name"
              value={tokenDraft.name}
              onChange={(event) => setTokenDraft({ name: event.target.value })}
              placeholder="Operations analyst"
            />
          </div>
          <div className="lg:col-span-8 flex items-end justify-end">
            <Button type="submit">
              <KeyRound className="h-4 w-4 mr-2" /> Generate token
            </Button>
          </div>
        </form>

        <div className="space-y-3 text-sm">
          {apiTokens.length === 0 ? (
            <p className="text-muted-foreground">No active tokens.</p>
          ) : (
            apiTokens.map((token) => (
              <Card key={token.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="h-4 w-4" /> {token.name}
                  </CardTitle>
                  <CardDescription>Created {new Date(token.createdAt).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Badge variant={token.revoked ? "destructive" : "secondary"}>{token.revoked ? "Revoked" : "Active"}</Badge>
                  {!token.revoked && (
                    <Button type="button" size="sm" variant="outline" onClick={() => manageToken({ id: token.id, name: token.name, revoke: true })}>
                      Revoke
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
