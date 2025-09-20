import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addHours, addMinutes, differenceInMinutes, isAfter, isBefore, parseISO } from "date-fns";

export type IncidentSeverity = "Sev1" | "Sev2" | "Sev3" | "Sev4";
export type IncidentState = "open" | "mitigated" | "monitoring" | "resolved";
export type ChangeState = "draft" | "review" | "approved" | "implementing" | "validated" | "done";

export interface TimelineEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  owner: string;
  status: "open" | "in_progress" | "done";
}

export interface WorkspaceLink {
  id: string;
  label: string;
  url: string;
}

export interface PostmortemActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate?: string;
  status: "open" | "in_progress" | "done";
}

export interface PostmortemRecord {
  id: string;
  incidentId: string;
  impact: string;
  rootCause: string;
  correctiveActions: string;
  createdAt: string;
  createdBy: string;
  actionItems: PostmortemActionItem[];
}

export interface IncidentWorkspace {
  timeline: TimelineEntry[];
  responders: string[];
  tasks: WorkspaceTask[];
  links: WorkspaceLink[];
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  affectedServices: string[];
  state: IncidentState;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  workspace: IncidentWorkspace;
  postmortem?: PostmortemRecord | null;
  businessCalendarId?: string;
  slaPausedAt?: string | null;
  nearBreachEscalated?: boolean;
  breachEscalated?: boolean;
}

export interface RotationShift {
  id: string;
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  engineer: string;
}

export interface OnCallRotation {
  id: string;
  name: string;
  team: string;
  timezone: string;
  shifts: RotationShift[];
  escalationContacts: string[];
}

export interface PagingAuditEntry {
  id: string;
  incidentId: string;
  rotationId: string;
  engineer: string;
  triggeredAt: string;
  acknowledgedAt?: string;
}

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  risk: string;
  impact: string;
  backoutPlan: string;
  state: ChangeState;
  requestedBy: string;
  approverName?: string;
  approvedAt?: string;
  plannedStart?: string;
  plannedEnd?: string;
  serviceIds: string[];
  freezeOverride?: boolean;
  timeline: TimelineEntry[];
}

export interface FreezeWindow {
  id: string;
  name: string;
  start: string;
  end: string;
  teams: string[];
  allowOverride: boolean;
}

export interface RunbookReference {
  id: string;
  name: string;
  link: string;
  type: "link" | "file";
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface Service {
  id: string;
  name: string;
  ownerTeam: string;
  runbookLink: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3";
  runbooks: RunbookReference[];
  checklists: ChecklistItem[];
}

export interface DependencyItem {
  id: string;
  name: string;
  team: string;
  status: string;
  dueDate: string;
  dependsOn: string[];
  criticalPath: boolean;
}

export interface BusinessHour {
  day: number;
  start: string;
  end: string;
}

export interface BusinessCalendar {
  id: string;
  name: string;
  timezone: string;
  hours: BusinessHour[];
  pauseStates: IncidentState[];
  escalationContacts: {
    nearBreach: string[];
    breach: string[];
  };
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  visibility: "private" | "team" | "organization";
  owner: string;
  sharedUrl: string;
}

export interface OpsMetricSnapshot {
  id: string;
  capturedAt: string;
  mttaMinutes: number;
  mttrMinutes: number;
  slaCompliance: number;
  changeFailureRate: number;
}

export interface DocTemplate {
  id: string;
  name: string;
  type: "PRD" | "RFC" | "Custom";
  content: string;
}

export interface BoundField {
  field: string;
  itemId: string;
  value: string;
}

export interface StatusChip {
  itemId: string;
  status: string;
  assignee: string;
}

export interface DocChange {
  id: string;
  type: "insert" | "delete";
  content: string;
  author: string;
  timestamp: string;
}

export interface DocApproval {
  id: string;
  docId: string;
  reviewer: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  respondedAt?: string;
}

export interface OpsDocument {
  id: string;
  title: string;
  templateId?: string;
  content: string;
  autosavedAt: string;
  chips: StatusChip[];
  boundFields: BoundField[];
  changes: DocChange[];
  approvals: DocApproval[];
  requiredApprovers: string[];
  status: "draft" | "final";
}

export interface Initiative {
  id: string;
  name: string;
  health: "green" | "amber" | "red";
  progress: number;
  budgetPlanned?: number;
  budgetActual?: number;
  epicIds: string[];
}

export interface PortfolioView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  sharedWith: string[];
}

export interface DependencyRiskRecord {
  id: string;
  blockingTeam: string;
  blockedTeam: string;
  severity: "low" | "medium" | "high";
  count: number;
  impactedItems: string[];
}

export interface KeyResult {
  id: string;
  name: string;
  target: number;
  current: number;
  linkedItemIds: string[];
}

export interface Objective {
  id: string;
  name: string;
  description: string;
  quarter: string;
  owner: string;
  keyResults: KeyResult[];
}

export interface ImportJob {
  id: string;
  type: "csv" | "jira" | "monday";
  status: "pending" | "validating" | "importing" | "completed" | "failed";
  createdAt: string;
  mapping: Record<string, string>;
  errors?: string[];
}

export interface ExportJob {
  id: string;
  format: "csv" | "json";
  scope: string;
  tokenId: string;
  createdAt: string;
}

export interface ApiToken {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked?: boolean;
}

export interface DigestSchedule {
  id: string;
  scope: string;
  cadence: "weekly" | "monthly";
  channel: "email" | "slack" | "both";
  recipients: string[];
  lastSentAt?: string;
}

export interface PortfolioReport {
  id: string;
  type: "roadmap" | "status" | "dependency";
  generatedAt: string;
  url: string;
}

export interface PerformanceGuardrail {
  id: string;
  name: string;
  threshold: number;
  metric: string;
  status: "passing" | "failing";
}

export interface BackupJob {
  id: string;
  projectId: string;
  requestedAt: string;
  completedAt?: string;
  restorePoint?: string;
}

export interface FailoverDrill {
  id: string;
  name: string;
  executedAt: string;
  status: "pending" | "completed" | "in_progress";
  notes?: string;
}

export interface MobileApproval {
  id: string;
  itemId: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  decidedAt?: string;
  comment?: string;
}

export interface OfflineItem {
  id: string;
  type: "task" | "comment";
  payload: Record<string, unknown>;
  createdAt: string;
  syncedAt?: string;
}

export interface SandboxPromotion {
  id: string;
  name: string;
  submittedAt: string;
  approvedAt?: string;
  status: "draft" | "pending" | "approved" | "rejected";
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  changelog: string;
  published: boolean;
}

export interface ScimEvent {
  id: string;
  type: "provision" | "update" | "deprovision";
  user: string;
  occurredAt: string;
}

export interface SloDefinition {
  id: string;
  name: string;
  indicator: "availability" | "latency" | "error_rate";
  target: number;
  burnRate?: number;
  linkedIncidents: string[];
}

export interface OperationsState {
  incidents: Incident[];
  onCallRotations: OnCallRotation[];
  pagingAudit: PagingAuditEntry[];
  changeRequests: ChangeRequest[];
  freezeWindows: FreezeWindow[];
  services: Service[];
  dependencyItems: DependencyItem[];
  businessCalendars: BusinessCalendar[];
  savedSearches: SavedSearch[];
  opsMetrics: OpsMetricSnapshot[];
  docTemplates: DocTemplate[];
  documents: OpsDocument[];
  initiatives: Initiative[];
  portfolioViews: PortfolioView[];
  dependencyRisks: DependencyRiskRecord[];
  objectives: Objective[];
  importJobs: ImportJob[];
  exportJobs: ExportJob[];
  apiTokens: ApiToken[];
  digestSchedules: DigestSchedule[];
  reports: PortfolioReport[];
  performanceGuardrails: PerformanceGuardrail[];
  backupJobs: BackupJob[];
  failoverDrills: FailoverDrill[];
  mobileApprovals: MobileApproval[];
  offlineQueue: OfflineItem[];
  sandboxPromotions: SandboxPromotion[];
  templateVersions: TemplateVersion[];
  scimEvents: ScimEvent[];
  sloDefinitions: SloDefinition[];
}

const createId = () => (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2));

export const SLA_BY_SEVERITY: Record<IncidentSeverity, number> = {
  Sev1: 1,
  Sev2: 4,
  Sev3: 8,
  Sev4: 24,
};

const STORAGE_KEY = "operations_state_v1";

const defaultState: OperationsState = {
  incidents: [],
  onCallRotations: [],
  pagingAudit: [],
  changeRequests: [],
  freezeWindows: [],
  services: [],
  dependencyItems: [],
  businessCalendars: [],
  savedSearches: [],
  opsMetrics: [],
  docTemplates: [
    {
      id: "template-prd",
      name: "Product Requirements Document",
      type: "PRD",
      content: "# Overview\n## Goals\n## Success Metrics\n## Requirements\n",
    },
    {
      id: "template-rfc",
      name: "Request for Comments",
      type: "RFC",
      content: "# Summary\n## Context\n## Proposal\n## Alternatives\n",
    },
  ],
  documents: [],
  initiatives: [],
  portfolioViews: [],
  dependencyRisks: [],
  objectives: [],
  importJobs: [],
  exportJobs: [],
  apiTokens: [],
  digestSchedules: [],
  reports: [],
  performanceGuardrails: [],
  backupJobs: [],
  failoverDrills: [],
  mobileApprovals: [],
  offlineQueue: [],
  sandboxPromotions: [],
  templateVersions: [],
  scimEvents: [],
  sloDefinitions: [],
};

interface OperationsContextValue extends OperationsState {
  createIncident: (input: {
    title: string;
    description: string;
    severity: IncidentSeverity;
    affectedServices: string[];
    businessCalendarId?: string;
  }) => Incident;
  transitionIncident: (incidentId: string, nextState: IncidentState, actor: string) => void;
  addIncidentTimelineEntry: (incidentId: string, entry: Omit<TimelineEntry, "id" | "timestamp"> & { timestamp?: string }) => void;
  addIncidentResponder: (incidentId: string, responder: string) => void;
  addWorkspaceTask: (incidentId: string, task: Omit<WorkspaceTask, "id" | "status">) => void;
  updateWorkspaceTaskStatus: (incidentId: string, taskId: string, status: WorkspaceTask["status"]) => void;
  addWorkspaceLink: (incidentId: string, link: Omit<WorkspaceLink, "id">) => void;
  recordPostmortem: (incidentId: string, record: Omit<PostmortemRecord, "id" | "createdAt">) => void;
  createOnCallRotation: (rotation: Omit<OnCallRotation, "id">) => OnCallRotation;
  recordPagingEvent: (incidentId: string, rotationId: string, engineer: string) => void;
  acknowledgePage: (auditId: string) => void;
  createChangeRequest: (input: Omit<ChangeRequest, "id" | "state" | "timeline"> & { state?: ChangeState }) => ChangeRequest;
  transitionChangeState: (changeId: string, nextState: ChangeState, actor: string, options?: { approverName?: string; overrideFreeze?: boolean }) => void;
  scheduleFreezeWindow: (window: Omit<FreezeWindow, "id">) => void;
  createService: (service: Omit<Service, "id" | "runbooks" | "checklists"> & { runbooks?: RunbookReference[]; checklists?: ChecklistItem[] }) => Service;
  updateService: (serviceId: string, updates: Partial<Service>) => void;
  addServiceRunbook: (serviceId: string, runbook: Omit<RunbookReference, "id">) => void;
  toggleServiceChecklist: (serviceId: string, checklistId: string, completedBy: string) => void;
  registerDependencyItem: (item: Omit<DependencyItem, "id">) => DependencyItem;
  saveBusinessCalendar: (calendar: Omit<BusinessCalendar, "id"> & { id?: string }) => BusinessCalendar;
  escalateIfNeeded: () => void;
  saveSearch: (search: Omit<SavedSearch, "id" | "sharedUrl">) => SavedSearch;
  captureOpsMetrics: () => OpsMetricSnapshot;
  saveDocument: (doc: Partial<OpsDocument> & { id?: string; title: string }) => OpsDocument;
  requestDocApproval: (docId: string, reviewer: string) => void;
  respondToDocApproval: (approvalId: string, status: "approved" | "rejected") => void;
  updatePortfolio: (initiative: Omit<Initiative, "id"> & { id?: string }) => Initiative;
  savePortfolioView: (view: Omit<PortfolioView, "id"> & { id?: string }) => PortfolioView;
  saveDependencyRisk: (risk: Omit<DependencyRiskRecord, "id"> & { id?: string }) => DependencyRiskRecord;
  saveObjective: (objective: Omit<Objective, "id"> & { id?: string }) => Objective;
  recordImportJob: (job: Omit<ImportJob, "id" | "status"> & { status?: ImportJob["status"] }) => ImportJob;
  updateImportJobStatus: (jobId: string, status: ImportJob["status"], errors?: string[]) => void;
  recordExport: (exportJob: Omit<ExportJob, "id">) => ExportJob;
  manageToken: (token: Omit<ApiToken, "id" | "createdAt"> & { id?: string; revoke?: boolean }) => ApiToken;
  scheduleDigest: (schedule: Omit<DigestSchedule, "id"> & { id?: string }) => DigestSchedule;
  recordReport: (report: Omit<PortfolioReport, "id">) => PortfolioReport;
  definePerformanceGuardrail: (guardrail: Omit<PerformanceGuardrail, "id"> & { id?: string }) => PerformanceGuardrail;
  recordBackupJob: (job: Omit<BackupJob, "id"> & { id?: string }) => BackupJob;
  recordFailoverDrill: (drill: Omit<FailoverDrill, "id"> & { id?: string }) => FailoverDrill;
  recordMobileApproval: (approval: Omit<MobileApproval, "id"> & { id?: string }) => MobileApproval;
  recordOfflineItem: (item: Omit<OfflineItem, "id"> & { id?: string }) => OfflineItem;
  recordSandboxPromotion: (promotion: Omit<SandboxPromotion, "id"> & { id?: string }) => SandboxPromotion;
  recordTemplateVersion: (version: Omit<TemplateVersion, "id"> & { id?: string }) => TemplateVersion;
  recordScimEvent: (event: Omit<ScimEvent, "id">) => ScimEvent;
  recordSlo: (slo: Omit<SloDefinition, "id"> & { id?: string }) => SloDefinition;
}

const OperationsContext = createContext<OperationsContextValue | undefined>(undefined);

export function OperationsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OperationsState>(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as OperationsState;
        return { ...defaultState, ...parsed };
      } catch (error) {
        console.error("Failed to parse operations state", error);
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const findActiveShift = (rotation: OnCallRotation) => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    return rotation.shifts.find((shift) => {
      if (shift.dayOfWeek !== day) return false;
      if (shift.startHour <= shift.endHour) {
        return hour >= shift.startHour && hour < shift.endHour;
      }
      // overnight shift
      return hour >= shift.startHour || hour < shift.endHour;
    });
  };

  const escalateIfNeeded = () => {
    const now = new Date();
    setState((prev) => {
      let changed = false;
      const updatedIncidents = prev.incidents.map((incident) => {
        const due = parseISO(incident.slaDueAt);
        const minutesToDue = differenceInMinutes(due, now);
        if (minutesToDue <= 30 && minutesToDue > 0 && !incident.nearBreachEscalated) {
          changed = true;
          return { ...incident, nearBreachEscalated: true };
        }
        if (isBefore(due, now) && !incident.breachEscalated) {
          changed = true;
          return { ...incident, breachEscalated: true };
        }
        return incident;
      });
      if (!changed) return prev;
      return { ...prev, incidents: updatedIncidents };
    });
  };

  useEffect(() => {
    const interval = setInterval(() => escalateIfNeeded(), 60_000);
    return () => clearInterval(interval);
  }, []);

  const value: OperationsContextValue = useMemo(() => ({
    ...state,
    createIncident: ({ title, description, severity, affectedServices, businessCalendarId }) => {
      const now = new Date();
      const slaDueAt = addHours(now, SLA_BY_SEVERITY[severity]).toISOString();
      const incident: Incident = {
        id: createId(),
        title,
        description,
        severity,
        affectedServices,
        state: "open",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        slaDueAt,
        workspace: {
          timeline: [
            {
              id: createId(),
              timestamp: now.toISOString(),
              actor: "system",
              action: "Incident created",
            },
          ],
          responders: [],
          tasks: [],
          links: [],
        },
        postmortem: null,
        businessCalendarId,
        slaPausedAt: null,
      };

      setState((prev) => ({
        ...prev,
        incidents: [...prev.incidents, incident],
      }));

      if (severity === "Sev1") {
        const pagingEntries = state.onCallRotations.flatMap((rotation) => {
          const activeShift = findActiveShift(rotation);
          if (!activeShift) return [];
          return [{
            id: createId(),
            incidentId: incident.id,
            rotationId: rotation.id,
            engineer: activeShift.engineer,
            triggeredAt: new Date().toISOString(),
          }];
        });
        if (pagingEntries.length) {
          setState((prev) => ({
            ...prev,
            pagingAudit: [...prev.pagingAudit, ...pagingEntries],
          }));
        }
      }

      return incident;
    },
    transitionIncident: (incidentId, nextState, actor) => {
      setState((prev) => {
        const incidents = prev.incidents.map((incident) => {
          if (incident.id !== incidentId) return incident;
          const now = new Date();
          const calendar = incident.businessCalendarId
            ? prev.businessCalendars.find((cal) => cal.id === incident.businessCalendarId)
            : undefined;
          const isPauseState = calendar?.pauseStates.includes(nextState) ?? false;
          let slaDueAt = incident.slaDueAt;
          let slaPausedAt = incident.slaPausedAt ?? null;
          const timelineEntries = [
            ...incident.workspace.timeline,
            {
              id: createId(),
              timestamp: now.toISOString(),
              actor,
              action: `Moved to ${nextState}`,
            },
          ];
          if (isPauseState && !slaPausedAt) {
            slaPausedAt = now.toISOString();
            timelineEntries.push({
              id: createId(),
              timestamp: now.toISOString(),
              actor: "system",
              action: "SLA paused per business hours",
            });
          }
          if (!isPauseState && slaPausedAt) {
            const pausedMinutes = differenceInMinutes(now, parseISO(slaPausedAt));
            slaDueAt = addMinutes(parseISO(slaDueAt), pausedMinutes).toISOString();
            timelineEntries.push({
              id: createId(),
              timestamp: now.toISOString(),
              actor: "system",
              action: "SLA resumed",
            });
            slaPausedAt = null;
          }
          const updated: Incident = {
            ...incident,
            state: nextState,
            updatedAt: now.toISOString(),
            slaDueAt,
            slaPausedAt,
            workspace: {
              ...incident.workspace,
              timeline: timelineEntries,
            },
          };
          if (nextState === "resolved" && !incident.postmortem) {
            updated.workspace.timeline.push({
              id: createId(),
              timestamp: now.toISOString(),
              actor: "system",
              action: "Postmortem required",
            });
          }
          return updated;
        });
        return { ...prev, incidents };
      });
    },
    addIncidentTimelineEntry: (incidentId, entry) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                workspace: {
                  ...incident.workspace,
                  timeline: [
                    ...incident.workspace.timeline,
                    {
                      id: createId(),
                      timestamp: entry.timestamp ?? new Date().toISOString(),
                      actor: entry.actor,
                      action: entry.action,
                    },
                  ],
                },
              }
            : incident
        ),
      }));
    },
    addIncidentResponder: (incidentId, responder) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                workspace: {
                  ...incident.workspace,
                  responders: Array.from(new Set([...incident.workspace.responders, responder])),
                },
              }
            : incident
        ),
      }));
    },
    addWorkspaceTask: (incidentId, task) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                workspace: {
                  ...incident.workspace,
                  tasks: [
                    ...incident.workspace.tasks,
                    {
                      id: createId(),
                      title: task.title,
                      owner: task.owner,
                      status: "open",
                    },
                  ],
                },
              }
            : incident
        ),
      }));
    },
    updateWorkspaceTaskStatus: (incidentId, taskId, status) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                workspace: {
                  ...incident.workspace,
                  tasks: incident.workspace.tasks.map((task) =>
                    task.id === taskId ? { ...task, status } : task
                  ),
                },
              }
            : incident
        ),
      }));
    },
    addWorkspaceLink: (incidentId, link) => {
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                workspace: {
                  ...incident.workspace,
                  links: [
                    ...incident.workspace.links,
                    {
                      id: createId(),
                      label: link.label,
                      url: link.url,
                    },
                  ],
                },
              }
            : incident
        ),
      }));
    },
    recordPostmortem: (incidentId, record) => {
      const now = new Date();
      setState((prev) => ({
        ...prev,
        incidents: prev.incidents.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                postmortem: {
                  id: createId(),
                  incidentId,
                  impact: record.impact,
                  rootCause: record.rootCause,
                  correctiveActions: record.correctiveActions,
                  createdAt: now.toISOString(),
                  createdBy: record.createdBy,
                  actionItems: record.actionItems.map((item) => ({
                    ...item,
                    id: createId(),
                    status: "open",
                  })),
                },
                workspace: {
                  ...incident.workspace,
                  timeline: [
                    ...incident.workspace.timeline,
                    {
                      id: createId(),
                      timestamp: now.toISOString(),
                      actor: record.createdBy,
                      action: "Postmortem captured",
                    },
                  ],
                },
              }
            : incident
        ),
      }));
    },
    createOnCallRotation: (rotation) => {
      const newRotation: OnCallRotation = { ...rotation, id: createId() };
      setState((prev) => ({
        ...prev,
        onCallRotations: [...prev.onCallRotations, newRotation],
      }));
      return newRotation;
    },
    recordPagingEvent: (incidentId, rotationId, engineer) => {
      const entry: PagingAuditEntry = {
        id: createId(),
        incidentId,
        rotationId,
        engineer,
        triggeredAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        pagingAudit: [...prev.pagingAudit, entry],
      }));
    },
    acknowledgePage: (auditId) => {
      setState((prev) => ({
        ...prev,
        pagingAudit: prev.pagingAudit.map((entry) =>
          entry.id === auditId
            ? { ...entry, acknowledgedAt: new Date().toISOString() }
            : entry
        ),
      }));
    },
    createChangeRequest: (input) => {
      const change: ChangeRequest = {
        id: createId(),
        title: input.title,
        description: input.description,
        risk: input.risk,
        impact: input.impact,
        backoutPlan: input.backoutPlan,
        state: input.state ?? "draft",
        requestedBy: input.requestedBy,
        approverName: input.approverName,
        approvedAt: input.approvedAt,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        serviceIds: input.serviceIds,
        freezeOverride: input.freezeOverride,
        timeline: [
          {
            id: createId(),
            timestamp: new Date().toISOString(),
            actor: input.requestedBy,
            action: "Change created",
          },
        ],
      };
      setState((prev) => ({
        ...prev,
        changeRequests: [...prev.changeRequests, change],
      }));
      return change;
    },
    transitionChangeState: (changeId, nextState, actor, options) => {
      setState((prev) => {
        const change = prev.changeRequests.find((c) => c.id === changeId);
        if (!change) return prev;
        if (nextState === "approved" && (!change.risk || !change.impact || !change.backoutPlan)) {
          throw new Error("Risk, impact, and backout plan are required before approval");
        }
        if (nextState === "implementing" && change.state !== "approved" && !options?.overrideFreeze) {
          throw new Error("Change must be approved before implementing");
        }
        if (nextState === "implementing" && !options?.overrideFreeze) {
          const now = new Date();
          const affectedTeams = change.serviceIds
            .map((serviceId) => prev.services.find((service) => service.id === serviceId)?.ownerTeam)
            .filter((team): team is string => Boolean(team));
          const inFreeze = prev.freezeWindows.some((window) => {
            const start = parseISO(window.start);
            const end = parseISO(window.end);
            return isBefore(start, now) && isAfter(end, now) && window.teams.some((team) => affectedTeams.includes(team));
          });
          if (inFreeze) {
            throw new Error("Change is blocked by a freeze window");
          }
        }
        const updatedChanges = prev.changeRequests.map((c) =>
          c.id === changeId
            ? {
                ...c,
                state: nextState,
                approverName: options?.approverName ?? c.approverName,
                approvedAt: nextState === "approved" ? new Date().toISOString() : c.approvedAt,
                freezeOverride: options?.overrideFreeze ?? c.freezeOverride,
                timeline: [
                  ...c.timeline,
                  {
                    id: createId(),
                    timestamp: new Date().toISOString(),
                    actor,
                    action: `Moved to ${nextState}`,
                  },
                ],
              }
            : c
        );
        return { ...prev, changeRequests: updatedChanges };
      });
    },
    scheduleFreezeWindow: (window) => {
      setState((prev) => ({
        ...prev,
        freezeWindows: [...prev.freezeWindows, { ...window, id: createId() }],
      }));
    },
    createService: (service) => {
      const newService: Service = {
        id: createId(),
        name: service.name,
        ownerTeam: service.ownerTeam,
        runbookLink: service.runbookLink,
        tier: service.tier,
        runbooks: service.runbooks ?? [],
        checklists: service.checklists ?? [],
      };
      setState((prev) => ({
        ...prev,
        services: [...prev.services, newService],
      }));
      return newService;
    },
    updateService: (serviceId, updates) => {
      setState((prev) => ({
        ...prev,
        services: prev.services.map((service) =>
          service.id === serviceId
            ? { ...service, ...updates }
            : service
        ),
      }));
    },
    addServiceRunbook: (serviceId, runbook) => {
      setState((prev) => ({
        ...prev,
        services: prev.services.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                runbooks: [...service.runbooks, { ...runbook, id: createId() }],
              }
            : service
        ),
      }));
    },
    toggleServiceChecklist: (serviceId, checklistId, completedBy) => {
      setState((prev) => ({
        ...prev,
        services: prev.services.map((service) =>
          service.id === serviceId
            ? {
                ...service,
                checklists: service.checklists.map((item) =>
                  item.id === checklistId
                    ? {
                        ...item,
                        completed: !item.completed,
                        completedAt: !item.completed ? new Date().toISOString() : undefined,
                        completedBy: !item.completed ? completedBy : undefined,
                      }
                    : item
                ),
              }
            : service
        ),
      }));
    },
    registerDependencyItem: (item) => {
      const newItem: DependencyItem = { ...item, id: createId() };
      setState((prev) => ({
        ...prev,
        dependencyItems: [...prev.dependencyItems, newItem],
      }));
      return newItem;
    },
    saveBusinessCalendar: (calendar) => {
      const id = calendar.id ?? createId();
      const newCalendar: BusinessCalendar = { ...calendar, id };
      setState((prev) => {
        const existing = prev.businessCalendars.find((cal) => cal.id === id);
        if (existing) {
          return {
            ...prev,
            businessCalendars: prev.businessCalendars.map((cal) => (cal.id === id ? newCalendar : cal)),
          };
        }
        return { ...prev, businessCalendars: [...prev.businessCalendars, newCalendar] };
      });
      return newCalendar;
    },
    escalateIfNeeded,
    saveSearch: (search) => {
      const newSearch: SavedSearch = {
        id: createId(),
        name: search.name,
        query: search.query,
        filters: search.filters,
        visibility: search.visibility,
        owner: search.owner,
        sharedUrl: `${window.location.origin}/dashboard/search?q=${encodeURIComponent(search.query)}`,
      };
      setState((prev) => ({
        ...prev,
        savedSearches: [...prev.savedSearches, newSearch],
      }));
      return newSearch;
    },
    captureOpsMetrics: () => {
      const now = new Date();
      const resolvedIncidents = state.incidents.filter((incident) => incident.state === "resolved" && incident.postmortem);
      const mtta = resolvedIncidents.length
        ? resolvedIncidents.reduce((sum, incident) => {
            const ackEntry = incident.workspace.timeline.find((entry) => entry.action.includes("Moved to mitigated"));
            if (!ackEntry) return sum;
            return sum + differenceInMinutes(parseISO(ackEntry.timestamp), parseISO(incident.createdAt));
          }, 0) / resolvedIncidents.length
        : 0;
      const mttr = resolvedIncidents.length
        ? resolvedIncidents.reduce((sum, incident) =>
            sum + differenceInMinutes(parseISO(incident.updatedAt), parseISO(incident.createdAt))
          , 0) / resolvedIncidents.length
        : 0;
      const slaCompliance = state.incidents.length
        ? (state.incidents.filter((incident) => isBefore(parseISO(incident.updatedAt), parseISO(incident.slaDueAt))).length / state.incidents.length) * 100
        : 100;
      const failedChanges = state.changeRequests.filter((change) => change.state === "validated" && change.timeline.some((entry) => entry.action.includes("failure")));
      const changeFailureRate = state.changeRequests.length
        ? (failedChanges.length / state.changeRequests.length) * 100
        : 0;
      const snapshot: OpsMetricSnapshot = {
        id: createId(),
        capturedAt: now.toISOString(),
        mttaMinutes: Math.round(mtta),
        mttrMinutes: Math.round(mttr),
        slaCompliance: Math.round(slaCompliance),
        changeFailureRate: Math.round(changeFailureRate),
      };
      setState((prev) => ({
        ...prev,
        opsMetrics: [...prev.opsMetrics, snapshot],
      }));
      return snapshot;
    },
    saveDocument: (doc) => {
      const now = new Date().toISOString();
      const id = doc.id ?? createId();
      const existing = state.documents.find((d) => d.id === id);
      const newDocument: OpsDocument = {
        id,
        title: doc.title,
        templateId: doc.templateId ?? existing?.templateId,
        content: doc.content ?? existing?.content ?? "",
        autosavedAt: now,
        chips: doc.chips ?? existing?.chips ?? [],
        boundFields: doc.boundFields ?? existing?.boundFields ?? [],
        changes: doc.changes ?? existing?.changes ?? [],
        approvals: doc.approvals ?? existing?.approvals ?? [],
        requiredApprovers: doc.requiredApprovers ?? existing?.requiredApprovers ?? [],
        status: doc.status ?? existing?.status ?? "draft",
      };
      setState((prev) => ({
        ...prev,
        documents: prev.documents.some((d) => d.id === id)
          ? prev.documents.map((d) => (d.id === id ? newDocument : d))
          : [...prev.documents, newDocument],
      }));
      return newDocument;
    },
    requestDocApproval: (docId, reviewer) => {
      const approval: DocApproval = {
        id: createId(),
        docId,
        reviewer,
        status: "pending",
        requestedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) =>
          doc.id === docId
            ? { ...doc, approvals: [...doc.approvals, approval] }
            : doc
        ),
      }));
    },
    respondToDocApproval: (approvalId, status) => {
      setState((prev) => ({
        ...prev,
        documents: prev.documents.map((doc) => {
          const approvals = doc.approvals.map((approval) =>
            approval.id === approvalId
              ? { ...approval, status, respondedAt: new Date().toISOString() }
              : approval
          );
          const allApproved = doc.requiredApprovers.length
            ? doc.requiredApprovers.every((approver) => approvals.some((approval) => approval.reviewer === approver && approval.status === "approved"))
            : approvals.every((approval) => approval.status === "approved");
          return {
            ...doc,
            approvals,
            status: allApproved ? "final" : doc.status,
          };
        }),
      }));
    },
    updatePortfolio: (initiative) => {
      const id = initiative.id ?? createId();
      const newInitiative: Initiative = {
        id,
        name: initiative.name,
        health: initiative.health,
        progress: initiative.progress,
        budgetPlanned: initiative.budgetPlanned,
        budgetActual: initiative.budgetActual,
        epicIds: initiative.epicIds,
      };
      setState((prev) => ({
        ...prev,
        initiatives: prev.initiatives.some((item) => item.id === id)
          ? prev.initiatives.map((item) => (item.id === id ? newInitiative : item))
          : [...prev.initiatives, newInitiative],
      }));
      return newInitiative;
    },
    savePortfolioView: (view) => {
      const id = view.id ?? createId();
      const newView: PortfolioView = {
        id,
        name: view.name,
        filters: view.filters,
        sharedWith: view.sharedWith,
      };
      setState((prev) => ({
        ...prev,
        portfolioViews: prev.portfolioViews.some((item) => item.id === id)
          ? prev.portfolioViews.map((item) => (item.id === id ? newView : item))
          : [...prev.portfolioViews, newView],
      }));
      return newView;
    },
    saveDependencyRisk: (risk) => {
      const id = risk.id ?? createId();
      const newRisk: DependencyRiskRecord = {
        id,
        blockingTeam: risk.blockingTeam,
        blockedTeam: risk.blockedTeam,
        severity: risk.severity,
        count: risk.count,
        impactedItems: risk.impactedItems,
      };
      setState((prev) => ({
        ...prev,
        dependencyRisks: prev.dependencyRisks.some((item) => item.id === id)
          ? prev.dependencyRisks.map((item) => (item.id === id ? newRisk : item))
          : [...prev.dependencyRisks, newRisk],
      }));
      return newRisk;
    },
    saveObjective: (objective) => {
      const id = objective.id ?? createId();
      const newObjective: Objective = {
        id,
        name: objective.name,
        description: objective.description,
        quarter: objective.quarter,
        owner: objective.owner,
        keyResults: objective.keyResults,
      };
      setState((prev) => ({
        ...prev,
        objectives: prev.objectives.some((item) => item.id === id)
          ? prev.objectives.map((item) => (item.id === id ? newObjective : item))
          : [...prev.objectives, newObjective],
      }));
      return newObjective;
    },
    recordImportJob: (job) => {
      const newJob: ImportJob = {
        id: createId(),
        type: job.type,
        status: job.status ?? "pending",
        createdAt: new Date().toISOString(),
        mapping: job.mapping,
        errors: job.errors,
      };
      setState((prev) => ({
        ...prev,
        importJobs: [...prev.importJobs, newJob],
      }));
      return newJob;
    },
    updateImportJobStatus: (jobId, status, errors) => {
      setState((prev) => ({
        ...prev,
        importJobs: prev.importJobs.map((job) =>
          job.id === jobId
            ? { ...job, status, errors: errors ?? job.errors }
            : job
        ),
      }));
    },
    recordExport: (exportJob) => {
      const newExport: ExportJob = {
        id: createId(),
        format: exportJob.format,
        scope: exportJob.scope,
        tokenId: exportJob.tokenId,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        exportJobs: [...prev.exportJobs, newExport],
      }));
      return newExport;
    },
    manageToken: (token) => {
      const id = token.id ?? createId();
      const newToken: ApiToken = {
        id,
        name: token.name,
        createdAt: token.id ? state.apiTokens.find((t) => t.id === id)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
        lastUsedAt: token.lastUsedAt,
        revoked: token.revoke ? true : token.revoked,
      };
      setState((prev) => ({
        ...prev,
        apiTokens: prev.apiTokens.some((item) => item.id === id)
          ? prev.apiTokens.map((item) => (item.id === id ? newToken : item))
          : [...prev.apiTokens, newToken],
      }));
      return newToken;
    },
    scheduleDigest: (schedule) => {
      const id = schedule.id ?? createId();
      const newSchedule: DigestSchedule = {
        id,
        scope: schedule.scope,
        cadence: schedule.cadence,
        channel: schedule.channel,
        recipients: schedule.recipients,
        lastSentAt: schedule.lastSentAt,
      };
      setState((prev) => ({
        ...prev,
        digestSchedules: prev.digestSchedules.some((item) => item.id === id)
          ? prev.digestSchedules.map((item) => (item.id === id ? newSchedule : item))
          : [...prev.digestSchedules, newSchedule],
      }));
      return newSchedule;
    },
    recordReport: (report) => {
      const newReport: PortfolioReport = {
        id: createId(),
        type: report.type,
        generatedAt: new Date().toISOString(),
        url: report.url,
      };
      setState((prev) => ({
        ...prev,
        reports: [...prev.reports, newReport],
      }));
      return newReport;
    },
    definePerformanceGuardrail: (guardrail) => {
      const id = guardrail.id ?? createId();
      const newGuardrail: PerformanceGuardrail = {
        id,
        name: guardrail.name,
        threshold: guardrail.threshold,
        metric: guardrail.metric,
        status: guardrail.status,
      };
      setState((prev) => ({
        ...prev,
        performanceGuardrails: prev.performanceGuardrails.some((item) => item.id === id)
          ? prev.performanceGuardrails.map((item) => (item.id === id ? newGuardrail : item))
          : [...prev.performanceGuardrails, newGuardrail],
      }));
      return newGuardrail;
    },
    recordBackupJob: (job) => {
      const id = job.id ?? createId();
      const newJob: BackupJob = {
        id,
        projectId: job.projectId,
        requestedAt: job.requestedAt ?? new Date().toISOString(),
        completedAt: job.completedAt,
        restorePoint: job.restorePoint,
      };
      setState((prev) => ({
        ...prev,
        backupJobs: prev.backupJobs.some((item) => item.id === id)
          ? prev.backupJobs.map((item) => (item.id === id ? newJob : item))
          : [...prev.backupJobs, newJob],
      }));
      return newJob;
    },
    recordFailoverDrill: (drill) => {
      const id = drill.id ?? createId();
      const newDrill: FailoverDrill = {
        id,
        name: drill.name,
        executedAt: drill.executedAt ?? new Date().toISOString(),
        status: drill.status,
        notes: drill.notes,
      };
      setState((prev) => ({
        ...prev,
        failoverDrills: prev.failoverDrills.some((item) => item.id === id)
          ? prev.failoverDrills.map((item) => (item.id === id ? newDrill : item))
          : [...prev.failoverDrills, newDrill],
      }));
      return newDrill;
    },
    recordMobileApproval: (approval) => {
      const id = approval.id ?? createId();
      const newApproval: MobileApproval = {
        id,
        itemId: approval.itemId,
        status: approval.status,
        requestedAt: approval.requestedAt ?? new Date().toISOString(),
        decidedAt: approval.decidedAt,
        comment: approval.comment,
      };
      setState((prev) => ({
        ...prev,
        mobileApprovals: prev.mobileApprovals.some((item) => item.id === id)
          ? prev.mobileApprovals.map((item) => (item.id === id ? newApproval : item))
          : [...prev.mobileApprovals, newApproval],
      }));
      return newApproval;
    },
    recordOfflineItem: (item) => {
      const id = item.id ?? createId();
      const newItem: OfflineItem = {
        id,
        type: item.type,
        payload: item.payload,
        createdAt: item.createdAt ?? new Date().toISOString(),
        syncedAt: item.syncedAt,
      };
      setState((prev) => ({
        ...prev,
        offlineQueue: prev.offlineQueue.some((entry) => entry.id === id)
          ? prev.offlineQueue.map((entry) => (entry.id === id ? newItem : entry))
          : [...prev.offlineQueue, newItem],
      }));
      return newItem;
    },
    recordSandboxPromotion: (promotion) => {
      const id = promotion.id ?? createId();
      const newPromotion: SandboxPromotion = {
        id,
        name: promotion.name,
        submittedAt: promotion.submittedAt ?? new Date().toISOString(),
        approvedAt: promotion.approvedAt,
        status: promotion.status,
      };
      setState((prev) => ({
        ...prev,
        sandboxPromotions: prev.sandboxPromotions.some((item) => item.id === id)
          ? prev.sandboxPromotions.map((item) => (item.id === id ? newPromotion : item))
          : [...prev.sandboxPromotions, newPromotion],
      }));
      return newPromotion;
    },
    recordTemplateVersion: (version) => {
      const id = version.id ?? createId();
      const newVersion: TemplateVersion = {
        id,
        templateId: version.templateId,
        version: version.version,
        createdAt: version.createdAt ?? new Date().toISOString(),
        createdBy: version.createdBy,
        changelog: version.changelog,
        published: version.published,
      };
      setState((prev) => ({
        ...prev,
        templateVersions: prev.templateVersions.some((item) => item.id === id)
          ? prev.templateVersions.map((item) => (item.id === id ? newVersion : item))
          : [...prev.templateVersions, newVersion],
      }));
      return newVersion;
    },
    recordScimEvent: (event) => {
      const newEvent: ScimEvent = {
        id: createId(),
        type: event.type,
        user: event.user,
        occurredAt: event.occurredAt ?? new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        scimEvents: [...prev.scimEvents, newEvent],
      }));
      return newEvent;
    },
    recordSlo: (slo) => {
      const id = slo.id ?? createId();
      const newSlo: SloDefinition = {
        id,
        name: slo.name,
        indicator: slo.indicator,
        target: slo.target,
        burnRate: slo.burnRate,
        linkedIncidents: slo.linkedIncidents,
      };
      setState((prev) => ({
        ...prev,
        sloDefinitions: prev.sloDefinitions.some((item) => item.id === id)
          ? prev.sloDefinitions.map((item) => (item.id === id ? newSlo : item))
          : [...prev.sloDefinitions, newSlo],
      }));
      return newSlo;
    },
  }), [state]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export function useOperations() {
  const context = useContext(OperationsContext);
  if (!context) {
    throw new Error("useOperations must be used within an OperationsProvider");
  }
  return context;
}
