interface ProvisionedBoard {
  id: string;
  projectId: string;
  modules: string[];
  templateKey?: string | null;
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

export async function orchestrateProjectArtifacts(plan: ProjectArtifactPlan): Promise<ProjectArtifactResult> {
  const result: ProjectArtifactResult = {};
  try {
    if (plan.modules.length > 0 || plan.templateKey) {
      result.board = await provisionProjectBoard(plan);
    }
    result.workflow = await provisionProjectWorkflow(plan);
    result.importJob = await scheduleProjectImport(plan);
    return result;
  } catch (error) {
    if (result.board) {
      await rollbackProjectBoard(result.board.id);
    }
    if (result.workflow) {
      await rollbackProjectWorkflow(result.workflow.id);
    }
    if (result.importJob) {
      await cancelProjectImport(result.importJob.id);
    }
    throw error;
  }
}
