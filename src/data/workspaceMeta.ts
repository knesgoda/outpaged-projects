export interface WorkspaceMetaValue {
  id: string;
  value: string;
  label: string;
  description?: string;
  synonyms?: string[];
  tags?: string[];
  permissions?: string[];
  icon?: string;
}

export interface WorkspaceMetaField {
  id: string;
  label: string;
  slug: string;
  type: "string" | "number" | "boolean" | "date" | "enum" | "user" | "project";
  description?: string;
  synonyms?: string[];
  permissions?: string[];
  values?: WorkspaceMetaValue[];
  icon?: string;
}

export interface WorkspaceMetaProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  permissions?: string[];
  icon?: string;
  tags?: string[];
}

export interface WorkspaceMetaSprint {
  id: string;
  name: string;
  status: "planning" | "active" | "completed";
  startDate: string;
  endDate: string;
  projectId?: string;
  description?: string;
  permissions?: string[];
  icon?: string;
}

export interface WorkspaceMetaTeam {
  id: string;
  name: string;
  slug: string;
  description?: string;
  permissions?: string[];
  icon?: string;
  tags?: string[];
}

export interface WorkspaceMetaLabel {
  id: string;
  value: string;
  description?: string;
  synonyms?: string[];
  permissions?: string[];
  icon?: string;
}

export interface WorkspaceMetaUser {
  id: string;
  handle: string;
  name: string;
  title?: string;
  synonyms?: string[];
  permissions?: string[];
  icon?: string;
}

export interface WorkspaceMetadata {
  fields: WorkspaceMetaField[];
  projects: WorkspaceMetaProject[];
  sprints: WorkspaceMetaSprint[];
  teams: WorkspaceMetaTeam[];
  labels: WorkspaceMetaLabel[];
  users: WorkspaceMetaUser[];
  synonyms: Record<string, string[]>;
}

export const DEFAULT_WORKSPACE_ID = "workspace-demo";

const now = new Date();
const daysFromNow = (days: number) => {
  const copy = new Date(now);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString();
};

const WORKSPACE_METADATA: Record<string, WorkspaceMetadata> = {
  [DEFAULT_WORKSPACE_ID]: {
    fields: [
      {
        id: "field-status",
        label: "Status",
        slug: "status",
        type: "enum",
        description: "Workflow stage",
        synonyms: ["stage", "state"],
        icon: "workflow",
        values: [
          {
            id: "status-ready",
            value: "Ready",
            label: "Status: Ready",
            description: "Work ready to start",
            tags: ["status"],
          },
          {
            id: "status-progress",
            value: "In Progress",
            label: "Status: In Progress",
            description: "Currently being worked",
            tags: ["status"],
          },
          {
            id: "status-review",
            value: "In Review",
            label: "Status: In Review",
            description: "Pending review or approval",
            tags: ["status"],
          },
          {
            id: "status-done",
            value: "Done",
            label: "Status: Done",
            description: "Completed work",
            tags: ["status"],
          },
        ],
      },
      {
        id: "field-priority",
        label: "Priority",
        slug: "priority",
        type: "enum",
        description: "Importance level",
        synonyms: ["severity", "criticality"],
        icon: "flag-triangle-right",
        values: [
          {
            id: "priority-low",
            value: "Low",
            label: "Priority: Low",
            description: "Nice to have or low urgency",
            tags: ["priority"],
          },
          {
            id: "priority-medium",
            value: "Medium",
            label: "Priority: Medium",
            description: "Normal priority work",
            tags: ["priority"],
          },
          {
            id: "priority-high",
            value: "High",
            label: "Priority: High",
            description: "Time sensitive and impactful",
            tags: ["priority"],
          },
          {
            id: "priority-urgent",
            value: "Urgent",
            label: "Priority: Urgent",
            description: "Requires immediate attention",
            tags: ["priority"],
            permissions: ["search.priority.urgent"],
          },
        ],
      },
      {
        id: "field-assignee",
        label: "Assignee",
        slug: "assignee",
        type: "user",
        description: "Person responsible",
        synonyms: ["owner", "responsible"],
        icon: "user-circle",
      },
      {
        id: "field-team",
        label: "Team",
        slug: "team",
        type: "project",
        description: "Owning team",
        synonyms: ["squad"],
        icon: "users",
      },
      {
        id: "field-created",
        label: "Created",
        slug: "created_at",
        type: "date",
        description: "Created at timestamp",
        synonyms: ["created", "opened"],
        icon: "calendar-clock",
      },
      {
        id: "field-updated",
        label: "Updated",
        slug: "updated_at",
        type: "date",
        description: "Last updated timestamp",
        synonyms: ["modified", "touched"],
        icon: "calendar-sync",
      },
    ],
    projects: [
      {
        id: "proj-operations",
        key: "OPS",
        name: "Atlas Customer Onboarding",
        description: "Cross-functional program improving activation and retention",
        icon: "folder-kanban",
        tags: ["customer", "experience"],
      },
      {
        id: "proj-security",
        key: "SEC",
        name: "Security Hardening",
        description: "Hardening auth flows and monitoring for abuse",
        icon: "shield-check",
        permissions: ["search.projects.confidential"],
        tags: ["security"],
      },
      {
        id: "proj-collab",
        key: "COLL",
        name: "Realtime Collaboration",
        description: "Collaboration surface enhancements",
        icon: "sparkle",
        tags: ["collaboration"],
      },
    ],
    sprints: [
      {
        id: "sprint-ops-42",
        name: "Sprint 42 · Ops",
        status: "active",
        startDate: daysFromNow(-7),
        endDate: daysFromNow(7),
        projectId: "proj-operations",
        description: "Stabilize ingestion pipeline and improve alerting",
        icon: "timer",
      },
      {
        id: "sprint-sec-11",
        name: "Sprint 11 · Security",
        status: "planning",
        startDate: daysFromNow(2),
        endDate: daysFromNow(16),
        projectId: "proj-security",
        description: "Pen-test readiness and SSO guard rails",
        permissions: ["search.projects.confidential"],
        icon: "shield-half",
      },
      {
        id: "sprint-collab-27",
        name: "Sprint 27 · Collaboration",
        status: "completed",
        startDate: daysFromNow(-30),
        endDate: daysFromNow(-16),
        projectId: "proj-collab",
        description: "Finish document presence and co-edit alerts",
        icon: "rocket",
      },
    ],
    teams: [
      {
        id: "sparks",
        name: "Team Sparks",
        slug: "sparks",
        description: "Growth experiments squad",
        icon: "flame",
        tags: ["growth"],
      },
      {
        id: "insight",
        name: "Team Insight",
        slug: "insight",
        description: "Data & AI platform",
        icon: "brain",
        tags: ["data"],
      },
      {
        id: "atlas",
        name: "Team Atlas",
        slug: "atlas",
        description: "Customer onboarding specialists",
        icon: "compass",
        tags: ["customer"],
      },
    ],
    labels: [
      {
        id: "ux",
        value: "ux",
        description: "User experience and design",
        synonyms: ["design"],
        icon: "pen",
      },
      {
        id: "backend",
        value: "backend",
        description: "Platform and services",
        icon: "server",
      },
      {
        id: "regression",
        value: "regression",
        description: "Returned bug",
        icon: "history",
      },
    ],
    users: [
      {
        id: "aaron",
        handle: "aaron",
        name: "Aaron Chen",
        title: "Staff Engineer",
        synonyms: ["ac", "aaron chen"],
        icon: "user-round",
      },
      {
        id: "samara",
        handle: "samara",
        name: "Samara Patel",
        title: "Product Designer",
        synonyms: ["sam"],
        icon: "user-round",
      },
      {
        id: "miguel",
        handle: "miguel",
        name: "Miguel Rodriguez",
        title: "Engineering Manager",
        synonyms: ["mike"],
        icon: "user-round",
      },
    ],
    synonyms: {
      asap: ["urgent", "high"],
      slow: ["low", "backlog"],
      owner: ["assignee", "responsible"],
      doc: ["document", "spec"],
      velocity: ["throughput", "speed"],
    },
  },
};

export const getWorkspaceMetadata = (workspaceId: string): WorkspaceMetadata => {
  return WORKSPACE_METADATA[workspaceId] ?? WORKSPACE_METADATA[DEFAULT_WORKSPACE_ID];
};
