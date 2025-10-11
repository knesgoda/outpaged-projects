import { evaluateAutomationRecipes } from "@/services/automations";
import type { AutomationEvaluationResult, ProjectAutomationConfig } from "@/types";
import { PREBUILT_AUTOMATION_RECIPES } from "@/services/automations/recipes";

describe("automation engine", () => {
  const baseConfig: ProjectAutomationConfig = {
    id: "1",
    project_id: "project-1",
    recipe_slug: "assign-on-status-change",
    enabled: true,
    trigger_config: { to: "in_progress" },
    action_config: { assigneeIds: ["user-1"] },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_run_at: null,
  };

  it("matches on status change and returns action payload", () => {
    const event = {
      projectId: "project-1",
      type: "task.status_changed" as const,
      taskId: "task-1",
      context: {
        fromStatus: "todo",
        toStatus: "in_progress",
      },
    };

    const results = evaluateAutomationRecipes({
      event,
      automations: [baseConfig],
      recipes: PREBUILT_AUTOMATION_RECIPES,
    });

    expect(results).toHaveLength(1);
    const [result] = results as AutomationEvaluationResult[];
    expect(result.action.type).toBe("assign");
    expect(result.payload.assigneeIds).toEqual(["user-1"]);
    expect(result.payload.toStatus).toBe("in_progress");
  });

  it("ignores automations that are disabled", () => {
    const event = {
      projectId: "project-1",
      type: "task.status_changed" as const,
      taskId: "task-1",
      context: {
        fromStatus: "todo",
        toStatus: "in_progress",
      },
    };

    const results = evaluateAutomationRecipes({
      event,
      automations: [{ ...baseConfig, enabled: false }],
      recipes: PREBUILT_AUTOMATION_RECIPES,
    });

    expect(results).toHaveLength(0);
  });

  it("ignores automations with mismatched trigger configuration", () => {
    const event = {
      projectId: "project-1",
      type: "task.status_changed" as const,
      taskId: "task-1",
      context: {
        fromStatus: "todo",
        toStatus: "done",
      },
    };

    const results = evaluateAutomationRecipes({
      event,
      automations: [baseConfig],
      recipes: PREBUILT_AUTOMATION_RECIPES,
    });

    expect(results).toHaveLength(0);
  });
});
