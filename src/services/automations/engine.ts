import { supabase } from "@/integrations/supabase/client";
import type {
  AutomationEvaluationResult,
  AutomationEventPayload,
  AutomationRecipeDefinition,
  AutomationEventType,
  ProjectAutomationConfig,
} from "@/types";
import { mapSupabaseError } from "../utils";
import { findPrebuiltRecipe, getPrebuiltAutomationRecipes } from "./recipes";

const EVENT_QUEUE_TABLE = "automation_event_queue";

export type AutomationEvaluationContext = AutomationEventPayload & {
  context?: Record<string, unknown>;
};

function matchesTrigger(
  recipe: AutomationRecipeDefinition,
  automation: ProjectAutomationConfig,
  event: AutomationEvaluationContext
): boolean {
  if (recipe.trigger.type !== event.type) {
    return false;
  }

  const config = (automation.trigger_config ?? {}) as Record<string, unknown>;
  const ctx = (event.context ?? {}) as Record<string, unknown>;

  switch (recipe.trigger.type) {
    case "task.status_changed": {
      const toStatus = config["to"];
      const fromStatus = config["from"];
      if (toStatus && toStatus !== ctx["toStatus"]) {
        return false;
      }
      if (fromStatus && fromStatus !== ctx["fromStatus"]) {
        return false;
      }
      return true;
    }
    case "task.moved": {
      const fromColumn = config["from"];
      const toColumn = config["to"];
      if (fromColumn && fromColumn !== ctx["fromColumnId"]) {
        return false;
      }
      if (toColumn && toColumn !== ctx["toColumnId"]) {
        return false;
      }
      return true;
    }
    default:
      return true;
  }
}

function buildActionPayload(
  actionType: AutomationRecipeDefinition["actions"][number]["type"],
  event: AutomationEvaluationContext,
  automation: ProjectAutomationConfig
): Record<string, unknown> {
  const actionConfig = (automation.action_config ?? {}) as Record<string, unknown>;

  const base = {
    ...event.context,
    projectId: event.projectId,
    taskId: event.taskId,
  };

  switch (actionType) {
    case "assign":
      return {
        ...base,
        assigneeIds: actionConfig.assigneeIds ?? [],
      };
    case "slack":
      return {
        ...base,
        webhookUrl: actionConfig.webhookUrl,
        message: actionConfig.message,
      };
    case "webhook":
      return {
        ...base,
        url: actionConfig.url,
        method: (actionConfig.method as string | undefined) ?? "POST",
      };
    case "timer":
      return {
        ...base,
        duration: actionConfig.duration,
      };
    default:
      return base;
  }
}

export function evaluateAutomationRecipes(options: {
  event: AutomationEvaluationContext;
  automations: ProjectAutomationConfig[];
  recipes?: AutomationRecipeDefinition[];
}): AutomationEvaluationResult[] {
  const { event, automations, recipes = getPrebuiltAutomationRecipes() } = options;
  const recipeMap = new Map(recipes.map((recipe) => [recipe.slug, recipe]));

  return automations.flatMap<AutomationEvaluationResult>((automation) => {
    if (!automation.enabled) {
      return [];
    }

    const recipe = recipeMap.get(automation.recipe_slug);
    if (!recipe) {
      return [];
    }

    if (!matchesTrigger(recipe, automation, event)) {
      return [];
    }

    return recipe.actions.map((action) => ({
      recipe,
      action,
      payload: buildActionPayload(action.type, event, automation),
    }));
  });
}

export async function enqueueAutomationEvent(event: AutomationEvaluationContext): Promise<void> {
  const payload = {
    project_id: event.projectId,
    event_type: event.type,
    task_id: event.taskId ?? null,
    payload: event.context ?? {},
  };

  const { error } = await supabase.from(EVENT_QUEUE_TABLE as any).insert(payload as any);

  if (error) {
    throw mapSupabaseError(error, "Unable to enqueue automation event.");
  }
}

export async function registerPrebuiltRecipe(slug: string): Promise<void> {
  const recipe = findPrebuiltRecipe(slug);
  if (!recipe) {
    throw new Error(`Unknown automation recipe: ${slug}`);
  }

  const { error } = await supabase
    .from("automation_recipes" as any)
    .upsert(
      {
        slug: recipe.slug,
        name: recipe.name,
        description: recipe.description,
        trigger_type: recipe.trigger.type,
        trigger_schema: recipe.trigger.configSchema,
        action_schema: recipe.actions.map((action) => ({
          type: action.type,
          label: action.label,
          description: action.description,
          configSchema: action.configSchema,
        })),
      } as any,
      { onConflict: "slug" }
    );

  if (error) {
    throw mapSupabaseError(error, "Unable to register automation recipe.");
  }
}

export async function ensurePrebuiltRecipesSeeded(): Promise<void> {
  const recipes = getPrebuiltAutomationRecipes();
  for (const recipe of recipes) {
    await registerPrebuiltRecipe(recipe.slug);
  }
}

export function isAutomationEventType(value: string): value is AutomationEventType {
  return (
    value === "task.created" ||
    value === "task.updated" ||
    value === "task.moved" ||
    value === "task.status_changed" ||
    value === "task.due_soon" ||
    value === "task.timer_started"
  );
}
