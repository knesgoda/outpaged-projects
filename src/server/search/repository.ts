export type FieldType = "string" | "number" | "boolean" | "date" | "array";

export interface EntitySchemaField {
  type: FieldType;
  optional?: boolean;
}

export interface EntityDefinition {
  entityType: string;
  fields: Record<string, EntitySchemaField>;
  defaultOrder?: {
    expression: { kind: "identifier"; name: string };
    direction: "ASC" | "DESC";
  };
}

export interface FieldMaskRule {
  required: string;
  mask?: unknown;
}

export interface RowPermissions {
  required?: string[];
  fieldMasks?: Record<string, FieldMaskRule>;
}

export interface HistoryChange {
  field: string;
  from?: unknown;
  to?: unknown;
}

export interface HistoryEvent {
  at: string;
  actor?: string;
  changes: HistoryChange[];
}

export interface HistoryLog {
  initial?: {
    at?: string;
    actor?: string;
    values: Record<string, unknown>;
  };
  events: HistoryEvent[];
}

export interface HistorySegment {
  field: string;
  value: unknown;
  start: string | null;
  end: string | null;
  actor?: string;
  changedAt: string | null;
}

export interface MaterializedHistory {
  events: HistoryEvent[];
  segments: Record<string, HistorySegment[]>;
}

export interface RepositoryRow {
  entityId: string;
  entityType: string;
  workspaceId: string;
  score: number;
  values: Record<string, unknown>;
  permissions?: RowPermissions;
  history?: HistoryLog;
}

export interface MaterializedRow {
  entityId: string;
  entityType: string;
  workspaceId: string;
  score: number;
  values: Record<string, unknown>;
  maskedFields: string[];
  history?: MaterializedHistory;
}

export interface SearchRepository {
  list(workspaceId: string, entityTypes: string[]): Promise<RepositoryRow[]>;
  listEntityTypes(): string[];
  getDefinition(entityType: string): EntityDefinition | undefined;
  snapshot?(workspaceId: string): RepositoryRow[];
}

interface RepositoryOptions {
  rows?: RepositoryRow[];
}

const DEFAULT_WORKSPACE = "workspace-demo";

const baseRows: RepositoryRow[] = [
  {
    entityId: "task-1",
    entityType: "task",
    workspaceId: DEFAULT_WORKSPACE,
    score: 0.86,
    values: {
      title: "Stabilize indexing pipeline",
      snippet: "Investigate ingestion lag and rebuild the document queue",
      url: "/tasks/task-1",
      project_id: "proj-operations",
      updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      searchable: "stabilize indexing pipeline investigate ingestion lag rebuild the document queue",
      score: 0.86,
    },
    permissions: {
      fieldMasks: {
        snippet: { required: "search.mask.snippet", mask: "*** masked ***" },
      },
    },
  },
  {
    entityId: "task-2",
    entityType: "task",
    workspaceId: DEFAULT_WORKSPACE,
    score: 0.8,
    values: {
      title: "Implement abuse guard rails",
      snippet: "Add rate limiting and anomaly detection for search endpoint",
      url: "/tasks/task-2",
      project_id: "proj-security",
      updated_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      searchable: "implement abuse guard rails add rate limiting anomaly detection search endpoint",
      score: 0.8,
    },
  },
  {
    entityId: "doc-1",
    entityType: "doc",
    workspaceId: DEFAULT_WORKSPACE,
    score: 0.74,
    values: {
      title: "Operational query governance",
      snippet: "Policy that defines AUDIT scoped access and masked fields",
      url: "/docs/doc-1",
      project_id: "proj-operations",
      updated_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      searchable: "operational query governance search policy defines audit scoped access masked fields",
      score: 0.74,
    },
    permissions: {
      fieldMasks: {
        snippet: { required: "docs.view.sensitive", mask: "*** confidential ***" },
      },
    },
  },
  {
    entityId: "project-1",
    entityType: "project",
    workspaceId: DEFAULT_WORKSPACE,
    score: 0.92,
    values: {
      title: "Search reliability initiative",
      snippet: "Cross-functional effort improving query success rate",
      url: "/projects/project-1",
      project_id: "project-1",
      updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      searchable: "search reliability initiative cross functional effort improving query success rate",
      score: 0.92,
    },
  },
  {
    entityId: "comment-1",
    entityType: "comment",
    workspaceId: DEFAULT_WORKSPACE,
    score: 0.55,
    values: {
      title: "Comment",
      snippet: "We should backfill the audit index nightly",
      url: "/tasks/task-1#comment-1",
      project_id: "proj-operations",
      updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      searchable: "comment backfill audit index nightly",
      score: 0.55,
    },
    permissions: {
      required: ["search.comments.read"],
    },
  },
  {
    entityId: "person-1",
    entityType: "person",
    workspaceId: DEFAULT_WORKSPACE,
    score: 0.6,
    values: {
      title: "Ava Patel",
      snippet: "Staff engineer owning search relevancy",
      url: "/team/person-1",
      project_id: null,
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      searchable: "ava patel staff engineer owning search relevancy",
      score: 0.6,
    },
  },
];

const ENTITY_DEFINITIONS: Record<string, EntityDefinition> = {
  task: {
    entityType: "task",
    fields: {
      title: { type: "string" },
      snippet: { type: "string", optional: true },
      url: { type: "string" },
      project_id: { type: "string", optional: true },
      updated_at: { type: "date", optional: true },
      searchable: { type: "string" },
      score: { type: "number" },
      status: { type: "string", optional: true },
      assignee: { type: "string", optional: true },
    },
    defaultOrder: { expression: { kind: "identifier", name: "updated_at" }, direction: "DESC" },
  },
  project: {
    entityType: "project",
    fields: {
      title: { type: "string" },
      snippet: { type: "string", optional: true },
      url: { type: "string" },
      project_id: { type: "string" },
      updated_at: { type: "date", optional: true },
      searchable: { type: "string" },
      score: { type: "number" },
    },
    defaultOrder: { expression: { kind: "identifier", name: "score" }, direction: "DESC" },
  },
  doc: {
    entityType: "doc",
    fields: {
      title: { type: "string" },
      snippet: { type: "string" },
      url: { type: "string" },
      project_id: { type: "string", optional: true },
      updated_at: { type: "date", optional: true },
      searchable: { type: "string" },
      score: { type: "number" },
    },
    defaultOrder: { expression: { kind: "identifier", name: "updated_at" }, direction: "DESC" },
  },
  comment: {
    entityType: "comment",
    fields: {
      title: { type: "string" },
      snippet: { type: "string" },
      url: { type: "string" },
      project_id: { type: "string", optional: true },
      updated_at: { type: "date", optional: true },
      searchable: { type: "string" },
      score: { type: "number" },
    },
    defaultOrder: { expression: { kind: "identifier", name: "updated_at" }, direction: "DESC" },
  },
  person: {
    entityType: "person",
    fields: {
      title: { type: "string" },
      snippet: { type: "string", optional: true },
      url: { type: "string" },
      project_id: { type: "string", optional: true },
      updated_at: { type: "date", optional: true },
      searchable: { type: "string" },
      score: { type: "number" },
    },
    defaultOrder: { expression: { kind: "identifier", name: "updated_at" }, direction: "DESC" },
  },
};

export class MockSearchRepository implements SearchRepository {
  private rows: RepositoryRow[];

  constructor(options: RepositoryOptions = {}) {
    this.rows = (options.rows ?? baseRows).map((row) => ({
      ...row,
      values: { ...row.values },
      permissions: row.permissions
        ? { ...row.permissions, fieldMasks: { ...(row.permissions.fieldMasks ?? {}) } }
        : undefined,
      history: row.history
        ? {
            initial: row.history.initial
              ? {
                  at: row.history.initial.at,
                  actor: row.history.initial.actor,
                  values: { ...row.history.initial.values },
                }
              : undefined,
            events: row.history.events.map((event) => ({
              at: event.at,
              actor: event.actor,
              changes: event.changes.map((change) => ({
                field: change.field,
                from: change.from,
                to: change.to,
              })),
            })),
          }
        : undefined,
    }));
  }

  async list(workspaceId: string, entityTypes: string[]): Promise<RepositoryRow[]> {
    const target = new Set(entityTypes);
    return this.rows
      .filter((row) => row.workspaceId === workspaceId && target.has(row.entityType))
      .map((row) => ({
        ...row,
        values: { ...row.values },
        permissions: row.permissions
          ? {
              required: row.permissions.required ? [...row.permissions.required] : undefined,
              fieldMasks: row.permissions.fieldMasks ? { ...row.permissions.fieldMasks } : undefined,
            }
          : undefined,
        history: row.history
          ? {
              initial: row.history.initial
                ? {
                    at: row.history.initial.at,
                    actor: row.history.initial.actor,
                    values: { ...row.history.initial.values },
                  }
                : undefined,
              events: row.history.events.map((event) => ({
                at: event.at,
                actor: event.actor,
                changes: event.changes.map((change) => ({
                  field: change.field,
                  from: change.from,
                  to: change.to,
                })),
              })),
            }
          : undefined,
      }));
  }

  listEntityTypes(): string[] {
    return Array.from(new Set(this.rows.map((row) => row.entityType)));
  }

  getDefinition(entityType: string): EntityDefinition | undefined {
    return ENTITY_DEFINITIONS[entityType];
  }

  snapshot(workspaceId: string): RepositoryRow[] {
    return this.rows
      .filter((row) => row.workspaceId === workspaceId)
      .map((row) => ({
        ...row,
        values: { ...row.values },
        permissions: row.permissions
          ? {
              required: row.permissions.required ? [...row.permissions.required] : undefined,
              fieldMasks: row.permissions.fieldMasks ? { ...row.permissions.fieldMasks } : undefined,
            }
          : undefined,
        history: row.history
          ? {
              initial: row.history.initial
                ? {
                    at: row.history.initial.at,
                    actor: row.history.initial.actor,
                    values: { ...row.history.initial.values },
                  }
                : undefined,
              events: row.history.events.map((event) => ({
                at: event.at,
                actor: event.actor,
                changes: event.changes.map((change) => ({
                  field: change.field,
                  from: change.from,
                  to: change.to,
                })),
              })),
            }
          : undefined,
      }));
  }
}
