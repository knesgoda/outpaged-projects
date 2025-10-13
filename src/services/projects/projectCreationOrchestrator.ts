interface ProvisionedBoard {
  id: string;
  projectId: string;
  modules: string[];
  templateKey?: string | null;
  workspaceId?: string | null;
  timezone?: string | null;
  visibility?: string | null;
  createdAt: string;
}

interface ProvisionedWorkflow {
  id: string;
  projectId: string;
  blueprintId: string;
  states: string[];
  createdAt: string;
}

interface ScheduledImportJob {
  id: string;
  projectId: string;
  strategy: string;
  sources: string[];
  status: "scheduled" | "cancelled";
  createdAt: string;
}

export interface ProjectArtifactPlan {
  projectId: string;
  workspaceId?: string;
  timezone?: string | null;
  visibility?: string | null;
  modules: string[];
  templateKey?: string | null;
  workflowBlueprint?: { id: string; name: string; states: string[] } | null;
  importStrategy?: string | null;
  importSources?: string[] | null;
}

export interface ProjectArtifactResult {
  board?: ProvisionedBoard | null;
  workflow?: ProvisionedWorkflow | null;
  importJob?: ScheduledImportJob | null;
}

const boardStore = new Map<string, ProvisionedBoard>();
const workflowStore = new Map<string, ProvisionedWorkflow>();
const importStore = new Map<string, ScheduledImportJob>();

export interface ProjectArtifactProvisioner {
  createBoard: (plan: ProjectArtifactPlan) => Promise<ProvisionedBoard | null>;
  removeBoard: (boardId: string) => Promise<void>;
  createWorkflow: (plan: ProjectArtifactPlan) => Promise<ProvisionedWorkflow | null>;
  removeWorkflow: (workflowId: string) => Promise<void>;
  scheduleImport: (plan: ProjectArtifactPlan) => Promise<ScheduledImportJob | null>;
  cancelImport: (jobId: string) => Promise<void>;
}

const createId = (prefix: string) => {
  const globalCrypto = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;
  const uuid = typeof globalCrypto?.randomUUID === "function"
    ? globalCrypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
};

export async function provisionProjectBoard(plan: ProjectArtifactPlan): Promise<ProvisionedBoard> {
  const boardId = createId("board");
  const board: ProvisionedBoard = {
    id: boardId,
    projectId: plan.projectId,
    modules: Array.from(new Set(plan.modules ?? [])).sort(),
    templateKey: plan.templateKey ?? null,
    workspaceId: plan.workspaceId ?? null,
    timezone: plan.timezone ?? null,
    visibility: plan.visibility ?? null,
    createdAt: new Date().toISOString(),
  };
  boardStore.set(boardId, board);
  return board;
}

export async function rollbackProjectBoard(boardId: string) {
  boardStore.delete(boardId);
}

export async function provisionProjectWorkflow(plan: ProjectArtifactPlan): Promise<ProvisionedWorkflow | null> {
  if (!plan.workflowBlueprint) {
    return null;
  }
  const workflowId = createId("workflow");
  const workflow: ProvisionedWorkflow = {
    id: workflowId,
    projectId: plan.projectId,
    blueprintId: plan.workflowBlueprint.id,
    states: [...plan.workflowBlueprint.states],
    createdAt: new Date().toISOString(),
  };
  workflowStore.set(workflowId, workflow);
  return workflow;
}

export async function rollbackProjectWorkflow(workflowId: string | null | undefined) {
  if (!workflowId) {
    return;
  }
  workflowStore.delete(workflowId);
}

export async function scheduleProjectImport(plan: ProjectArtifactPlan): Promise<ScheduledImportJob | null> {
  if (!plan.importStrategy || plan.importStrategy === "blank_slate") {
    return null;
  }
  const jobId = createId("import");
  const job: ScheduledImportJob = {
    id: jobId,
    projectId: plan.projectId,
    strategy: plan.importStrategy,
    sources: Array.isArray(plan.importSources) ? [...plan.importSources] : [],
    status: "scheduled",
    createdAt: new Date().toISOString(),
  };
  importStore.set(jobId, job);
  return job;
}

export async function cancelProjectImport(jobId: string | null | undefined) {
  if (!jobId) {
    return;
  }
  const existing = importStore.get(jobId);
  if (existing) {
    importStore.set(jobId, { ...existing, status: "cancelled" });
  }
}

const defaultProvisioner: ProjectArtifactProvisioner = {
  async createBoard(plan) {
    if ((plan.modules?.length ?? 0) === 0 && !plan.templateKey) {
      return null;
    }
    return provisionProjectBoard(plan);
  },
  async removeBoard(boardId) {
    await rollbackProjectBoard(boardId);
  },
  async createWorkflow(plan) {
    return provisionProjectWorkflow(plan);
  },
  async removeWorkflow(workflowId) {
    await rollbackProjectWorkflow(workflowId);
  },
  async scheduleImport(plan) {
    return scheduleProjectImport(plan);
  },
  async cancelImport(jobId) {
    await cancelProjectImport(jobId);
  },
};

export async function orchestrateProjectArtifacts(
  plan: ProjectArtifactPlan,
  provisioner: ProjectArtifactProvisioner = defaultProvisioner,
): Promise<ProjectArtifactResult> {
  const result: ProjectArtifactResult = {};
  const rollbacks: Array<() => Promise<void>> = [];

  try {
    const board = await provisioner.createBoard(plan);
    if (board) {
      result.board = board;
      rollbacks.push(() => provisioner.removeBoard(board.id));
    }

    const workflow = await provisioner.createWorkflow(plan);
    if (workflow) {
      result.workflow = workflow;
      rollbacks.push(() => provisioner.removeWorkflow(workflow.id));
    }

    const importJob = await provisioner.scheduleImport(plan);
    if (importJob) {
      result.importJob = importJob;
      rollbacks.push(() => provisioner.cancelImport(importJob.id));
    }

    return result;
  } catch (error) {
    for (const rollback of rollbacks.reverse()) {
      try {
        await rollback();
      } catch (rollbackError) {
        console.warn("Failed to rollback project artifact", rollbackError);
      }
    }
    throw error;
  }
}
