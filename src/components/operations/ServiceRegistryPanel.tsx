import { useState } from "react";
import { BookOpenCheck, ClipboardCheck, Plus, ShieldAlert } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useOperations } from "./OperationsProvider";

const createId = () => (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2));

export function ServiceRegistryPanel() {
  const { services, createService, addServiceRunbook, updateService } = useOperations();
  const [serviceDraft, setServiceDraft] = useState({
    name: "",
    ownerTeam: "",
    runbookLink: "",
    tier: "Tier 1" as "Tier 1" | "Tier 2" | "Tier 3",
    checklist: "",
  });
  const [checklistDraft, setChecklistDraft] = useState<Record<string, string>>({});
  const [runbookDraft, setRunbookDraft] = useState<Record<string, { name: string; link: string }>>({});

  const handleCreateService = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!serviceDraft.name || !serviceDraft.ownerTeam) return;
    createService({
      name: serviceDraft.name,
      ownerTeam: serviceDraft.ownerTeam,
      runbookLink: serviceDraft.runbookLink,
      tier: serviceDraft.tier,
      runbooks: serviceDraft.runbookLink
        ? [
            {
              id: createId(),
              name: `${serviceDraft.name} default runbook`,
              link: serviceDraft.runbookLink,
              type: "link" as const,
            },
          ]
        : [],
      checklists: serviceDraft.checklist
        ? serviceDraft.checklist.split("\n").map((item) => ({
            id: createId(),
            label: item,
            completed: false,
          }))
        : [],
    });
    setServiceDraft({ name: "", ownerTeam: "", runbookLink: "", tier: "Tier 1", checklist: "" });
  };

  const handleAddRunbook = (serviceId: string) => {
    const draft = runbookDraft[serviceId];
    if (!draft?.name || !draft.link) return;
    addServiceRunbook(serviceId, { name: draft.name, link: draft.link, type: "link" });
    setRunbookDraft((prev) => ({ ...prev, [serviceId]: { name: "", link: "" } }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service registry & runbooks</CardTitle>
        <CardDescription>
          Define ownership, on-call context, and operational readiness for every service consumed by incidents and changes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateService} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="service-name">Service</Label>
            <Input
              id="service-name"
              value={serviceDraft.name}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Payments API"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="service-owner">Owner team</Label>
            <Input
              id="service-owner"
              value={serviceDraft.ownerTeam}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, ownerTeam: event.target.value }))}
              placeholder="Payments Platform"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="service-tier">Tier</Label>
            <select
              id="service-tier"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={serviceDraft.tier}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, tier: event.target.value as typeof prev.tier }))}
            >
              <option value="Tier 1">Tier 1 - Critical</option>
              <option value="Tier 2">Tier 2</option>
              <option value="Tier 3">Tier 3</option>
            </select>
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="service-runbook">Default runbook</Label>
            <Input
              id="service-runbook"
              value={serviceDraft.runbookLink}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, runbookLink: event.target.value }))}
              placeholder="https://runbooks.example.com/payments"
            />
          </div>
          <div className="lg:col-span-12 space-y-2">
            <Label htmlFor="service-checklist">Operational checklist</Label>
            <Textarea
              id="service-checklist"
              value={serviceDraft.checklist}
              onChange={(event) => setServiceDraft((prev) => ({ ...prev, checklist: event.target.value }))}
              placeholder="Document runbook owner\nEnsure feature flags documented"
              rows={2}
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" /> Register service
            </Button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id} className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" /> {service.name}
                </CardTitle>
                <CardDescription>
                  {service.ownerTeam} • {service.tier}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Default runbook</p>
                  {service.runbookLink ? (
                    <a
                      href={service.runbookLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-xs"
                    >
                      {service.runbookLink}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not provided</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpenCheck className="h-3 w-3" /> Supplemental runbooks
                  </div>
                  <div className="space-y-1">
                    {service.runbooks.length === 0 && (
                      <p className="text-xs text-muted-foreground">Attach runbooks relevant to this service.</p>
                    )}
                    {service.runbooks.map((runbook) => (
                      <a
                        key={runbook.id}
                        href={runbook.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {runbook.name}
                      </a>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={runbookDraft[service.id]?.name ?? ""}
                      onChange={(event) =>
                        setRunbookDraft((prev) => ({
                          ...prev,
                          [service.id]: { name: event.target.value, link: prev[service.id]?.link ?? "" },
                        }))
                      }
                      placeholder="Runbook name"
                      className="h-8"
                    />
                    <Input
                      value={runbookDraft[service.id]?.link ?? ""}
                      onChange={(event) =>
                        setRunbookDraft((prev) => ({
                          ...prev,
                          [service.id]: { name: prev[service.id]?.name ?? "", link: event.target.value },
                        }))
                      }
                      placeholder="https://"
                      className="h-8"
                    />
                    <Button type="button" size="sm" onClick={() => handleAddRunbook(service.id)}>
                      Attach
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-3 w-3" /> Readiness checklist
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {service.checklists.length === 0 && (
                      <Badge variant="outline">No items configured</Badge>
                    )}
                    {service.checklists.map((item) => (
                      <Badge
                        key={item.id}
                        variant={item.completed ? "secondary" : "outline"}
                        className={item.completed ? "line-through" : ""}
                      >
                        {item.label}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={checklistDraft[service.id] ?? ""}
                      onChange={(event) =>
                        setChecklistDraft((prev) => ({ ...prev, [service.id]: event.target.value }))
                      }
                      placeholder="Add checklist item"
                      className="h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const label = checklistDraft[service.id];
                        if (!label) return;
                        const updated = service.checklists.concat({
                          id: createId(),
                          label,
                          completed: false,
                        });
                        updateService(service.id, { checklists: updated });
                        setChecklistDraft((prev) => ({ ...prev, [service.id]: "" }));
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {services.length === 0 && (
            <div className="lg:col-span-3 text-sm text-muted-foreground border rounded-lg p-6">
              Register services to automatically map incidents and change requests to accountable teams.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
