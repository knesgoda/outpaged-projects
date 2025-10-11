import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { AutomationRecipeDefinition, ProjectAutomationConfig } from "@/types";
import {
  ensurePrebuiltRecipesSeeded,
  getPrebuiltAutomationRecipes,
  listProjectAutomations,
  upsertProjectAutomation,
} from "@/services/automations";

interface AutomationRecipeBrowserProps {
  projectId: string;
  onChange?: (configs: ProjectAutomationConfig[]) => void;
}

type DraftConfig = {
  triggerConfig: Record<string, unknown>;
  actionConfig: Record<string, unknown>;
};

function resolveDraftValue(
  recipe: AutomationRecipeDefinition,
  draft: DraftConfig | undefined,
  existing: ProjectAutomationConfig | undefined,
  fieldName: string,
  scope: "trigger" | "action"
): string {
  const draftSource =
    scope === "trigger" ? draft?.triggerConfig ?? {} : draft?.actionConfig ?? {};
  const fromDraft = draftSource[fieldName];
  if (fromDraft != null) {
    return String(fromDraft);
  }

  const source = scope === "trigger" ? existing?.trigger_config : existing?.action_config;
  if (source && fieldName in source) {
    const value = source[fieldName];
    return value == null ? "" : String(value);
  }

  return "";
}

function renderField(
  recipe: AutomationRecipeDefinition,
  existing: ProjectAutomationConfig | undefined,
  draft: DraftConfig | undefined,
  fieldName: string,
  scope: "trigger" | "action",
  onChange: (value: string) => void
) {
  const field =
    scope === "trigger"
      ? recipe.trigger.configSchema.find((item) => item.name === fieldName)
      : recipe.actions[0]?.configSchema.find((item) => item.name === fieldName);

  if (!field) {
    return null;
  }

  const value = resolveDraftValue(recipe, draft, existing, fieldName, scope);
  const id = `${recipe.slug}-${scope}-${field.name}`;

  switch (field.type) {
    case "textarea":
      return (
        <div key={id} className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <Textarea
            id={id}
            value={value}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
          {field.description ? (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      );
    case "select":
      return (
        <div key={id} className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger id={id}>
              <SelectValue placeholder={field.placeholder ?? "Select"} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description ? (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      );
    default:
      return (
        <div key={id} className="space-y-2">
          <Label htmlFor={id}>{field.label}</Label>
          <Input
            id={id}
            value={value}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
          {field.description ? (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          ) : null}
        </div>
      );
  }
}

export function AutomationRecipeBrowser({ projectId, onChange }: AutomationRecipeBrowserProps) {
  const { toast } = useToast();
  const recipes = useMemo(() => getPrebuiltAutomationRecipes(), []);
  const [configs, setConfigs] = useState<ProjectAutomationConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftConfig>>({});
  const [loading, setLoading] = useState(false);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  useEffect(() => {
    ensurePrebuiltRecipesSeeded().catch((error) => {
      console.warn("Unable to seed automation recipes", error);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!projectId) {
      setConfigs([]);
      return;
    }

    setLoading(true);
    listProjectAutomations(projectId)
      .then((data) => {
        if (mounted) {
          setConfigs(data);
          onChange?.(data);
        }
      })
      .catch((error) => {
        console.error("Failed to load automations", error);
        toast({
          title: "Unable to load automations",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [projectId, onChange, toast]);

  const getConfigForRecipe = (slug: string) => configs.find((config) => config.recipe_slug === slug);

  const updateDraft = (
    slug: string,
    scope: keyof DraftConfig,
    fieldName: string,
    value: string
  ) => {
    setDrafts((prev) => {
      const next = { ...prev };
      const current = next[slug] ?? { triggerConfig: {}, actionConfig: {} };
      next[slug] = {
        ...current,
        [scope]: { ...current[scope], [fieldName]: value },
      } as DraftConfig;
      return next;
    });
  };

  const handleSave = async (recipe: AutomationRecipeDefinition, enabledOverride?: boolean) => {
    const existing = getConfigForRecipe(recipe.slug);
    const draft = drafts[recipe.slug];
    const triggerConfig = {
      ...(existing?.trigger_config ?? {}),
      ...(draft?.triggerConfig ?? {}),
    };
    const actionConfig = {
      ...(existing?.action_config ?? {}),
      ...(draft?.actionConfig ?? {}),
    };

    setSavingSlug(recipe.slug);
    try {
      const saved = await upsertProjectAutomation({
        projectId,
        recipeSlug: recipe.slug,
        enabled: enabledOverride ?? existing?.enabled ?? true,
        triggerConfig,
        actionConfig,
      });
      setConfigs((prev) => {
        const others = prev.filter((item) => item.recipe_slug !== recipe.slug);
        const next = [...others, saved];
        onChange?.(next);
        return next;
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[recipe.slug];
        return next;
      });
      toast({ title: "Automation saved", description: `${recipe.name} updated.` });
    } catch (error) {
      console.error("Failed to save automation", error);
      toast({
        title: "Unable to save automation",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setSavingSlug(null);
    }
  };

  const handleToggle = async (recipe: AutomationRecipeDefinition, enabled: boolean) => {
    await handleSave(recipe, enabled);
  };

  return (
    <div className="space-y-6">
      {recipes.map((recipe) => {
        const existing = getConfigForRecipe(recipe.slug);
        const draft = drafts[recipe.slug];
        const isEnabled = existing?.enabled ?? false;
        return (
          <Card key={recipe.slug} className="border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{recipe.name}</CardTitle>
                <CardDescription>{recipe.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{isEnabled ? "Enabled" : "Disabled"}</span>
                <Switch
                  checked={isEnabled}
                  disabled={loading || savingSlug === recipe.slug}
                  onCheckedChange={(value) => handleToggle(recipe, value)}
                  aria-label={`Toggle ${recipe.name}`}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recipe.trigger.configSchema.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Trigger configuration</h4>
                  {recipe.trigger.configSchema.map((field) =>
                    renderField(recipe, existing, draft, field.name, "trigger", (value) =>
                      updateDraft(recipe.slug, "triggerConfig", field.name, value)
                    )
                  )}
                </div>
              ) : null}

              {recipe.actions[0]?.configSchema.length ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Action configuration</h4>
                  {recipe.actions[0]?.configSchema.map((field) =>
                    renderField(recipe, existing, draft, field.name, "action", (value) =>
                      updateDraft(recipe.slug, "actionConfig", field.name, value)
                    )
                  )}
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleSave(recipe)}
                  disabled={savingSlug === recipe.slug}
                >
                  {savingSlug === recipe.slug ? "Saving…" : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
