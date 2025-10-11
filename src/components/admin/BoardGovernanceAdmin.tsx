import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceContext } from "@/state/workspace";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ensureBoardGovernanceSettings,
  listBoardTemplates,
  updateBoardGovernanceSettings,
  type BoardGovernanceSettingsRow,
} from "@/services/boards/boardAdminService";
import type { Database } from "@/integrations/supabase/types";
import { useAuditLogs } from "@/hooks/useAudit";
import { formatDistanceToNow } from "date-fns";

const SETTINGS_KEY = (workspaceId?: string | null) => ["board", "governance", workspaceId] as const;

type CustomFieldType = Database["public"]["Enums"]["custom_field_type"];

const ALL_FIELD_TYPES: CustomFieldType[] = [
  "text",
  "number",
  "select",
  "multi_select",
  "date",
  "boolean",
  "user",
  "url",
];

interface NamingRulesConfig {
  prefix: string;
  pattern: string;
  enforcePrefix: boolean;
}

interface TaxonomyConfig {
  categories: string[];
  tags: string[];
}

interface LifecycleRulesConfig {
  autoArchiveAfterDays: number;
  reviewCadenceDays: number;
  escalatesTo: string;
}

const DEFAULT_NAMING_RULES: NamingRulesConfig = {
  prefix: "TASK",
  pattern: "TASK-####",
  enforcePrefix: true,
};

const DEFAULT_TAXONOMY: TaxonomyConfig = {
  categories: ["Product", "Engineering", "Design"],
  tags: ["priority/high", "priority/medium", "priority/low"],
};

const DEFAULT_LIFECYCLE: LifecycleRulesConfig = {
  autoArchiveAfterDays: 90,
  reviewCadenceDays: 30,
  escalatesTo: "governance@outpaged.com",
};

function parseConfig<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  return { ...fallback, ...(value as Record<string, unknown>) } as T;
}

export function BoardGovernanceAdmin() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const governanceQuery = useQuery({
    queryKey: SETTINGS_KEY(workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    queryFn: () => ensureBoardGovernanceSettings(workspaceId!),
  });

  const templatesQuery = useQuery({
    queryKey: ["board", "templates"],
    queryFn: listBoardTemplates,
    staleTime: 1000 * 60,
  });

  const auditQuery = useAuditLogs({ limit: 10 });

  const [defaultTemplates, setDefaultTemplates] = useState<string[]>([]);
  const [fieldTypes, setFieldTypes] = useState<CustomFieldType[]>(ALL_FIELD_TYPES);
  const [namingRules, setNamingRules] = useState<NamingRulesConfig>(DEFAULT_NAMING_RULES);
  const [taxonomy, setTaxonomy] = useState<TaxonomyConfig>(DEFAULT_TAXONOMY);
  const [lifecycle, setLifecycle] = useState<LifecycleRulesConfig>(DEFAULT_LIFECYCLE);

  useEffect(() => {
    const data = governanceQuery.data;
    if (!data) return;
    setDefaultTemplates(data.default_template_ids ?? []);
    setFieldTypes((data.allowed_field_types as CustomFieldType[]) ?? ALL_FIELD_TYPES);
    setNamingRules(parseConfig<NamingRulesConfig>(data.naming_rules, DEFAULT_NAMING_RULES));
    setTaxonomy(parseConfig<TaxonomyConfig>(data.taxonomy, DEFAULT_TAXONOMY));
    setLifecycle(parseConfig<LifecycleRulesConfig>(data.lifecycle_rules, DEFAULT_LIFECYCLE));
  }, [governanceQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<BoardGovernanceSettingsRow>) => {
      if (!workspaceId) {
        throw new Error("Select a workspace to update governance settings.");
      }
      return updateBoardGovernanceSettings(workspaceId, updates);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(SETTINGS_KEY(workspaceId ?? undefined), updated);
      toast({ title: "Governance settings saved" });
    },
    onError: (error: unknown) => {
      const description = error instanceof Error ? error.message : "Unable to update governance settings.";
      toast({ title: "Save failed", description, variant: "destructive" });
    },
  });

  const handleToggleTemplate = async (templateId: string, enabled: boolean) => {
    const next = enabled
      ? Array.from(new Set([...defaultTemplates, templateId]))
      : defaultTemplates.filter((id) => id !== templateId);
    setDefaultTemplates(next);
    try {
      await updateMutation.mutateAsync({ default_template_ids: next });
    } catch (error) {
      setDefaultTemplates(defaultTemplates);
      throw error;
    }
  };

  const handleToggleFieldType = async (fieldType: CustomFieldType, enabled: boolean) => {
    const next = enabled
      ? Array.from(new Set([...fieldTypes, fieldType]))
      : fieldTypes.filter((type) => type !== fieldType);
    setFieldTypes(next);
    try {
      await updateMutation.mutateAsync({ allowed_field_types: next });
    } catch (error) {
      setFieldTypes(fieldTypes);
      throw error;
    }
  };

  const handleSaveNaming = async () => {
    await updateMutation.mutateAsync({ naming_rules: namingRules });
  };

  const handleSaveTaxonomy = async () => {
    await updateMutation.mutateAsync({ taxonomy });
  };

  const handleSaveLifecycle = async () => {
    await updateMutation.mutateAsync({ lifecycle_rules: lifecycle });
  };

  const templates = templatesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default board templates</CardTitle>
          <CardDescription>Select which templates are available when new boards are created.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => {
                const enabled = defaultTemplates.includes(template.id);
                return (
                  <div key={template.id} className="flex items-start justify-between rounded-md border p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.description ?? "No description"}</p>
                      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                        <Badge variant="outline">{template.type}</Badge>
                        <Badge variant="outline">{template.visibility}</Badge>
                        {template.tags?.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={!workspaceId || updateMutation.isPending}
                      onCheckedChange={async (checked) => {
                        try {
                          await handleToggleTemplate(template.id, Boolean(checked));
                        } catch (error) {
                          const description =
                            error instanceof Error ? error.message : "Unable to update template defaults.";
                          toast({ title: "Update failed", description, variant: "destructive" });
                        }
                      }}
                      aria-label={`Toggle ${template.name}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed field types</CardTitle>
          <CardDescription>Control which custom field types are permitted on boards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {ALL_FIELD_TYPES.map((type) => {
              const enabled = fieldTypes.includes(type);
              return (
                <div key={type} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="font-medium capitalize">{type.replace("_", " ")}</span>
                  <Switch
                    checked={enabled}
                    disabled={!workspaceId || updateMutation.isPending}
                    onCheckedChange={async (checked) => {
                      try {
                        await handleToggleFieldType(type, Boolean(checked));
                      } catch (error) {
                        const description =
                          error instanceof Error ? error.message : "Unable to update field types.";
                        toast({ title: "Update failed", description, variant: "destructive" });
                      }
                    }}
                    aria-label={`Toggle ${type}`}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Naming rules</CardTitle>
          <CardDescription>Define how new board items should be named for consistency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="naming-prefix">Required prefix</Label>
              <Input
                id="naming-prefix"
                value={namingRules.prefix}
                onChange={(event) => setNamingRules((prev) => ({ ...prev, prefix: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="naming-pattern">Pattern</Label>
              <Input
                id="naming-pattern"
                value={namingRules.pattern}
                onChange={(event) => setNamingRules((prev) => ({ ...prev, pattern: event.target.value }))}
                placeholder="TASK-####"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-3">
              <Switch
                id="naming-enforce"
                checked={namingRules.enforcePrefix}
                onCheckedChange={(checked) =>
                  setNamingRules((prev) => ({ ...prev, enforcePrefix: Boolean(checked) }))
                }
              />
              <Label htmlFor="naming-enforce" className="text-sm text-muted-foreground">
                Enforce prefix on imported items
              </Label>
            </div>
          </div>
          <Button onClick={handleSaveNaming} disabled={!workspaceId || updateMutation.isPending}>
            Save naming rules
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxonomy</CardTitle>
          <CardDescription>Maintain controlled vocabularies for categories and tags.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxonomy-categories">Categories (comma separated)</Label>
              <Textarea
                id="taxonomy-categories"
                rows={3}
                value={taxonomy.categories.join(", ")}
                onChange={(event) =>
                  setTaxonomy((prev) => ({
                    ...prev,
                    categories: event.target.value.split(/,\s*/).filter(Boolean),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxonomy-tags">Tags (comma separated)</Label>
              <Textarea
                id="taxonomy-tags"
                rows={3}
                value={taxonomy.tags.join(", ")}
                onChange={(event) =>
                  setTaxonomy((prev) => ({
                    ...prev,
                    tags: event.target.value.split(/,\s*/).filter(Boolean),
                  }))
                }
              />
            </div>
          </div>
          <Button onClick={handleSaveTaxonomy} disabled={!workspaceId || updateMutation.isPending}>
            Save taxonomy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle rules</CardTitle>
          <CardDescription>Configure archival and review cadences for all boards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lifecycle-archive">Auto-archive after (days)</Label>
              <Input
                id="lifecycle-archive"
                type="number"
                min={1}
                value={lifecycle.autoArchiveAfterDays}
                onChange={(event) =>
                  setLifecycle((prev) => ({ ...prev, autoArchiveAfterDays: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lifecycle-review">Review cadence (days)</Label>
              <Input
                id="lifecycle-review"
                type="number"
                min={1}
                value={lifecycle.reviewCadenceDays}
                onChange={(event) =>
                  setLifecycle((prev) => ({ ...prev, reviewCadenceDays: Number(event.target.value) }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lifecycle-escalates">Escalation contact</Label>
              <Input
                id="lifecycle-escalates"
                value={lifecycle.escalatesTo}
                onChange={(event) => setLifecycle((prev) => ({ ...prev, escalatesTo: event.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleSaveLifecycle} disabled={!workspaceId || updateMutation.isPending}>
            Save lifecycle rules
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent board governance audit trail</CardTitle>
          <CardDescription>Monitor key administrative actions and permission changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditQuery.data && auditQuery.data.length > 0 ? (
                auditQuery.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>{entry.user_id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{entry.entity_type ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{entry.entity_id ?? ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.created_at
                        ? formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {auditQuery.isLoading ? "Loading audit activity…" : "No recent audit entries."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
