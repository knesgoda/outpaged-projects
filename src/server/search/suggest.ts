import {
  type DidYouMeanSuggestion,
  type OpqlCursorContext,
  type OpqlGrammarState,
  type OpqlSuggestionContext,
  type OpqlSuggestionItem,
  type OpqlSuggestionRequest,
  type OpqlSuggestionResponse,
  type SuggestionCompletion,
  type SuggestionDictionaryItem,
  type SuggestionHistoryEntry,
  type SuggestionKind,
  type SuggestionTrigger,
} from "@/types";
import { analyzeOpqlCursorContext } from "@/lib/opql/cursorContext";
import {
  DEFAULT_WORKSPACE_ID,
  getWorkspaceMetadata,
  type WorkspaceMetaField,
  type WorkspaceMetaValue,
  type WorkspaceMetadata,
} from "@/data/workspaceMeta";
import { searchEngine } from "./engineRegistry";
import type { RepositoryRow, SearchRepository } from "./repository";

type Candidate = OpqlSuggestionItem & {
  weight?: number;
  locales?: string[];
  recencyBoost?: number;
  lastUsed?: number;
  frequency?: number;
  soundex?: string;
};

type TriggerDetector = {
  trigger: SuggestionTrigger;
  match: (token: string) => boolean;
};

const DEFAULT_LIMIT = 12;

const toSoundex = (value: string) => {
  if (!value) return "";
  const upper = value.toUpperCase();
  const firstLetter = upper[0] ?? "";
  const codes: Record<string, string> = {
    B: "1",
    F: "1",
    P: "1",
    V: "1",
    C: "2",
    G: "2",
    J: "2",
    K: "2",
    Q: "2",
    S: "2",
    X: "2",
    Z: "2",
    D: "3",
    T: "3",
    L: "4",
    M: "5",
    N: "5",
    R: "6",
  };

  let result = firstLetter;
  let previousCode = codes[firstLetter] ?? "";

  for (let index = 1; index < upper.length && result.length < 4; index += 1) {
    const char = upper[index];
    const code = codes[char] ?? "";
    if (code === previousCode) continue;
    if (code) {
      result += code;
    }
    previousCode = code;
  }

  return result.padEnd(4, "0");
};

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i += 1) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const normalizedSimilarity = (input: string, target: string) => {
  if (!input || !target) return 0;
  const distance = levenshtein(input.toLowerCase(), target.toLowerCase());
  const maxLength = Math.max(input.length, target.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const TRIGGERS: TriggerDetector[] = [
  { trigger: "mention", match: (token) => token.startsWith("@") },
  { trigger: "label", match: (token) => token.startsWith("#") },
  { trigger: "project", match: (token) => token.startsWith("proj:") },
  { trigger: "space", match: (token) => token.startsWith("space:") },
  { trigger: "filetype", match: (token) => token.startsWith("filetype:") },
];

const cloneCandidate = (candidate: Candidate): Candidate => ({
  ...candidate,
  synonyms: candidate.synonyms ? [...candidate.synonyms] : undefined,
  permissions: candidate.permissions ? [...candidate.permissions] : undefined,
  tags: candidate.tags ? [...candidate.tags] : undefined,
  parameters: candidate.parameters
    ? candidate.parameters.map((parameter) => ({ ...parameter }))
    : undefined,
});

const toCandidateFromDictionary = (
  item: SuggestionDictionaryItem
): Candidate => ({
  id: item.id,
  kind: item.kind,
  value: item.value,
  label: item.label,
  description: item.description,
  trigger: item.trigger,
  synonyms: item.synonyms ? [...item.synonyms] : undefined,
  projectId: item.projectId,
  teamId: item.teamId,
  permissions: item.permissions ? [...item.permissions] : undefined,
  tags: item.tags ? [...item.tags] : undefined,
  weight: item.weight,
  icon: item.icon,
  documentation: item.documentation,
  template: item.template,
  parameters: item.parameters ? item.parameters.map((parameter) => ({ ...parameter })) : undefined,
  valueType: item.valueType,
  field: item.field,
  operator: item.operator,
  example: item.example,
});

const mergeCandidates = (...lists: Candidate[][]): Candidate[] => {
  const merged = new Map<string, Candidate>();
  for (const list of lists) {
    for (const candidate of list) {
      const existing = merged.get(candidate.id);
      if (existing) {
        existing.weight = candidate.weight ?? existing.weight;
        existing.description = existing.description ?? candidate.description;
        existing.projectId = existing.projectId ?? candidate.projectId;
        existing.teamId = existing.teamId ?? candidate.teamId;
        existing.trigger = existing.trigger ?? candidate.trigger;
        if (candidate.synonyms?.length) {
          existing.synonyms = Array.from(
            new Set([...(existing.synonyms ?? []), ...candidate.synonyms])
          );
        }
        if (candidate.tags?.length) {
          existing.tags = Array.from(
            new Set([...(existing.tags ?? []), ...candidate.tags])
          );
        }
        if (candidate.permissions?.length && !existing.permissions?.length) {
          existing.permissions = [...candidate.permissions];
        }
        if (candidate.icon && !existing.icon) {
          existing.icon = candidate.icon;
        }
        if (candidate.documentation && !existing.documentation) {
          existing.documentation = candidate.documentation;
        }
        if (candidate.template && !existing.template) {
          existing.template = candidate.template;
          existing.parameters = candidate.parameters
            ? candidate.parameters.map((parameter) => ({ ...parameter }))
            : existing.parameters;
        }
        if (candidate.valueType && !existing.valueType) {
          existing.valueType = candidate.valueType;
        }
        if (candidate.field && !existing.field) {
          existing.field = candidate.field;
        }
        if (candidate.operator && !existing.operator) {
          existing.operator = candidate.operator;
        }
        if (candidate.example && !existing.example) {
          existing.example = candidate.example;
        }
      } else {
        merged.set(candidate.id, cloneCandidate(candidate));
      }
    }
  }
  return Array.from(merged.values());
};
const repositoryInstance: SearchRepository = searchEngine.getRepository();

const DEFAULT_WORKSPACE = DEFAULT_WORKSPACE_ID;

const ENTITY_INFO: Record<string, { label: string; description: string; icon: string; weight?: number; permissions?: string[]; synonyms?: string[] }> = {
  task: {
    label: "Task",
    description: "Work items across projects",
    icon: "check-square",
    weight: 1,
    synonyms: ["todo", "ticket", "work"],
    permissions: ["search:tasks"],
  },
  project: {
    label: "Project",
    description: "Initiatives and roadmaps",
    icon: "folder-kanban",
    weight: 0.9,
    synonyms: ["initiative", "program"],
    permissions: ["search:projects"],
  },
  doc: {
    label: "Doc",
    description: "Knowledge base pages",
    icon: "file-text",
    weight: 0.85,
    synonyms: ["spec", "documentation"],
    permissions: ["search:docs"],
  },
  comment: {
    label: "Comment",
    description: "Feedback conversations",
    icon: "message-square",
    weight: 0.72,
    synonyms: ["note", "feedback"],
    permissions: ["search:comments"],
  },
  person: {
    label: "Person",
    description: "People directory entries",
    icon: "user-circle",
    weight: 0.68,
    synonyms: ["teammate", "user"],
  },
};

const OPERATOR_DEFINITIONS: Array<{
  id: string;
  value: string;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: "operator:eq",
    value: "=",
    label: "Equals",
    description: "Field equals value",
    icon: "equals",
  },
  {
    id: "operator:neq",
    value: "!=",
    label: "Not equal",
    description: "Field does not equal value",
    icon: "not-equal",
  },
  {
    id: "operator:gt",
    value: ">",
    label: "Greater than",
    description: "Field greater than value",
    icon: "chevron-right",
  },
  {
    id: "operator:lt",
    value: "<",
    label: "Less than",
    description: "Field less than value",
    icon: "chevron-left",
  },
  {
    id: "operator:gte",
    value: ">=",
    label: "Greater or equal",
    description: "Field greater or equal to value",
    icon: "chevron-right",
  },
  {
    id: "operator:lte",
    value: "<=",
    label: "Less or equal",
    description: "Field less or equal to value",
    icon: "chevron-left",
  },
  {
    id: "operator:in",
    value: "IN",
    label: "In list",
    description: "Match against list",
    icon: "list-checks",
  },
  {
    id: "operator:not-in",
    value: "NOT IN",
    label: "Not in list",
    description: "Exclude values",
    icon: "list-x",
  },
  {
    id: "operator:contains",
    value: "CONTAINS",
    label: "Contains",
    description: "Field contains fragment",
    icon: "scan-text",
  },
  {
    id: "operator:between",
    value: "BETWEEN",
    label: "Between",
    description: "Value within range",
    icon: "between-vertical-end",
  },
  {
    id: "operator:before",
    value: "BEFORE",
    label: "Before",
    description: "Date before moment",
    icon: "calendar-minus",
  },
  {
    id: "operator:after",
    value: "AFTER",
    label: "After",
    description: "Date after moment",
    icon: "calendar-plus",
  },
  {
    id: "operator:is",
    value: "IS",
    label: "Is",
    description: "Matches special value",
    icon: "badge-check",
  },
];

const FILETYPE_CANDIDATES: Candidate[] = [
  {
    id: "filetype:pdf",
    kind: "enumeration",
    value: "pdf",
    label: "filetype:pdf",
    description: "PDF documents",
    icon: "file-text",
    trigger: "filetype",
  },
  {
    id: "filetype:md",
    kind: "enumeration",
    value: "md",
    label: "filetype:md",
    description: "Markdown files",
    icon: "file-text",
    trigger: "filetype",
  },
  {
    id: "filetype:fig",
    kind: "enumeration",
    value: "fig",
    label: "filetype:fig",
    description: "Figma resources",
    icon: "figma",
    trigger: "filetype",
  },
];

const MACRO_DEFINITIONS: Candidate[] = [
  {
    id: "macro:updated-recently",
    kind: "macro",
    value: "updated_at >= now() - {{duration}}",
    label: "Updated recently",
    description: "Items updated within a relative duration",
    template: "updated_at >= now() - {{duration}}",
    parameters: [
      {
        name: "duration",
        label: "Duration",
        description: "Use s/m/h/d/w/mo/y units",
        placeholder: "7d",
        defaultValue: "7d",
      },
    ],
    field: "updated_at",
    valueType: "date",
    icon: "clock-3",
    documentation: "Leverages OPQL date math relative to now().",
    weight: 0.7,
  },
  {
    id: "macro:created-last-week",
    kind: "macro",
    value: "created_at DURING [start_of_week(-1), end_of_week(-1)]",
    label: "Created last week",
    description: "Items created during the previous week",
    template: "created_at DURING [start_of_week(-1), end_of_week(-1)]",
    field: "created_at",
    valueType: "date",
    icon: "calendar-range",
    documentation: "Expands to a bounded time window using OPQL date math helpers.",
    weight: 0.66,
  },
  {
    id: "macro:assigned-to-me",
    kind: "macro",
    value: "assignee = @me",
    label: "Assigned to me",
    description: "Filter items assigned to the current user",
    template: "assignee = @me",
    field: "assignee",
    valueType: "user",
    icon: "user-check",
    documentation: "Resolves @me based on the active viewer.",
    weight: 0.72,
  },
  {
    id: "template:status-any",
    kind: "template",
    value: "status IN (\"Ready\", \"In Progress\")",
    label: "Status matches any",
    description: "Template for filtering by multiple statuses",
    template: "status IN (\"{{status_a}}\", \"{{status_b}}\")",
    parameters: [
      { name: "status_a", label: "First status", placeholder: "Ready" },
      { name: "status_b", label: "Second status", placeholder: "In Progress" },
    ],
    field: "status",
    valueType: "enum",
    icon: "list-checks",
    documentation: "Replace placeholders with workflow stages.",
    weight: 0.6,
  },
];

const toTitle = (value: string) =>
  value
    .replace(/[_:.]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const hasPermission = (required: string[] | undefined, permissions: Set<string>) => {
  if (!required?.length) return true;
  return required.every((permission) => permissions.has(permission));
};

const hasFieldAccess = (row: RepositoryRow, field: string, permissions: Set<string>) => {
  const mask = row.permissions?.fieldMasks?.[field];
  if (!mask?.required) return true;
  return permissions.has(mask.required);
};

const hasRowAccess = (row: RepositoryRow, permissions: Set<string>) => {
  return hasPermission(row.permissions?.required, permissions);
};

type FieldCatalogEntry = {
  field: string;
  label: string;
  type: string;
  description?: string;
  synonyms: string[];
  icon?: string;
  permissions?: string[];
};

type SuggestionCatalog = {
  baseByState: Record<OpqlGrammarState, Candidate[]>;
  triggers: Record<SuggestionTrigger, Candidate[]>;
  synonyms: Record<string, string[]>;
  fieldIndex: Map<string, FieldCatalogEntry>;
  valueIndex: Map<string, Candidate[]>;
  macros: Candidate[];
};

const collectFieldValues = (repository: SearchRepository, workspaceId: string, permissions: Set<string>) => {
  const rows = repository.snapshot?.(workspaceId) ?? [];
  const map = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!hasRowAccess(row, permissions)) continue;
    for (const [field, raw] of Object.entries(row.values ?? {})) {
      if (raw == null) continue;
      if (!hasFieldAccess(row, field, permissions)) continue;
      const addValue = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        const bucket = map.get(field) ?? new Map<string, number>();
        bucket.set(trimmed, (bucket.get(trimmed) ?? 0) + 1);
        map.set(field, bucket);
      };
      if (typeof raw === "string") {
        addValue(raw);
      } else if (Array.isArray(raw)) {
        raw.forEach((entry) => {
          if (typeof entry === "string") addValue(entry);
        });
      }
    }
  }
  return map;
};

const buildSuggestionCatalog = (
  repository: SearchRepository,
  workspaceId: string,
  context?: OpqlSuggestionContext
): SuggestionCatalog => {
  const metadata: WorkspaceMetadata = getWorkspaceMetadata(workspaceId);
  const permissions = new Set(context?.permissions ?? []);

  const synonyms: Record<string, string[]> = {
    ...metadata.synonyms,
    ...(context?.dictionaries?.synonyms ?? {}),
  };

  const entityTypes = repository.listEntityTypes();
  const entityCandidates: Candidate[] = entityTypes.map((entity) => {
    const info = ENTITY_INFO[entity] ?? {
      label: toTitle(entity),
      description: `Search ${entity} entities`,
      icon: "circle-dot",
      synonyms: [],
      weight: 0.6,
    };
    return {
      id: `entity:${entity}`,
      kind: "entity",
      value: entity,
      label: info.label,
      description: info.description,
      weight: info.weight ?? 0.6,
      synonyms: info.synonyms,
      permissions: info.permissions,
      icon: info.icon,
    } satisfies Candidate;
  });

  const fieldCandidatesMap = new Map<string, Candidate>();
  const fieldIndex = new Map<string, FieldCatalogEntry>();

  const ensureFieldCandidate = (
    field: string,
    options: Partial<Candidate> & { label: string; type?: string; description?: string; synonyms?: string[]; icon?: string; permissions?: string[]; weight?: number }
  ) => {
    const existing = fieldCandidatesMap.get(field);
    if (existing) {
      existing.description = existing.description ?? options.description;
      existing.icon = existing.icon ?? options.icon;
      existing.weight = existing.weight ?? options.weight;
      existing.permissions = existing.permissions ?? options.permissions;
      existing.valueType = existing.valueType ?? options.type;
      existing.field = existing.field ?? field;
      if (options.synonyms?.length) {
        existing.synonyms = Array.from(new Set([...(existing.synonyms ?? []), ...options.synonyms]));
      }
      const catalogEntry = fieldIndex.get(field);
      if (catalogEntry && options.synonyms?.length) {
        catalogEntry.synonyms = Array.from(new Set([...catalogEntry.synonyms, ...options.synonyms]));
      }
      return existing;
    }
    const candidate: Candidate = {
      id: `field:${field}`,
      kind: "field",
      value: field,
      label: options.label,
      description: options.description,
      synonyms: options.synonyms,
      icon: options.icon,
      weight: options.weight ?? 0.65,
      permissions: options.permissions,
      valueType: options.type,
      field,
    };
    fieldCandidatesMap.set(field, candidate);
    fieldIndex.set(field, {
      field,
      label: options.label,
      type: options.type ?? "string",
      description: options.description,
      synonyms: options.synonyms ?? [],
      icon: options.icon,
      permissions: options.permissions,
    });
    return candidate;
  };

  const addSynonymEntries = (field: string, terms?: string[]) => {
    if (!terms?.length) return;
    const key = field.toLowerCase();
    synonyms[key] = Array.from(new Set([...(synonyms[key] ?? []), ...terms]));
  };

  metadata.fields.forEach((field: WorkspaceMetaField) => {
    if (!hasPermission(field.permissions, permissions)) return;
    ensureFieldCandidate(field.slug, {
      label: field.label,
      description: field.description,
      synonyms: field.synonyms,
      icon: field.icon,
      type: field.type,
      permissions: field.permissions,
      weight: 0.7,
    });
    addSynonymEntries(field.slug, field.synonyms);
  });

  for (const entity of entityTypes) {
    const definition = repository.getDefinition(entity);
    if (!definition) continue;
    for (const [field, schema] of Object.entries(definition.fields)) {
      const label = fieldIndex.get(field)?.label ?? toTitle(field);
      const description = fieldIndex.get(field)?.description;
      const synonymsForField = fieldIndex.get(field)?.synonyms ?? [];
      ensureFieldCandidate(field, {
        label,
        description,
        synonyms: synonymsForField,
        type: schema.type,
        weight: 0.6,
      });
    }
  }

  const valueIndex = new Map<string, Candidate[]>();

  const addValueCandidate = (field: string, candidate: Candidate) => {
    const existing = valueIndex.get(field) ?? [];
    existing.push(candidate);
    valueIndex.set(field, existing);
  };

  metadata.fields.forEach((field) => {
    if (!hasPermission(field.permissions, permissions)) return;
    if (field.values?.length) {
      field.values.forEach((value: WorkspaceMetaValue) => {
        if (!hasPermission(value.permissions, permissions)) return;
        const candidate: Candidate = {
          id: value.id,
          kind: "enumeration",
          value: value.value,
          label: value.label,
          description: value.description,
          tags: value.tags,
          synonyms: value.synonyms,
          icon: value.icon ?? field.icon,
          weight: 0.58,
          field: field.slug,
          valueType: field.type,
        };
        addValueCandidate(field.slug, candidate);
        addSynonymEntries(value.value, value.synonyms);
      });
    }

    if (field.type === "user") {
      metadata.users
        .filter((user) => hasPermission(user.permissions, permissions))
        .forEach((user) => {
          const candidate: Candidate = {
            id: `user:${user.id}`,
            kind: "user",
            value: user.handle,
            label: `@${user.handle}`,
            description: user.name,
            synonyms: user.synonyms,
            icon: user.icon ?? "user-round",
            weight: 0.75,
            field: field.slug,
            valueType: field.type,
          };
          addValueCandidate(field.slug, candidate);
        });
    }

    if (field.type === "project") {
      metadata.projects
        .filter((project) => hasPermission(project.permissions, permissions))
        .forEach((project) => {
          const candidate: Candidate = {
            id: `project:${project.id}`,
            kind: "project",
            value: project.id,
            label: project.name,
            description: project.description,
            tags: project.tags,
            icon: project.icon ?? "folder-kanban",
            weight: 0.65,
            field: field.slug,
            valueType: field.type,
            projectId: project.id,
          };
          addValueCandidate(field.slug, candidate);
        });
    }

    if (field.slug === "team") {
      metadata.teams
        .filter((team) => hasPermission(team.permissions, permissions))
        .forEach((team) => {
          const candidate: Candidate = {
            id: `team:${team.id}`,
            kind: "user",
            value: team.slug,
            label: `Team ${team.name}`,
            description: team.description,
            tags: team.tags,
            icon: team.icon ?? "users",
            weight: 0.62,
            field: field.slug,
            valueType: field.type,
            teamId: team.id,
          };
          addValueCandidate(field.slug, candidate);
        });
    }
  });

  const dynamicValues = collectFieldValues(repository, workspaceId, permissions);
  dynamicValues.forEach((bucket, field) => {
    const existing = new Set((valueIndex.get(field) ?? []).map((candidate) => candidate.value.toLowerCase()));
    const label = fieldIndex.get(field)?.label ?? toTitle(field);
    bucket.forEach((count, value) => {
      if (existing.has(value.toLowerCase())) return;
      const candidate: Candidate = {
        id: `dynamic:${field}:${value.toLowerCase()}`,
        kind: "enumeration",
        value,
        label: `${label}: ${value}`,
        description: `Observed ${count} time${count === 1 ? "" : "s"} in results`,
        icon: "list",
        weight: 0.5 + Math.min(0.2, count / 12),
        field,
        valueType: fieldIndex.get(field)?.type ?? "string",
      };
      addValueCandidate(field, candidate);
    });
  });

  const dictionaryFields = context?.dictionaries?.fields?.map(toCandidateFromDictionary) ?? [];
  dictionaryFields.forEach((candidate) => {
    ensureFieldCandidate(candidate.value, {
      label: candidate.label,
      description: candidate.description,
      synonyms: candidate.synonyms,
      icon: candidate.icon,
      type: candidate.valueType,
      weight: candidate.weight,
      permissions: candidate.permissions,
    });
    addSynonymEntries(candidate.value, candidate.synonyms);
  });

  const dictionaryEnumerations = context?.dictionaries?.enumerations?.map(toCandidateFromDictionary) ?? [];
  dictionaryEnumerations.forEach((candidate) => {
    addValueCandidate(candidate.field ?? candidate.tags?.[0] ?? "custom", candidate);
    addSynonymEntries(candidate.value, candidate.synonyms);
  });

  const fieldCandidates = Array.from(fieldCandidatesMap.values());
  const operatorCandidates: Candidate[] = OPERATOR_DEFINITIONS.map((definition) => ({
    id: definition.id,
    kind: "operator",
    value: definition.value,
    label: definition.label,
    description: definition.description,
    icon: definition.icon,
    weight: 0.55,
  }));

  const enumerationCandidates = Array.from(valueIndex.values()).flat();

  const mentionCandidates: Candidate[] = metadata.users
    .filter((user) => hasPermission(user.permissions, permissions))
    .map((user) => ({
      id: `mention:${user.id}`,
      kind: "user",
      value: user.handle,
      label: `@${user.handle}`,
      description: user.name,
      synonyms: user.synonyms,
      trigger: "mention" as const,
      icon: user.icon ?? "user-round",
      weight: 0.8,
    }));

  const labelCandidates: Candidate[] = metadata.labels
    .filter((label) => hasPermission(label.permissions, permissions))
    .map((label) => ({
      id: `label:${label.id}`,
      kind: "label",
      value: label.value,
      label: `#${label.value}`,
      description: label.description,
      synonyms: label.synonyms,
      trigger: "label" as const,
      icon: label.icon ?? "tag",
      weight: 0.65,
    }));

  const projectCandidates: Candidate[] = metadata.projects
    .filter((project) => hasPermission(project.permissions, permissions))
    .map((project) => ({
      id: `project:${project.id}`,
      kind: "project",
      value: project.id,
      label: project.name,
      description: project.description,
      tags: project.tags,
      trigger: "project" as const,
      icon: project.icon ?? "folder-kanban",
      weight: 0.7,
      projectId: project.id,
    }));

  const spaceCandidates: Candidate[] = metadata.teams
    .filter((team) => hasPermission(team.permissions, permissions))
    .map((team) => ({
      id: `space:${team.id}`,
      kind: "user",
      value: team.slug,
      label: `space:${team.slug}`,
      description: team.name,
      trigger: "space" as const,
      icon: team.icon ?? "users",
      weight: 0.64,
      teamId: team.id,
    }));

  const triggerDictionaries: Record<SuggestionTrigger, Candidate[]> = {
    mention: mergeCandidates(mentionCandidates, context?.dictionaries?.teams?.map(toCandidateFromDictionary) ?? []),
    label: mergeCandidates(labelCandidates, context?.dictionaries?.labels?.map(toCandidateFromDictionary) ?? []),
    project: projectCandidates,
    space: spaceCandidates,
    filetype: FILETYPE_CANDIDATES.map(cloneCandidate),
    none: [],
  };

  const baseByState: Record<OpqlGrammarState, Candidate[]> = {
    root: entityCandidates.map(cloneCandidate),
    entity: fieldCandidates.map(cloneCandidate),
    field: operatorCandidates.map(cloneCandidate),
    operator: enumerationCandidates.map(cloneCandidate),
    value: enumerationCandidates.map(cloneCandidate),
    postfix: entityCandidates.map(cloneCandidate),
  };

  const macros = MACRO_DEFINITIONS.map(cloneCandidate);

  return {
    baseByState,
    triggers: triggerDictionaries,
    synonyms,
    fieldIndex,
    valueIndex,
    macros,
  };
};

const detectTrigger = (token: string): SuggestionTrigger => {
  for (const { trigger, match } of TRIGGERS) {
    if (match(token)) {
      return trigger;
    }
  }
  return "none";
};

const resolveCandidateBaseValue = (candidate: Candidate) => {
  if (candidate.template) {
    return candidate.template;
  }
  switch (candidate.trigger) {
    case "mention":
      return `@${candidate.value}`;
    case "label":
      return `#${candidate.value}`;
    case "project":
      return `proj:${candidate.value}`;
    case "space":
      return `space:${candidate.value.toLowerCase()}`;
    case "filetype":
      return `filetype:${candidate.value.toLowerCase()}`;
    default:
      return candidate.value;
  }
};

const resolveInsertionMetadata = (candidate: Candidate) => {
  const baseValue = resolveCandidateBaseValue(candidate);
  let cursorOffset: number | undefined;
  if (candidate.template && candidate.parameters?.length) {
    const first = candidate.parameters[0];
    const placeholder = `{{${first.name}}}`;
    const index = baseValue.indexOf(placeholder);
    if (index !== -1) {
      cursorOffset = index;
    }
  }
  return { baseValue, cursorOffset };
};

const matchesPermission = (
  candidate: Candidate,
  context?: OpqlSuggestionContext
) => {
  if (!candidate.permissions?.length) return true;
  const available = new Set(context?.permissions ?? []);
  return candidate.permissions.every((permission) => available.has(permission));
};

const applyContextBoost = (
  candidate: Candidate,
  context?: OpqlSuggestionContext,
  cursorContext?: OpqlCursorContext
) => {
  let boost = 0;
  if (context?.projectId && candidate.projectId === context.projectId) {
    boost += 0.15;
  }
  if (context?.teamId && candidate.teamId === context.teamId) {
    boost += 0.1;
  }
  if (context?.types?.length && candidate.kind === "entity") {
    if (context.types.includes(candidate.value)) {
      boost += 0.2;
    }
  }
  if (cursorContext?.field && candidate.field === cursorContext.field) {
    boost += 0.2;
  }
  if (cursorContext?.expecting === "operator" && candidate.kind === "operator") {
    boost += 0.08;
  }
  if (cursorContext?.expecting === "value" && candidate.kind === "macro") {
    boost += 0.1;
  }
  return boost;
};

const applyHistory = (
  candidates: Candidate[],
  history?: SuggestionHistoryEntry[]
) => {
  if (!history?.length) return candidates;
  const historyMap = new Map<string, SuggestionHistoryEntry>();
  for (const item of history) {
    historyMap.set(`${item.kind}:${item.id}`, item);
  }
  candidates.forEach((candidate) => {
    const entry = historyMap.get(`${candidate.kind}:${candidate.id}`);
    if (entry) {
      const lastUsed = Date.parse(entry.lastUsed);
      if (!Number.isNaN(lastUsed)) {
        candidate.lastUsed = lastUsed;
        candidate.recencyBoost = clamp(1 - (Date.now() - lastUsed) / (1000 * 60 * 60 * 24 * 14), 0, 1);
      }
      candidate.frequency = entry.frequency;
    }
  });
  return candidates;
};

const buildCorrections = (
  text: string,
  tokenRange: { start: number; end: number },
  cursorContext: OpqlCursorContext,
  candidates: Candidate[],
  catalog: SuggestionCatalog
): DidYouMeanSuggestion[] => {
  const typed = cursorContext.prefix?.trim() || cursorContext.token?.trim();
  if (!typed) return [];
  const normalized = typed.toLowerCase();
  const soundexTarget = toSoundex(normalized);

  const before = text.slice(0, tokenRange.start);
  const after = text.slice(tokenRange.end);

  const suggestions: Array<{ candidate: Candidate; score: number; reason: string }> = [];
  const seen = new Set<string>();

  const evaluateCandidate = (candidate: Candidate) => {
    const { baseValue } = resolveInsertionMetadata(candidate);
    const valueLower = baseValue.toLowerCase();
    const labelLower = (candidate.label ?? baseValue).toLowerCase();
    if (!valueLower || valueLower === normalized) return;

    const valueSimilarity = normalizedSimilarity(normalized, valueLower);
    const labelSimilarity = normalizedSimilarity(normalized, labelLower);
    const synonymSimilarity = (candidate.synonyms ?? []).reduce(
      (score, synonym) => Math.max(score, normalizedSimilarity(normalized, synonym.toLowerCase())),
      0
    );
    const candidateSoundex = candidate.soundex ?? toSoundex(valueLower);
    const synonymSoundexMatch = (candidate.synonyms ?? []).some((synonym) => toSoundex(synonym) === soundexTarget);
    const soundexMatch = candidateSoundex === soundexTarget || synonymSoundexMatch;

    let score = valueSimilarity * 0.55 + labelSimilarity * 0.25 + synonymSimilarity * 0.2;
    if (soundexMatch) {
      score += 0.12;
    }
    if (cursorContext.field && candidate.field === cursorContext.field) {
      score += 0.1;
    }

    if (score < 0.45) return;

    let reason = "Spelling";
    if (synonymSimilarity > 0.75) {
      reason = `Synonym for ${candidate.label ?? candidate.value}`;
    } else if (soundexMatch) {
      reason = `Sounds like ${candidate.label ?? candidate.value}`;
    } else if (labelSimilarity > valueSimilarity) {
      reason = `Similar to ${candidate.label}`;
    }

    const key = `${candidate.id}:${valueLower}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ candidate, score, reason });
  };

  candidates.forEach((candidate) => evaluateCandidate(candidate));

  Object.entries(catalog.synonyms).forEach(([term, variants]) => {
    const replacement = variants[0] ?? term;
    const pseudoCandidate: Candidate = {
      id: `synonym:${term}`,
      kind: "synonym",
      value: replacement,
      label: replacement,
      description: `Alias for ${term}`,
      synonyms: variants,
      weight: 0.5,
    };
    const termSimilarity = normalizedSimilarity(normalized, term.toLowerCase());
    const replacementSimilarity = normalizedSimilarity(normalized, replacement.toLowerCase());
    const matchStrength = Math.max(termSimilarity, replacementSimilarity);
    if (matchStrength < 0.45 && toSoundex(term) !== soundexTarget) {
      return;
    }
    evaluateCandidate(pseudoCandidate);
  });

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ candidate, reason }, index) => {
      const { baseValue } = resolveInsertionMetadata(candidate);
      return {
        id: `correction:${candidate.id}:${index}`,
        text: candidate.label ?? baseValue,
        reason,
        replacement: baseValue,
        preview: { before, replacement: baseValue, after },
      } satisfies DidYouMeanSuggestion;
    });
};

const gatherCandidates = (
  catalog: SuggestionCatalog,
  state: OpqlGrammarState,
  trigger: SuggestionTrigger,
  cursorContext: OpqlCursorContext,
  _context?: OpqlSuggestionContext
): Candidate[] => {
  if (trigger !== "none") {
    return (catalog.triggers[trigger] ?? []).map((candidate) => ({
      ...cloneCandidate(candidate),
      trigger,
    }));
  }

  const base = catalog.baseByState[state] ?? catalog.baseByState.root;
  const fieldKey = cursorContext.field ?? cursorContext.previousToken;
  const scopedValues = fieldKey ? catalog.valueIndex.get(fieldKey) ?? [] : [];

  const values = state === "operator" || state === "value"
    ? mergeCandidates(base, scopedValues.map(cloneCandidate))
    : base.map(cloneCandidate);

  if (state !== "value") {
    return values;
  }

  const macros = catalog.macros.filter((macro) => {
    if (!macro.field) return true;
    if (!cursorContext.field) return false;
    if (macro.field === cursorContext.field) return true;
    const targetType = catalog.fieldIndex.get(cursorContext.field)?.type;
    return Boolean(macro.valueType && macro.valueType === targetType);
  });

  return mergeCandidates(values, macros.map(cloneCandidate));
};

const computeScore = (
  candidate: Candidate,
  prefix: string,
  runtime?: { context?: OpqlSuggestionContext; cursor?: OpqlCursorContext }
) => {
  const baseWeight = candidate.weight ?? 0.5;
  let score = baseWeight;

  if (prefix) {
    const normalizedPrefix = prefix.toLowerCase();
    if (candidate.value.toLowerCase().startsWith(normalizedPrefix)) {
      score += 0.4;
    }
    if (candidate.label.toLowerCase().startsWith(normalizedPrefix)) {
      score += 0.35;
    }
    if (candidate.synonyms?.some((synonym) => synonym.toLowerCase().startsWith(normalizedPrefix))) {
      score += 0.25;
    }
    const similarity = normalizedSimilarity(candidate.value, prefix);
    score += clamp(similarity * 0.3, 0, 0.3);
    const soundexMatch = candidate.soundex ?? toSoundex(candidate.value);
    if (soundexMatch && soundexMatch === toSoundex(prefix)) {
      score += 0.2;
    }
  }

  score += applyContextBoost(candidate, runtime?.context, runtime?.cursor);
  if (candidate.recencyBoost) {
    score += candidate.recencyBoost * 0.2;
  }
  if (candidate.frequency) {
    score += clamp(candidate.frequency / 20, 0, 0.2);
  }
  if (runtime?.cursor?.expecting === "value" && candidate.kind === "macro") {
    score += 0.08;
  }

  return score;
};

const buildCompletion = (
  candidate: Candidate | undefined,
  typed: string,
  tokenStart: number,
  tokenEnd: number
): SuggestionCompletion | undefined => {
  if (!candidate) return undefined;
  const { baseValue, cursorOffset } = resolveInsertionMetadata(candidate);
  const typedValue = typed ?? "";
  const remainder = baseValue.slice(typedValue.length);
  const ghostSuffix = remainder ? `${remainder} ` : "";
  const insertText = `${baseValue} `;
  const nextCursor = tokenStart + (cursorOffset ?? insertText.length);

  return {
    id: candidate.id,
    kind: candidate.kind,
    label: candidate.label,
    insertText,
    range: { start: tokenStart, end: tokenEnd },
    nextCursor,
    ghostSuffix,
    cursorOffset,
    parameters: candidate.parameters ? candidate.parameters.map((parameter) => ({ ...parameter })) : undefined,
  };
};

const normaliseText = (text: string) => text.normalize("NFKC");

const tokenAtCursor = (text: string, cursor: number) => {
  const safeCursor = clamp(cursor, 0, text.length);
  const before = text.slice(0, safeCursor);
  const after = text.slice(safeCursor);

  const tokenStart = Math.max(0, before.search(/[^\s]*$/u));
  const nextSpace = after.search(/\s/u);
  const tokenEnd = nextSpace === -1 ? text.length : safeCursor + nextSpace;
  const tokenValue = text.slice(tokenStart, tokenEnd);
  const prefix = text.slice(tokenStart, safeCursor);

  return {
    token: tokenValue.trim(),
    prefix: prefix.trimStart(),
    start: tokenStart,
    end: tokenEnd,
  };
};

export const getOpqlSuggestions = (
  request: OpqlSuggestionRequest
): OpqlSuggestionResponse => {
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const text = normaliseText(request.text ?? "");
  const cursor = request.cursor ?? text.length;
  const grammarState = request.grammarState ?? "root";

  const { token, prefix, start: tokenStart, end: tokenEnd } = tokenAtCursor(text, cursor);
  const derivedCursorContext = request.cursorContext ?? analyzeOpqlCursorContext(text, cursor);
  const cursorContext: OpqlCursorContext = {
    ...derivedCursorContext,
    token: token.trim(),
    prefix: prefix.trim(),
    state: grammarState,
  };
  const trigger = detectTrigger(prefix);
  const catalog = buildSuggestionCatalog(repositoryInstance, DEFAULT_WORKSPACE, request.context);
  const candidates = gatherCandidates(catalog, grammarState, trigger, cursorContext, request.context)
    .filter((candidate) => matchesPermission(candidate, request.context))
    .map((candidate) => ({
      ...candidate,
      soundex: candidate.soundex ?? toSoundex(candidate.value),
    }));

  applyHistory(candidates, request.history);

  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: computeScore(candidate, prefix || token, { context: request.context, cursor: cursorContext }),
    }))
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, request.limit ?? DEFAULT_LIMIT);

  const bestCandidate = scored[0]?.candidate;
  const completion = buildCompletion(bestCandidate, prefix || token, tokenStart, tokenEnd);
  const corrections = buildCorrections(
    text,
    { start: tokenStart, end: tokenEnd },
    cursorContext,
    candidates,
    catalog
  );

  const latency = (typeof performance !== "undefined" ? performance.now() : Date.now()) - start;

  return {
    items: scored.map(({ candidate }) => ({
      id: candidate.id,
      kind: candidate.kind,
      value: candidate.value,
      label: candidate.label,
      description: candidate.description,
      trigger: candidate.trigger,
      synonyms: candidate.synonyms,
      projectId: candidate.projectId,
      teamId: candidate.teamId,
      permissions: candidate.permissions,
      tags: candidate.tags,
    })),
    completion,
    corrections,
    triggeredBy: trigger === "none" ? null : trigger,
    latency,
    token: {
      value: prefix || token,
      start: tokenStart,
      end: tokenEnd,
    },
  };
};

export type { OpqlSuggestionRequest };

