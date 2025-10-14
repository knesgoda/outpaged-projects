import { domainEventBus } from "@/domain/events/domainEventBus";
import {
  orchestrateProjectArtifacts,
  createProjectProvisioner,
  type ProjectArtifactPlan,
} from "@/services/projects/projectCreationOrchestrator";

describe("projectCreationOrchestrator integration", () => {
  const createPlan = (): ProjectArtifactPlan => ({
    projectId: "proj-123",
    workspaceId: "workspace-1",
    timezone: "UTC",
    visibility: "team",
    modules: ["board", "backlog"],
    templateKey: "template-core",
    boardSchemas: [
      {
        key: "core",
        name: "Core Delivery Board",
        description: "Primary delivery workflow",
        columns: [
          { key: "todo", label: "To Do", dataType: "status", wipLimit: 10 },
          { key: "doing", label: "In Progress", dataType: "status", wipLimit: 5 },
          { key: "done", label: "Done", dataType: "status", wipLimit: null },
        ],
        groups: [
          { key: "planned", label: "Planned", order: 0 },
          { key: "active", label: "Active", order: 1 },
          { key: "complete", label: "Complete", order: 2 },
        ],
        savedViews: [
          { key: "default", name: "Default", filters: {}, sort: [], isDefault: true },
          { key: "risks", name: "Risks", filters: { risk: true }, sort: [] },
        ],
        defaultViewKey: "default",
      },
    ],
    workflowConfiguration: {
      blueprintId: "wf-blueprint",
      name: "Kanban Flow",
      states: [
        { key: "todo", name: "To Do", category: "backlog", wipLimit: 10 },
        { key: "doing", name: "In Progress", category: "in_progress", wipLimit: 5 },
        { key: "done", name: "Done", category: "done", wipLimit: null },
      ],
      transitions: [
        { id: "todo-to-doing", from: "To Do", to: "In Progress", guard: "Groomed" },
        { id: "doing-to-done", from: "In Progress", to: "Done", guard: "QA Passed", slaResume: true },
      ],
      slaHooks: [
        { state: "In Progress", action: "pause", reason: "active_work" },
        { state: "Done", action: "resume", reason: "completed" },
      ],
    },
    boardPrograms: [
      {
        key: "core",
        type: "kanban",
        schemaKey: "core",
        backlog: {
          source: "team_backlog",
          workItemTypes: ["story", "bug"],
          estimationField: "story_points",
        },
        rankingStrategy: "flow_efficiency",
        defaultViewKey: "default",
      },
    ],
    sprintSchedule: {
      cadence: "bi-weekly",
      startDate: "2024-01-08",
      timezone: "UTC",
      calendarId: "calendar-1",
      capacityRules: [
        { role: "Developer", hoursPerWeek: 30 },
        { role: "Designer", hoursPerWeek: 20 },
      ],
      releaseVersioning: { strategy: "timeboxed", cadence: "Every PI", prefix: "REL" },
      notesTemplates: [{ id: "retro", name: "Retro Notes", sections: ["Highlights", "Risks"] }],
    },
    componentCatalog: {
      components: [{ key: "api", name: "API", owner: "Team Core", routingQueue: "Core" }],
      routingRules: [{ id: "api-rule", criteria: { component: "API" }, destination: "Core" }],
    },
    intakeForms: [
      {
        id: "public-intake",
        name: "Public Intake",
        audience: "public",
        routing: "triage",
        targetBoardKey: "core",
        fields: [
          { id: "summary", label: "Summary", type: "text", required: true },
          { id: "details", label: "Details", type: "textarea", required: true },
        ],
      },
    ],
    automationRules: [
      {
        id: "auto-1",
        name: "Notify Risk",
        trigger: { type: "status_change", expression: "status = 'In Progress'" },
        actions: [{ type: "notify", params: { channel: "email", template: "risk-alert" } }],
      },
    ],
    integrationConnectors: [
      {
        id: "slack",
        provider: "Slack",
        configuration: { channel: "#delivery", workspace: "core" },
        direction: "export",
      },
    ],
    memberInvitations: [
      {
        email: "owner@example.com",
        name: "Delivery Lead",
        role: "Admin",
        message: "Welcome aboard",
      },
    ],
    permissionAssignment: {
      schemeId: "standard_delivery",
      notificationSchemeId: "iterative_updates",
      slaSchemeId: "team_owned",
      overrides: [{ scope: "Backlog", role: "Contributors", access: "edit" }],
      privacyDefault: "team",
      notificationDefault: "email",
    },
    notificationPolicies: [
      {
        channel: "email",
        events: ["project.created", "project.seed_complete"],
        defaultRecipients: ["owner@example.com"],
        policyId: "iterative_updates",
      },
    ],
    importPlan: {
      strategy: "spreadsheet_upload",
      sources: ["csv"],
      mappings: [{ source: "Summary", target: "Title", sample: "Improve onboarding" }],
      sampleDataSets: [
        {
          id: "stories",
          name: "Sample Stories",
          recordCount: 3,
          sampleFields: { Summary: "Improve onboarding" },
        },
      ],
    },
  });

  it("provisions end-to-end artifacts and emits seed completion", async () => {
    const plan = createPlan();
    const events: any[] = [];
    const unsubscribe = domainEventBus.subscribe("project.seed_complete", event => {
      events.push(event);
    });

    const result = await orchestrateProjectArtifacts(plan);

    unsubscribe();

    expect(result.boardSchemas).toHaveLength(1);
    expect(result.boardSchemas[0]?.columns).toHaveLength(3);
    expect(result.workflow).toBeTruthy();
    expect(result.workflow?.states.map(state => state.name)).toContain("Done");
    expect(result.programBoards).toHaveLength(1);
    expect(result.componentCatalog?.components[0]?.name).toBe("API");
    expect(result.intakeForms).toHaveLength(1);
    expect(result.automations[0]?.actions[0]?.type).toBe("notify");
    expect(result.integrations[0]?.status).toBe("enabled");
    expect(result.memberInvitations[0]?.status).toBe("pending");
    expect(result.permissionAssignment?.schemeId).toBe("standard_delivery");
    expect(result.notificationPolicies).toHaveLength(1);
    expect(result.importJob?.strategy).toBe("spreadsheet_upload");
    expect(result.seededDataSets).toHaveLength(1);

    expect(events).toHaveLength(1);
    expect(events[0]?.payload.projectId).toBe(plan.projectId);
    expect(events[0]?.payload.seededDataSetCount).toBe(1);
  });

  it("rolls back provisioned artifacts when a downstream step fails", async () => {
    const plan = createPlan();
    const baseProvisioner = createProjectProvisioner();
    const failingProvisioner = Object.create(baseProvisioner) as ReturnType<typeof createProjectProvisioner> & {
      enableIntegrations: typeof baseProvisioner.enableIntegrations;
    };
    failingProvisioner.enableIntegrations = async () => {
      throw new Error("integration failure");
    };

    await expect(orchestrateProjectArtifacts(plan, failingProvisioner)).rejects.toThrow("integration failure");

    const stores = failingProvisioner as any;
    expect(stores.boardSchemas.size).toBe(0);
    expect(stores.workflows.size).toBe(0);
    expect(stores.programBoards.size).toBe(0);
    expect(stores.sprintSchedules.size).toBe(0);
    expect(stores.componentCatalogs.size).toBe(0);
    expect(stores.intakeForms.size).toBe(0);
    expect(stores.automations.size).toBe(0);
    expect(stores.invitations.size).toBe(0);
    expect(stores.permissionAssignments.size).toBe(0);
    expect(stores.notificationPolicies.size).toBe(0);
    expect(stores.importJobs.size).toBe(0);
    expect(stores.sampleDataSets.size).toBe(0);
  });
});
