import { domainEventBus } from "@/domain/events/domainEventBus";
import type { TenantContext } from "@/domain/tenant";

const createId = (prefix: string) => {
  const globalCrypto = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;
  const uuid = typeof globalCrypto?.randomUUID === "function"
    ? globalCrypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
};

export type WorkflowStateCategory = "backlog" | "in_progress" | "done";
export type DataDirection = "import" | "export" | "bidirectional";
export type SortDirection = "asc" | "desc";

export interface BoardColumnPlan {
  key: string;
  label: string;
  dataType: string;
  group?: string | null;
  wipLimit?: number | null;
  description?: string | null;
}

export interface BoardGroupPlan {
  key: string;
  label: string;
  order: number;
  color?: string | null;
}

export interface SavedViewSort {
  field: string;
  direction: SortDirection;
}

export interface SavedViewPlan {
  key: string;
  name: string;
  filters: Record<string, unknown>;
  sort?: SavedViewSort[];
  isDefault?: boolean;
}

export interface BoardSchemaPlan {
  key: string;
  name: string;
  description?: string | null;
  columns: BoardColumnPlan[];
  groups: BoardGroupPlan[];
  savedViews: SavedViewPlan[];
  defaultViewKey?: string | null;
}

export interface ProvisionedBoardSchema extends BoardSchemaPlan {
  id: string;
  projectId: string;
  workspaceId?: string | null;
  visibility?: string | null;
  createdAt: string;
}

export interface WorkflowStatePlan {
  key: string;
  name: string;
  category: WorkflowStateCategory;
  wipLimit?: number | null;
}

export interface WorkflowTransitionPlan {
  id: string;
  from: string;
  to: string;
  guard?: string | null;
  slaPause?: boolean;
  slaResume?: boolean;
}

export interface WorkflowSLAHookPlan {
  state: string;
  action: "pause" | "resume";
  reason: string;
}

export interface WorkflowConfigurationPlan {
  blueprintId: string;
  name?: string;
  states: WorkflowStatePlan[];
  transitions: WorkflowTransitionPlan[];
  slaHooks: WorkflowSLAHookPlan[];
}

export interface ProvisionedWorkflow extends WorkflowConfigurationPlan {
  id: string;
  projectId: string;
  createdAt: string;
}

export interface BoardProgramPlan {
  key: string;
  type: "scrum" | "kanban";
  schemaKey: string;
  backlog: {
    source: string;
    workItemTypes: string[];
    estimationField: string;
  };
  rankingStrategy: string;
  defaultViewKey?: string | null;
}

export interface ProvisionedProgramBoard extends BoardProgramPlan {
  id: string;
  projectId: string;
  schemaId: string;
  createdAt: string;
}

export interface CapacityRulePlan {
  role: string;
  hoursPerWeek: number;
  maxWorkItems?: number | null;
}

export interface ReleaseVersioningPlan {
  strategy: string;
  cadence?: string | null;
  prefix?: string | null;
}

export interface NotesTemplatePlan {
  id: string;
  name: string;
  sections: string[];
}

export interface SprintSchedulePlan {
  cadence: string;
  startDate?: string | null;
  timezone?: string | null;
  calendarId?: string | null;
  capacityRules: CapacityRulePlan[];
  releaseVersioning?: ReleaseVersioningPlan | null;
  notesTemplates: NotesTemplatePlan[];
}

export interface ProvisionedSprintSchedule extends SprintSchedulePlan {
  id: string;
  projectId: string;
  createdAt: string;
}

export interface ComponentPlan {
  key: string;
  name: string;
  owner: string;
  routingQueue?: string | null;
}

export interface RoutingRulePlan {
  id: string;
  criteria: Record<string, unknown>;
  destination: string;
}

export interface ComponentCatalogPlan {
  components: ComponentPlan[];
  routingRules: RoutingRulePlan[];
}

export interface ProvisionedComponentCatalog extends ComponentCatalogPlan {
  id: string;
  projectId: string;
  createdAt: string;
}

export interface IntakeFormFieldPlan {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
}

export interface IntakeFormPlan {
  id: string;
  name: string;
  audience: string;
  routing: string;
  targetBoardKey?: string | null;
  fields: IntakeFormFieldPlan[];
}

export interface ProvisionedIntakeForm extends IntakeFormPlan {
  projectId: string;
  createdAt: string;
}

export interface AutomationTriggerPlan {
  type: string;
  expression?: string | null;
}

export interface AutomationActionPlan {
  type: string;
  params: Record<string, unknown>;
}

export interface AutomationPlan {
  id: string;
  name: string;
  trigger: AutomationTriggerPlan;
  actions: AutomationActionPlan[];
}

export interface ProvisionedAutomationRule extends AutomationPlan {
  projectId: string;
  createdAt: string;
}

export interface IntegrationConnectorPlan {
  id: string;
  provider: string;
  configuration: Record<string, unknown>;
  direction: DataDirection;
}

export interface ProvisionedIntegrationConnector extends IntegrationConnectorPlan {
  projectId: string;
  createdAt: string;
  status: "enabled" | "disabled";
}

export interface MemberInvitationPlan {
  email: string;
  name: string;
  role: string;
  message?: string | null;
  externalId?: string | null;
}

export interface ProvisionedMemberInvitation extends MemberInvitationPlan {
  id: string;
  projectId: string;
  status: "pending" | "accepted" | "declined";
  invitedAt: string;
}

export interface PermissionOverridePlan {
  scope: string;
  role: string;
  access: string;
}

export interface PermissionAssignmentPlan {
  schemeId: string;
  notificationSchemeId?: string | null;
  slaSchemeId?: string | null;
  overrides?: PermissionOverridePlan[];
  privacyDefault?: string | null;
  notificationDefault?: string | null;
}

export interface ProvisionedPermissionAssignment extends PermissionAssignmentPlan {
  id: string;
  projectId: string;
  appliedAt: string;
}

export interface NotificationPolicyPlan {
  channel: string;
  events: string[];
  defaultRecipients?: string[];
  policyId?: string | null;
}

export interface ProvisionedNotificationPolicy extends NotificationPolicyPlan {
  id: string;
  projectId: string;
  createdAt: string;
}

export interface ImportMappingPlan {
  source: string;
  target: string;
  sample?: string | null;
}

export interface SampleDataSetPlan {
  id: string;
  name: string;
  recordCount: number;
  sampleFields?: Record<string, string>;
}

export interface ImportPlan {
  strategy: string;
  sources: string[];
  mappings: ImportMappingPlan[];
  sampleDataSets?: SampleDataSetPlan[];
}

export interface ProvisionedImportJob {
  id: string;
  projectId: string;
  strategy: string;
  sources: string[];
  mappings: ImportMappingPlan[];
  status: "scheduled" | "cancelled" | "running" | "completed";
  createdAt: string;
}

export interface SeededSampleData {
  id: string;
  projectId: string;
  datasetId: string;
  name: string;
  recordCount: number;
  seededAt: string;
}

export interface ProjectArtifactPlan {
  projectId: string;
  workspaceId?: string;
  timezone?: string | null;
  visibility?: string | null;
  modules: string[];
  templateKey?: string | null;
  boardSchemas?: BoardSchemaPlan[];
  workflowConfiguration?: WorkflowConfigurationPlan | null;
  boardPrograms?: BoardProgramPlan[];
  sprintSchedule?: SprintSchedulePlan | null;
  componentCatalog?: ComponentCatalogPlan | null;
  intakeForms?: IntakeFormPlan[];
  automationRules?: AutomationPlan[];
  integrationConnectors?: IntegrationConnectorPlan[];
  memberInvitations?: MemberInvitationPlan[];
  permissionAssignment?: PermissionAssignmentPlan | null;
  notificationPolicies?: NotificationPolicyPlan[];
  importPlan?: ImportPlan | null;
  tenant?: TenantContext;
}

export interface ProjectArtifactResult {
  boardSchemas: ProvisionedBoardSchema[];
  workflow: ProvisionedWorkflow | null;
  programBoards: ProvisionedProgramBoard[];
  sprintSchedule: ProvisionedSprintSchedule | null;
  componentCatalog: ProvisionedComponentCatalog | null;
  intakeForms: ProvisionedIntakeForm[];
  automations: ProvisionedAutomationRule[];
  integrations: ProvisionedIntegrationConnector[];
  memberInvitations: ProvisionedMemberInvitation[];
  permissionAssignment: ProvisionedPermissionAssignment | null;
  notificationPolicies: ProvisionedNotificationPolicy[];
  importJob: ProvisionedImportJob | null;
  seededDataSets: SeededSampleData[];
}

export interface ProjectArtifactProvisioner {
  provisionBoardSchemas: (plan: ProjectArtifactPlan) => Promise<ProvisionedBoardSchema[]>;
  removeBoardSchema: (schemaId: string) => Promise<void>;
  configureWorkflow: (
    plan: ProjectArtifactPlan,
    context: { boardSchemas: ProvisionedBoardSchema[] },
  ) => Promise<ProvisionedWorkflow | null>;
  removeWorkflow: (workflowId: string | null | undefined) => Promise<void>;
  provisionProgramBoards: (
    plan: ProjectArtifactPlan,
    context: { boardSchemas: ProvisionedBoardSchema[] },
  ) => Promise<ProvisionedProgramBoard[]>;
  removeProgramBoard: (boardId: string) => Promise<void>;
  scheduleSprints: (plan: ProjectArtifactPlan) => Promise<ProvisionedSprintSchedule | null>;
  cancelSprintSchedule: (scheduleId: string | null | undefined) => Promise<void>;
  publishComponentCatalog: (plan: ProjectArtifactPlan) => Promise<ProvisionedComponentCatalog | null>;
  retractComponentCatalog: (catalogId: string | null | undefined) => Promise<void>;
  publishIntakeForms: (plan: ProjectArtifactPlan) => Promise<ProvisionedIntakeForm[]>;
  removeIntakeForm: (formId: string) => Promise<void>;
  enableAutomations: (plan: ProjectArtifactPlan) => Promise<ProvisionedAutomationRule[]>;
  disableAutomation: (automationId: string) => Promise<void>;
  enableIntegrations: (plan: ProjectArtifactPlan) => Promise<ProvisionedIntegrationConnector[]>;
  disableIntegration: (connectorId: string) => Promise<void>;
  sendInvites: (plan: ProjectArtifactPlan) => Promise<ProvisionedMemberInvitation[]>;
  revokeInvite: (invitationId: string) => Promise<void>;
  applyPermissionScheme: (plan: ProjectArtifactPlan) => Promise<ProvisionedPermissionAssignment | null>;
  revertPermissionScheme: (assignmentId: string | null | undefined) => Promise<void>;
  configureNotifications: (plan: ProjectArtifactPlan) => Promise<ProvisionedNotificationPolicy[]>;
  removeNotificationPolicy: (policyId: string) => Promise<void>;
  scheduleImport: (plan: ProjectArtifactPlan) => Promise<ProvisionedImportJob | null>;
  cancelImport: (jobId: string | null | undefined) => Promise<void>;
  seedSampleData: (
    plan: ProjectArtifactPlan,
    context: { importJob: ProvisionedImportJob | null },
  ) => Promise<SeededSampleData[]>;
  clearSampleData: (datasetId: string) => Promise<void>;
}

class StructuredProjectProvisioner implements ProjectArtifactProvisioner {
  private boardSchemas = new Map<string, ProvisionedBoardSchema>();
  private workflows = new Map<string, ProvisionedWorkflow>();
  private programBoards = new Map<string, ProvisionedProgramBoard>();
  private sprintSchedules = new Map<string, ProvisionedSprintSchedule>();
  private componentCatalogs = new Map<string, ProvisionedComponentCatalog>();
  private intakeForms = new Map<string, ProvisionedIntakeForm>();
  private automations = new Map<string, ProvisionedAutomationRule>();
  private integrations = new Map<string, ProvisionedIntegrationConnector>();
  private invitations = new Map<string, ProvisionedMemberInvitation>();
  private permissionAssignments = new Map<string, ProvisionedPermissionAssignment>();
  private notificationPolicies = new Map<string, ProvisionedNotificationPolicy>();
  private importJobs = new Map<string, ProvisionedImportJob>();
  private sampleDataSets = new Map<string, SeededSampleData>();

  async provisionBoardSchemas(plan: ProjectArtifactPlan) {
    const schemas = plan.boardSchemas ?? [];
    const created: ProvisionedBoardSchema[] = schemas.map(schema => {
      const id = createId(`board_schema_${schema.key}`);
      const record: ProvisionedBoardSchema = {
        ...schema,
        id,
        projectId: plan.projectId,
        workspaceId: plan.workspaceId ?? null,
        visibility: plan.visibility ?? null,
        createdAt: new Date().toISOString(),
      };
      this.boardSchemas.set(id, record);
      return record;
    });
    return created;
  }

  async removeBoardSchema(schemaId: string) {
    this.boardSchemas.delete(schemaId);
  }

  async configureWorkflow(
    plan: ProjectArtifactPlan,
    { boardSchemas }: { boardSchemas: ProvisionedBoardSchema[] },
  ) {
    const workflow = plan.workflowConfiguration;
    if (!workflow) {
      return null;
    }
    const id = createId(`workflow_${workflow.blueprintId}`);
    const enrichedStates = workflow.states.map(state => {
      if (state.wipLimit != null) {
        return state;
      }
      const match = boardSchemas
        .flatMap(schema => schema.columns)
        .find(column => column.label.toLowerCase() === state.name.toLowerCase());
      return match && match.wipLimit != null
        ? { ...state, wipLimit: match.wipLimit }
        : state;
    });
    const record: ProvisionedWorkflow = {
      ...workflow,
      states: enrichedStates,
      id,
      projectId: plan.projectId,
      createdAt: new Date().toISOString(),
    };
    this.workflows.set(id, record);
    return record;
  }

  async removeWorkflow(workflowId: string | null | undefined) {
    if (!workflowId) {
      return;
    }
    this.workflows.delete(workflowId);
  }

  async provisionProgramBoards(
    plan: ProjectArtifactPlan,
    { boardSchemas }: { boardSchemas: ProvisionedBoardSchema[] },
  ) {
    const programs = plan.boardPrograms ?? [];
    const created: ProvisionedProgramBoard[] = programs.map(program => {
      const schema = boardSchemas.find(item => item.key === program.schemaKey);
      if (!schema) {
        throw new Error(`Missing board schema for key ${program.schemaKey}`);
      }
      const id = createId(`program_board_${program.key}`);
      const record: ProvisionedProgramBoard = {
        ...program,
        id,
        projectId: plan.projectId,
        schemaId: schema.id,
        createdAt: new Date().toISOString(),
      };
      this.programBoards.set(id, record);
      return record;
    });
    return created;
  }

  async removeProgramBoard(boardId: string) {
    this.programBoards.delete(boardId);
  }

  async scheduleSprints(plan: ProjectArtifactPlan) {
    const schedule = plan.sprintSchedule;
    if (!schedule) {
      return null;
    }
    const id = createId("sprint_schedule");
    const record: ProvisionedSprintSchedule = {
      ...schedule,
      id,
      projectId: plan.projectId,
      createdAt: new Date().toISOString(),
    };
    this.sprintSchedules.set(id, record);
    return record;
  }

  async cancelSprintSchedule(scheduleId: string | null | undefined) {
    if (!scheduleId) {
      return;
    }
    this.sprintSchedules.delete(scheduleId);
  }

  async publishComponentCatalog(plan: ProjectArtifactPlan) {
    const catalog = plan.componentCatalog;
    if (!catalog) {
      return null;
    }
    const id = createId("component_catalog");
    const record: ProvisionedComponentCatalog = {
      ...catalog,
      id,
      projectId: plan.projectId,
      createdAt: new Date().toISOString(),
    };
    this.componentCatalogs.set(id, record);
    return record;
  }

  async retractComponentCatalog(catalogId: string | null | undefined) {
    if (!catalogId) {
      return;
    }
    this.componentCatalogs.delete(catalogId);
  }

  async publishIntakeForms(plan: ProjectArtifactPlan) {
    const forms = plan.intakeForms ?? [];
    const created = forms.map(form => {
      const id = createId(`intake_${form.id}`);
      const record: ProvisionedIntakeForm = {
        ...form,
        id,
        projectId: plan.projectId,
        createdAt: new Date().toISOString(),
      };
      this.intakeForms.set(id, record);
      return record;
    });
    return created;
  }

  async removeIntakeForm(formId: string) {
    this.intakeForms.delete(formId);
  }

  async enableAutomations(plan: ProjectArtifactPlan) {
    const rules = plan.automationRules ?? [];
    const created = rules.map(rule => {
      const id = createId(`automation_${rule.id}`);
      const record: ProvisionedAutomationRule = {
        ...rule,
        id,
        projectId: plan.projectId,
        createdAt: new Date().toISOString(),
      };
      this.automations.set(id, record);
      return record;
    });
    return created;
  }

  async disableAutomation(automationId: string) {
    this.automations.delete(automationId);
  }

  async enableIntegrations(plan: ProjectArtifactPlan) {
    const integrations = plan.integrationConnectors ?? [];
    const created = integrations.map(connector => {
      const id = createId(`integration_${connector.id}`);
      const record: ProvisionedIntegrationConnector = {
        ...connector,
        id,
        projectId: plan.projectId,
        createdAt: new Date().toISOString(),
        status: "enabled",
      };
      this.integrations.set(id, record);
      return record;
    });
    return created;
  }

  async disableIntegration(connectorId: string) {
    this.integrations.delete(connectorId);
  }

  async sendInvites(plan: ProjectArtifactPlan) {
    const invites = plan.memberInvitations ?? [];
    const created = invites.map(invite => {
      const id = createId(`invite_${invite.email || invite.name}`);
      const record: ProvisionedMemberInvitation = {
        ...invite,
        id,
        projectId: plan.projectId,
        status: "pending",
        invitedAt: new Date().toISOString(),
      };
      this.invitations.set(id, record);
      return record;
    });
    return created;
  }

  async revokeInvite(invitationId: string) {
    this.invitations.delete(invitationId);
  }

  async applyPermissionScheme(plan: ProjectArtifactPlan) {
    const assignment = plan.permissionAssignment;
    if (!assignment?.schemeId) {
      return null;
    }
    const id = createId("permission_assignment");
    const record: ProvisionedPermissionAssignment = {
      ...assignment,
      id,
      projectId: plan.projectId,
      appliedAt: new Date().toISOString(),
    };
    this.permissionAssignments.set(id, record);
    return record;
  }

  async revertPermissionScheme(assignmentId: string | null | undefined) {
    if (!assignmentId) {
      return;
    }
    this.permissionAssignments.delete(assignmentId);
  }

  async configureNotifications(plan: ProjectArtifactPlan) {
    const policies = plan.notificationPolicies ?? [];
    const created = policies.map(policy => {
      const id = createId(`notification_${policy.policyId ?? policy.channel}`);
      const record: ProvisionedNotificationPolicy = {
        ...policy,
        id,
        projectId: plan.projectId,
        createdAt: new Date().toISOString(),
      };
      this.notificationPolicies.set(id, record);
      return record;
    });
    return created;
  }

  async removeNotificationPolicy(policyId: string) {
    this.notificationPolicies.delete(policyId);
  }

  async scheduleImport(plan: ProjectArtifactPlan) {
    const importPlan = plan.importPlan;
    if (!importPlan || !importPlan.strategy || importPlan.strategy === "blank_slate") {
      return null;
    }
    const id = createId("import_job");
    const record: ProvisionedImportJob = {
      id,
      projectId: plan.projectId,
      strategy: importPlan.strategy,
      sources: importPlan.sources,
      mappings: importPlan.mappings,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };
    this.importJobs.set(id, record);
    return record;
  }

  async cancelImport(jobId: string | null | undefined) {
    if (!jobId) {
      return;
    }
    const existing = this.importJobs.get(jobId);
    if (!existing) {
      return;
    }
    this.importJobs.set(jobId, { ...existing, status: "cancelled" });
  }

  async seedSampleData(
    plan: ProjectArtifactPlan,
    { importJob }: { importJob: ProvisionedImportJob | null },
  ) {
    const dataSets = plan.importPlan?.sampleDataSets ?? [];
    const created = dataSets.map(dataSet => {
      const id = createId(`seed_${dataSet.id}`);
      const record: SeededSampleData = {
        id,
        projectId: plan.projectId,
        datasetId: dataSet.id,
        name: dataSet.name,
        recordCount: dataSet.recordCount,
        seededAt: new Date().toISOString(),
      };
      this.sampleDataSets.set(id, record);
      if (importJob && importJob.status === "scheduled") {
        this.importJobs.set(importJob.id, { ...importJob, status: "running" });
      }
      return record;
    });
    if (importJob && created.length === 0) {
      this.importJobs.set(importJob.id, { ...importJob, status: "running" });
    }
    return created;
  }

  async clearSampleData(datasetId: string) {
    this.sampleDataSets.delete(datasetId);
  }
}

export const createProjectProvisioner = () => new StructuredProjectProvisioner();

export async function orchestrateProjectArtifacts(
  plan: ProjectArtifactPlan,
  provisioner: ProjectArtifactProvisioner = createProjectProvisioner(),
): Promise<ProjectArtifactResult> {
  const result: ProjectArtifactResult = {
    boardSchemas: [],
    workflow: null,
    programBoards: [],
    sprintSchedule: null,
    componentCatalog: null,
    intakeForms: [],
    automations: [],
    integrations: [],
    memberInvitations: [],
    permissionAssignment: null,
    notificationPolicies: [],
    importJob: null,
    seededDataSets: [],
  };
  const rollbacks: Array<() => Promise<void>> = [];

  try {
    const boardSchemas = await provisioner.provisionBoardSchemas(plan);
    result.boardSchemas = boardSchemas;
    for (const schema of boardSchemas) {
      rollbacks.push(() => provisioner.removeBoardSchema(schema.id));
    }

    const workflow = await provisioner.configureWorkflow(plan, { boardSchemas: result.boardSchemas });
    if (workflow) {
      result.workflow = workflow;
      rollbacks.push(() => provisioner.removeWorkflow(workflow.id));
    }

    const programBoards = await provisioner.provisionProgramBoards(plan, { boardSchemas: result.boardSchemas });
    result.programBoards = programBoards;
    for (const board of programBoards) {
      rollbacks.push(() => provisioner.removeProgramBoard(board.id));
    }

    const sprintSchedule = await provisioner.scheduleSprints(plan);
    if (sprintSchedule) {
      result.sprintSchedule = sprintSchedule;
      rollbacks.push(() => provisioner.cancelSprintSchedule(sprintSchedule.id));
    }

    const componentCatalog = await provisioner.publishComponentCatalog(plan);
    if (componentCatalog) {
      result.componentCatalog = componentCatalog;
      rollbacks.push(() => provisioner.retractComponentCatalog(componentCatalog.id));
    }

    const intakeForms = await provisioner.publishIntakeForms(plan);
    result.intakeForms = intakeForms;
    for (const form of intakeForms) {
      rollbacks.push(() => provisioner.removeIntakeForm(form.id));
    }

    const automations = await provisioner.enableAutomations(plan);
    result.automations = automations;
    for (const automation of automations) {
      rollbacks.push(() => provisioner.disableAutomation(automation.id));
    }

    const integrations = await provisioner.enableIntegrations(plan);
    result.integrations = integrations;
    for (const integration of integrations) {
      rollbacks.push(() => provisioner.disableIntegration(integration.id));
    }

    const invites = await provisioner.sendInvites(plan);
    result.memberInvitations = invites;
    for (const invite of invites) {
      rollbacks.push(() => provisioner.revokeInvite(invite.id));
    }

    const permissionAssignment = await provisioner.applyPermissionScheme(plan);
    if (permissionAssignment) {
      result.permissionAssignment = permissionAssignment;
      rollbacks.push(() => provisioner.revertPermissionScheme(permissionAssignment.id));
    }

    const notificationPolicies = await provisioner.configureNotifications(plan);
    result.notificationPolicies = notificationPolicies;
    for (const policy of notificationPolicies) {
      rollbacks.push(() => provisioner.removeNotificationPolicy(policy.id));
    }

    const importJob = await provisioner.scheduleImport(plan);
    if (importJob) {
      result.importJob = importJob;
      rollbacks.push(() => provisioner.cancelImport(importJob.id));
    }

    const seededDataSets = await provisioner.seedSampleData(plan, { importJob: result.importJob });
    result.seededDataSets = seededDataSets;
    for (const dataSet of seededDataSets) {
      rollbacks.push(() => provisioner.clearSampleData(dataSet.id));
    }

    domainEventBus.publish({
      type: "project.seed_complete",
      payload: {
        projectId: plan.projectId,
        boardSchemaCount: result.boardSchemas.length,
        workflowId: result.workflow?.id ?? null,
        programBoardCount: result.programBoards.length,
        integrationCount: result.integrations.length,
        importJobId: result.importJob?.id ?? null,
        seededDataSetCount: result.seededDataSets.length,
      },
      tenant: plan.tenant,
    });

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
