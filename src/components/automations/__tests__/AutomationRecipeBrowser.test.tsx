import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AutomationRecipeBrowser } from "@/components/automations/AutomationRecipeBrowser";
import type { ProjectAutomationConfig } from "@/types";

jest.mock("@/services/automations", () => {
  const actual = jest.requireActual("@/services/automations");
  return {
    ...actual,
    ensurePrebuiltRecipesSeeded: jest.fn().mockResolvedValue(undefined),
    getPrebuiltAutomationRecipes: jest.fn().mockReturnValue([
      {
        slug: "test-recipe",
        name: "Test recipe",
        description: "Runs on creation",
        trigger: {
          type: "task.created" as const,
          label: "On create",
          configSchema: [],
        },
        actions: [
          {
            type: "webhook" as const,
            label: "Send webhook",
            description: "Post to webhook",
            configSchema: [
              {
                name: "url",
                label: "URL",
                type: "text" as const,
              },
            ],
          },
        ],
      },
    ]),
    listProjectAutomations: jest.fn().mockResolvedValue([]),
    upsertProjectAutomation: jest.fn().mockImplementation(({ projectId, recipeSlug, enabled, actionConfig, triggerConfig }) => {
      const config: ProjectAutomationConfig = {
        id: "config-1",
        project_id: projectId,
        recipe_slug: recipeSlug,
        enabled,
        trigger_config: triggerConfig ?? {},
        action_config: actionConfig ?? {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_run_at: null,
      };
      return Promise.resolve(config);
    }),
  };
});

const services = jest.requireMock("@/services/automations");

describe("AutomationRecipeBrowser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads automation recipes and toggles enable state", async () => {
    render(<AutomationRecipeBrowser projectId="project-1" />);

    await waitFor(() => {
      expect(services.listProjectAutomations).toHaveBeenCalledWith("project-1");
    });

    const toggle = screen.getByRole("switch", { name: /toggle test recipe/i });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(services.upsertProjectAutomation).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: "project-1",
          recipeSlug: "test-recipe",
          enabled: true,
        })
      );
    });
  });

  it("saves updated action configuration", async () => {
    render(<AutomationRecipeBrowser projectId="project-1" />);

    await waitFor(() => {
      expect(services.listProjectAutomations).toHaveBeenCalled();
    });

    const urlField = await screen.findByLabelText(/url/i);
    fireEvent.change(urlField, { target: { value: "https://example.com" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(services.upsertProjectAutomation).toHaveBeenCalledWith(
        expect.objectContaining({
          actionConfig: expect.objectContaining({ url: "https://example.com" }),
        })
      );
    });
  });
});
