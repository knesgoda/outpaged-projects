import { useState } from "react";
import { UserCog } from "lucide-react";
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
import { useOperations } from "./OperationsProvider";

export function AdminGovernancePanel() {
  const { sandboxPromotions, templateVersions, scimEvents, recordSandboxPromotion, recordTemplateVersion, recordScimEvent } = useOperations();
  const [sandboxDraft, setSandboxDraft] = useState({ name: "Workflow sandbox", status: "pending" as "draft" | "pending" | "approved" | "rejected" });
  const [templateDraft, setTemplateDraft] = useState({ templateId: "template-prd", version: 2, changelog: "Updated sections", published: true });
  const [scimDraft, setScimDraft] = useState({ user: "user@example.com", type: "provision" as "provision" | "update" | "deprovision" });

  const handleSandbox = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordSandboxPromotion({ name: sandboxDraft.name, status: sandboxDraft.status });
    setSandboxDraft({ name: "Workflow sandbox", status: "pending" });
  };

  const handleTemplate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordTemplateVersion({ templateId: templateDraft.templateId, version: templateDraft.version, changelog: templateDraft.changelog, published: templateDraft.published, createdBy: "admin" });
    setTemplateDraft({ templateId: "template-prd", version: templateDraft.version + 1, changelog: "", published: false });
  };

  const handleScim = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordScimEvent({ user: scimDraft.user, type: scimDraft.type });
    setScimDraft({ user: "user@example.com", type: "provision" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin governance</CardTitle>
        <CardDescription>
          Promote sandbox changes, manage template versions, and audit SCIM provisioning events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSandbox} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label>Sandbox name</Label>
            <Input
              value={sandboxDraft.name}
              onChange={(event) => setSandboxDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-4 space-y-2">
            <Label>Status</Label>
            <Select value={sandboxDraft.status} onValueChange={(value) => setSandboxDraft((prev) => ({ ...prev, status: value as typeof prev.status }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-4 flex items-end justify-end">
            <Button type="submit">
              Promote sandbox
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {sandboxPromotions.length === 0 ? (
            <p className="text-muted-foreground">No sandbox promotions logged.</p>
          ) : (
            sandboxPromotions.map((promotion) => (
              <Card key={promotion.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{promotion.name}</CardTitle>
                  <CardDescription>Status {promotion.status}</CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleTemplate} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label>Template ID</Label>
            <Input
              value={templateDraft.templateId}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, templateId: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Version</Label>
            <Input
              type="number"
              value={templateDraft.version}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, version: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-4 space-y-2">
            <Label>Changelog</Label>
            <Input
              value={templateDraft.changelog}
              onChange={(event) => setTemplateDraft((prev) => ({ ...prev, changelog: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Published</Label>
            <Select value={templateDraft.published ? "yes" : "no"} onValueChange={(value) => setTemplateDraft((prev) => ({ ...prev, published: value === "yes" }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              Save version
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {templateVersions.length === 0 ? (
            <p className="text-muted-foreground">No template versions recorded.</p>
          ) : (
            templateVersions.map((version) => (
              <Card key={version.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{version.templateId} v{version.version}</CardTitle>
                  <CardDescription>{version.changelog}</CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleScim} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label>User</Label>
            <Input
              value={scimDraft.user}
              onChange={(event) => setScimDraft((prev) => ({ ...prev, user: event.target.value }))}
              placeholder="user@example.com"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Event</Label>
            <Select value={scimDraft.type} onValueChange={(value) => setScimDraft((prev) => ({ ...prev, type: value as typeof prev.type }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provision">Provision</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="deprovision">Deprovision</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-5 flex items-end justify-end">
            <Button type="submit">
              <UserCog className="h-4 w-4 mr-2" /> Log SCIM event
            </Button>
          </div>
        </form>

        <div className="space-y-2 text-sm">
          {scimEvents.length === 0 ? (
            <p className="text-muted-foreground">No SCIM events recorded.</p>
          ) : (
            scimEvents.map((event) => (
              <Card key={event.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{event.type}</CardTitle>
                  <CardDescription>{event.user} • {new Date(event.occurredAt).toLocaleString()}</CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
