jest.mock("@/domain/tenant", () => ({
  useTenant: () => ({
    organizationId: "test-org",
    workspaceId: null,
    spaceId: null,
    userId: null,
    environment: "test",
  }),
}));

jest.mock("@/components/telemetry/TelemetryProvider", () => ({
  useTelemetry: () => ({
    track: jest.fn(),
    measure: (_: string, fn: () => unknown) => fn(),
  }),
}));

jest.mock("@/hooks/useProjectTemplates", () => ({
  useProjectTemplates: () => ({ data: [], isLoading: false }),
  useApplyProjectTemplate: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/useProjects", () => ({
  useCreateProject: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

import {
  PROJECT_ARCHIVAL_WORKFLOWS,
  PROJECT_COMPONENT_PACKS,
  PROJECT_FIELD_PRESETS,
  PROJECT_IMPORT_OPTIONS,
  PROJECT_SCREEN_PACKS,
  PROJECT_VERSION_STRATEGIES,
  PROJECT_WORKFLOW_BLUEPRINTS,
  PROJECT_SCHEMES,
} from "@/domain/projects/config";

import { __testing__ } from "../ProjectDialog";

const { createInitialState, computeStepValidation } = __testing__;

describe("ProjectDialog validation", () => {
  const permissionScheme = PROJECT_SCHEMES.find(scheme => scheme.type === "permission")!;
  const notificationScheme = PROJECT_SCHEMES.find(scheme => scheme.type === "notification")!;

  it("requires core basics before advancing", () => {
    const state = createInitialState();
    const validation = computeStepValidation(state, {
      selectedTemplate: null,
      selectedFieldPreset: PROJECT_FIELD_PRESETS[0],
      selectedWorkflow: PROJECT_WORKFLOW_BLUEPRINTS[0],
      selectedScreenPack: PROJECT_SCREEN_PACKS[0],
      selectedComponentPack: PROJECT_COMPONENT_PACKS[0],
      selectedVersionStrategy: PROJECT_VERSION_STRATEGIES[0],
    });

    expect(validation.basics.valid).toBe(false);
    expect(validation.basics.issues).toEqual(
      expect.arrayContaining([
        "Project name is required.",
        "Project key is required.",
      ]),
    );
  });

  it("passes validation when all required selections are provided", () => {
    const state = {
      ...createInitialState(),
      name: "Atlas Program",
      description: "Scaled delivery effort",
      code: "ATLAS",
      visibility: "team",
      icon: "🚀",
      color: "#2563eb",
      timezone: "UTC",
      workingDays: ["mon", "tue", "wed", "thu", "fri"],
      language: "en-US",
      templateKey: "software-scrum",
      permissionScheme: permissionScheme.id,
      notificationScheme: notificationScheme.id,
      reviewCadence: "Weekly ops review",
      calendarId: "delivery-calendar",
      archivalWorkflow: PROJECT_ARCHIVAL_WORKFLOWS[0]?.id ?? "archival-default",
      importStrategy: PROJECT_IMPORT_OPTIONS[0]?.id ?? "seed-sample",
    };

    const validation = computeStepValidation(state, {
      selectedTemplate: { id: "software-scrum" } as any,
      selectedFieldPreset: PROJECT_FIELD_PRESETS[0],
      selectedWorkflow: PROJECT_WORKFLOW_BLUEPRINTS[0],
      selectedScreenPack: PROJECT_SCREEN_PACKS[0],
      selectedComponentPack: PROJECT_COMPONENT_PACKS[0],
      selectedVersionStrategy: PROJECT_VERSION_STRATEGIES[0],
    });

    expect(validation.basics.valid).toBe(true);
    expect(validation.template.valid).toBe(true);
    expect(validation.capabilities.valid).toBe(true);
    expect(validation.lifecycle.valid).toBe(true);
    expect(validation.review.valid).toBe(true);
  });
});
