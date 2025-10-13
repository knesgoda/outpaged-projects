import {
  orchestrateProjectArtifacts,
  type ProjectArtifactPlan,
  type ProjectArtifactProvisioner,
} from "@/services/projects/projectCreationOrchestrator";

describe("projectCreationOrchestrator", () => {
  const basePlan: ProjectArtifactPlan = {
    projectId: "proj-123",
    modules: ["table"],
    templateKey: "template-a",
    workflowBlueprint: { id: "wf", name: "Default", states: ["todo", "doing", "done"] },
    importStrategy: "blank_slate",
    importSources: [],
  };

  it("rolls back previously created artifacts when a later step fails", async () => {
    const createdBoard = {
      id: "board-1",
      projectId: basePlan.projectId,
      modules: basePlan.modules,
      templateKey: basePlan.templateKey,
      createdAt: new Date().toISOString(),
      workspaceId: null,
      timezone: null,
      visibility: null,
    };

    const provisioner: ProjectArtifactProvisioner = {
      createBoard: jest.fn().mockResolvedValue(createdBoard),
      removeBoard: jest.fn().mockResolvedValue(undefined),
      createWorkflow: jest.fn().mockRejectedValue(new Error("workflow failed")),
      removeWorkflow: jest.fn().mockResolvedValue(undefined),
      scheduleImport: jest.fn(),
      cancelImport: jest.fn(),
    };

    await expect(orchestrateProjectArtifacts(basePlan, provisioner)).rejects.toThrow("workflow failed");

    expect(provisioner.createBoard).toHaveBeenCalledTimes(1);
    expect(provisioner.removeBoard).toHaveBeenCalledWith(createdBoard.id);
    expect(provisioner.scheduleImport).not.toHaveBeenCalled();
  });

  it("returns created artifacts when all provisioning succeeds", async () => {
    const createdBoard = {
      id: "board-1",
      projectId: basePlan.projectId,
      modules: basePlan.modules,
      templateKey: basePlan.templateKey,
      createdAt: new Date().toISOString(),
      workspaceId: "workspace-1",
      timezone: "UTC",
      visibility: "team",
    };

    const createdWorkflow = {
      id: "wf-1",
      projectId: basePlan.projectId,
      blueprintId: "wf",
      states: ["todo", "doing", "done"],
      createdAt: new Date().toISOString(),
    };

    const scheduledImport = {
      id: "import-1",
      projectId: basePlan.projectId,
      strategy: "seed-sample",
      sources: ["jira"],
      status: "scheduled" as const,
      createdAt: new Date().toISOString(),
    };

    const provisioner: ProjectArtifactProvisioner = {
      createBoard: jest.fn().mockResolvedValue(createdBoard),
      removeBoard: jest.fn(),
      createWorkflow: jest.fn().mockResolvedValue(createdWorkflow),
      removeWorkflow: jest.fn(),
      scheduleImport: jest.fn().mockResolvedValue(scheduledImport),
      cancelImport: jest.fn(),
    };

    const result = await orchestrateProjectArtifacts(
      { ...basePlan, importStrategy: "seed-sample", importSources: ["jira"] },
      provisioner,
    );

    expect(result.board).toEqual(createdBoard);
    expect(result.workflow).toEqual(createdWorkflow);
    expect(result.importJob).toEqual(scheduledImport);
  });
});
