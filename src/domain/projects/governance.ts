import { type ReactNode } from "react";

export type ProjectRoleKey =
  | "owner"
  | "program_manager"
  | "lead"
  | "contributor"
  | "reviewer"
  | "guest";

export interface ProjectRoleDefinition {
  id: ProjectRoleKey;
  name: string;
  description: string;
  inherits?: ProjectRoleKey[];
  emphasis?: "primary" | "accent" | "muted";
  icon?: ReactNode;
}

export const PROJECT_ROLE_ORDER: ProjectRoleKey[] = [
  "owner",
  "program_manager",
  "lead",
  "contributor",
  "reviewer",
  "guest",
];

const ROLE_PRIORITY: Record<ProjectRoleKey, number> = {
  owner: 5,
  program_manager: 4,
  lead: 3,
  contributor: 2,
  reviewer: 1,
  guest: 0,
};

export function projectRoleAtLeast(current: ProjectRoleKey, required: ProjectRoleKey) {
  return ROLE_PRIORITY[current] >= ROLE_PRIORITY[required];
}

export const PROJECT_ROLES: ProjectRoleDefinition[] = [
  {
    id: "owner",
    name: "Owner",
    description: "Full control over project governance, membership, and lifecycle operations.",
    emphasis: "primary",
  },
  {
    id: "program_manager",
    name: "Program Manager",
    description: "Can shape delivery, manage memberships, and enforce guardrails without deleting the project.",
    inherits: ["lead", "contributor"],
    emphasis: "accent",
  },
  {
    id: "lead",
    name: "Delivery Lead",
    description: "Owns day-to-day execution, can configure workflows and automations.",
    inherits: ["contributor"],
  },
  {
    id: "contributor",
    name: "Contributor",
    description: "Can create and update work items, participate in ceremonies, and comment across the project.",
  },
  {
    id: "reviewer",
    name: "Stakeholder",
    description: "Read-only access with the ability to acknowledge milestones and follow notifications.",
  },
  {
    id: "guest",
    name: "Guest",
    description: "Time-bound access to specific views or items. Ideal for vendors or customers.",
  },
];

export type ProjectPermissionKey =
  | "view_project"
  | "create_items"
  | "manage_settings"
  | "manage_lifecycle"
  | "manage_members"
  | "manage_field_security"
  | "manage_notifications"
  | "manage_automations"
  | "manage_integrations"
  | "manage_guests"
  | "view_audit_log"
  | "delete_project";

export interface ProjectPermissionDefinition {
  id: ProjectPermissionKey;
  label: string;
  description: string;
  category: "delivery" | "governance" | "security" | "communications";
}

export const PROJECT_PERMISSIONS: ProjectPermissionDefinition[] = [
  {
    id: "view_project",
    label: "View project",
    description: "Access project dashboards, boards, and read-only data.",
    category: "delivery",
  },
  {
    id: "create_items",
    label: "Create and edit work",
    description: "Create, edit, and transition work items in active boards.",
    category: "delivery",
  },
  {
    id: "manage_lifecycle",
    label: "Manage lifecycle",
    description: "Plan sprints, archive or restore the project, and manage releases.",
    category: "delivery",
  },
  {
    id: "manage_settings",
    label: "Manage settings",
    description: "Update project configuration, modules, and workflows.",
    category: "governance",
  },
  {
    id: "manage_members",
    label: "Manage members",
    description: "Invite, remove, and update project members and their roles.",
    category: "governance",
  },
  {
    id: "manage_field_security",
    label: "Manage field security",
    description: "Control which roles can see or edit sensitive fields.",
    category: "security",
  },
  {
    id: "manage_notifications",
    label: "Manage notifications",
    description: "Tune notification policies, digests, and escalation rules.",
    category: "communications",
  },
  {
    id: "manage_automations",
    label: "Manage automations",
    description: "Create and update automations, integrations, and webhooks.",
    category: "governance",
  },
  {
    id: "manage_integrations",
    label: "Manage integrations",
    description: "Link external tools, data syncs, and component catalogues.",
    category: "governance",
  },
  {
    id: "manage_guests",
    label: "Manage guest access",
    description: "Issue or revoke guest links and control allowed capabilities.",
    category: "security",
  },
  {
    id: "view_audit_log",
    label: "View audit log",
    description: "Inspect security events, membership changes, and policy updates.",
    category: "security",
  },
  {
    id: "delete_project",
    label: "Delete project",
    description: "Permanently delete a project and its related data.",
    category: "security",
  },
];

export interface ProjectPermissionScheme {
  id: string;
  name: string;
  description: string;
  grants: Record<ProjectPermissionKey, ProjectRoleKey>;
  recommendedFor: string;
}

export const PROJECT_PERMISSION_SCHEMES: ProjectPermissionScheme[] = [
  {
    id: "standard_delivery",
    name: "Standard delivery",
    description: "Balanced controls for product teams collaborating with stakeholders.",
    recommendedFor: "Cross-functional delivery teams",
    grants: {
      view_project: "guest",
      create_items: "contributor",
      manage_lifecycle: "lead",
      manage_settings: "lead",
      manage_members: "program_manager",
      manage_field_security: "program_manager",
      manage_notifications: "lead",
      manage_automations: "lead",
      manage_integrations: "program_manager",
      manage_guests: "program_manager",
      view_audit_log: "program_manager",
      delete_project: "owner",
    },
  },
  {
    id: "regulated_delivery",
    name: "Regulated delivery",
    description: "Strict separation of duties with security-first defaults.",
    recommendedFor: "Financial services, healthcare, regulated workloads",
    grants: {
      view_project: "reviewer",
      create_items: "contributor",
      manage_lifecycle: "program_manager",
      manage_settings: "program_manager",
      manage_members: "owner",
      manage_field_security: "owner",
      manage_notifications: "program_manager",
      manage_automations: "program_manager",
      manage_integrations: "program_manager",
      manage_guests: "program_manager",
      view_audit_log: "program_manager",
      delete_project: "owner",
    },
  },
  {
    id: "open_collaboration",
    name: "Open collaboration",
    description: "Optimised for hackathons and innovation programs with lightweight guardrails.",
    recommendedFor: "Internal hack weeks and partner ecosystems",
    grants: {
      view_project: "guest",
      create_items: "reviewer",
      manage_lifecycle: "lead",
      manage_settings: "lead",
      manage_members: "lead",
      manage_field_security: "program_manager",
      manage_notifications: "lead",
      manage_automations: "lead",
      manage_integrations: "lead",
      manage_guests: "lead",
      view_audit_log: "program_manager",
      delete_project: "owner",
    },
  },
];

export interface ProjectNotificationScheme {
  id: string;
  name: string;
  description: string;
  cadence: "realtime" | "digest" | "escalation";
  channels: Array<"email" | "slack" | "push" | "webhook">;
  escalations?: string[];
}

export const PROJECT_NOTIFICATION_SCHEMES: ProjectNotificationScheme[] = [
  {
    id: "iterative_updates",
    name: "Iterative updates",
    description: "Real-time notifications in chat for delivery teams.",
    cadence: "realtime",
    channels: ["slack", "push"],
  },
  {
    id: "executive_digest",
    name: "Executive digest",
    description: "Curated weekly digest for leadership stakeholders.",
    cadence: "digest",
    channels: ["email"],
  },
  {
    id: "regulated_esc",
    name: "Regulated escalations",
    description: "Escalate SLA breaches and policy changes to compliance.",
    cadence: "escalation",
    channels: ["email", "webhook"],
    escalations: ["SLA breaches", "Field security changes", "Guest link issued"],
  },
];

export type FieldClassification = "open" | "restricted" | "confidential";

export interface ProjectFieldSecurityRule {
  fieldKey: string;
  label: string;
  classification: FieldClassification;
  minRoleToView: ProjectRoleKey;
  minRoleToEdit: ProjectRoleKey;
  maskBelowRole?: ProjectRoleKey;
}

export interface ProjectFieldSecurityPreset {
  id: string;
  name: string;
  description: string;
  rules: ProjectFieldSecurityRule[];
}

export const PROJECT_FIELD_SECURITY_PRESETS: ProjectFieldSecurityPreset[] = [
  {
    id: "standard_controls",
    name: "Standard controls",
    description: "Reasonable defaults for most product delivery teams.",
    rules: [
      {
        fieldKey: "financial_impact",
        label: "Financial impact",
        classification: "restricted",
        minRoleToView: "program_manager",
        minRoleToEdit: "program_manager",
        maskBelowRole: "lead",
      },
      {
        fieldKey: "risk_notes",
        label: "Risk notes",
        classification: "restricted",
        minRoleToView: "lead",
        minRoleToEdit: "lead",
        maskBelowRole: "contributor",
      },
      {
        fieldKey: "retro_outcomes",
        label: "Retrospective outcomes",
        classification: "open",
        minRoleToView: "reviewer",
        minRoleToEdit: "contributor",
      },
    ],
  },
  {
    id: "regulated_controls",
    name: "Regulated controls",
    description: "Designed for data classified workloads with audit constraints.",
    rules: [
      {
        fieldKey: "financial_impact",
        label: "Financial impact",
        classification: "confidential",
        minRoleToView: "program_manager",
        minRoleToEdit: "owner",
        maskBelowRole: "program_manager",
      },
      {
        fieldKey: "customer_data",
        label: "Customer data",
        classification: "confidential",
        minRoleToView: "program_manager",
        minRoleToEdit: "program_manager",
        maskBelowRole: "lead",
      },
      {
        fieldKey: "retro_outcomes",
        label: "Retrospective outcomes",
        classification: "restricted",
        minRoleToView: "contributor",
        minRoleToEdit: "lead",
      },
    ],
  },
  {
    id: "open_innovation",
    name: "Open innovation",
    description: "Optimised for hackathons and community collaboration.",
    rules: [
      {
        fieldKey: "financial_impact",
        label: "Financial impact",
        classification: "open",
        minRoleToView: "reviewer",
        minRoleToEdit: "lead",
      },
      {
        fieldKey: "retro_outcomes",
        label: "Retrospective outcomes",
        classification: "open",
        minRoleToView: "guest",
        minRoleToEdit: "contributor",
      },
    ],
  },
];

export const PROJECT_DEFAULT_FIELD_RULES = PROJECT_FIELD_SECURITY_PRESETS[0]?.rules ?? [];
