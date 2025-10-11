import {
  type DidYouMeanSuggestion,
  type OpqlGrammarState,
  type OpqlSuggestionContext,
  type OpqlSuggestionItem,
  type OpqlSuggestionRequest,
  type OpqlSuggestionResponse,
  type SuggestionCompletion,
  type SuggestionHistoryEntry,
  type SuggestionKind,
  type SuggestionTrigger,
} from "@/types";

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

const SYNONYM_CORPUS: Record<string, string[]> = {
  asap: ["urgent", "high"],
  slow: ["low", "backlog"],
  owner: ["assignee", "responsible"],
  doc: ["document", "spec"],
};

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

const ENTITY_DICTIONARY: Candidate[] = [
  {
    id: "entity:task",
    kind: "entity",
    value: "task",
    label: "Task",
    description: "Work item across projects",
    weight: 1,
    synonyms: ["todo", "ticket", "work"],
    permissions: ["search:tasks"],
  },
  {
    id: "entity:doc",
    kind: "entity",
    value: "doc",
    label: "Doc",
    description: "Knowledge base pages",
    weight: 0.9,
    synonyms: ["spec", "documentation"],
    permissions: ["search:docs"],
  },
  {
    id: "entity:project",
    kind: "entity",
    value: "project",
    label: "Project",
    description: "Initiatives and roadmaps",
    weight: 0.85,
    synonyms: ["program", "initiative"],
    permissions: ["search:projects"],
  },
  {
    id: "entity:comment",
    kind: "entity",
    value: "comment",
    label: "Comment",
    description: "Feedback conversations",
    weight: 0.6,
    synonyms: ["feedback", "note"],
    permissions: ["search:comments"],
  },
];

const FIELD_DICTIONARY: Candidate[] = [
  {
    id: "field:assignee",
    kind: "field",
    value: "assignee",
    label: "Assignee",
    description: "Person responsible",
    synonyms: ["owner", "responsible"],
  },
  {
    id: "field:status",
    kind: "field",
    value: "status",
    label: "Status",
    description: "Workflow stage",
  },
  {
    id: "field:priority",
    kind: "field",
    value: "priority",
    label: "Priority",
    description: "Importance level",
  },
  {
    id: "field:team",
    kind: "field",
    value: "team",
    label: "Team",
    description: "Owning team",
    synonyms: ["squad"],
  },
  {
    id: "field:created",
    kind: "field",
    value: "created_at",
    label: "Created",
    description: "Created at timestamp",
    synonyms: ["created", "opened"],
  },
];

const OPERATOR_DICTIONARY: Candidate[] = [
  { id: "operator:eq", kind: "operator", value: "=", label: "Equals" },
  { id: "operator:neq", kind: "operator", value: "!=", label: "Not equal" },
  { id: "operator:gt", kind: "operator", value: ">", label: "Greater than" },
  { id: "operator:lt", kind: "operator", value: "<", label: "Less than" },
  { id: "operator:in", kind: "operator", value: "in", label: "Within list" },
  { id: "operator:contains", kind: "operator", value: "contains", label: "Contains" },
];

const ENUM_DICTIONARY: Candidate[] = [
  {
    id: "enum:status-ready",
    kind: "enumeration",
    value: "Ready",
    label: "Status: Ready",
    description: "Work ready to start",
    tags: ["Status"],
  },
  {
    id: "enum:status-progress",
    kind: "enumeration",
    value: "In Progress",
    label: "Status: In Progress",
    description: "Actively being worked",
    tags: ["Status"],
  },
  {
    id: "enum:status-done",
    kind: "enumeration",
    value: "Done",
    label: "Status: Done",
    description: "Completed work",
    tags: ["Status"],
  },
  {
    id: "enum:priority-urgent",
    kind: "enumeration",
    value: "Urgent",
    label: "Priority: Urgent",
    description: "Requires immediate attention",
    tags: ["Priority"],
  },
  {
    id: "enum:priority-medium",
    kind: "enumeration",
    value: "Medium",
    label: "Priority: Medium",
    tags: ["Priority"],
  },
];

const LABEL_DICTIONARY: Candidate[] = [
  {
    id: "label:ux",
    kind: "label",
    value: "ux",
    label: "#ux",
    description: "User experience",
    synonyms: ["design"],
    weight: 0.7,
  },
  {
    id: "label:backend",
    kind: "label",
    value: "backend",
    label: "#backend",
    description: "Platform engineering",
    weight: 0.65,
  },
  {
    id: "label:regression",
    kind: "label",
    value: "regression",
    label: "#regression",
    description: "Returned bug",
    weight: 0.6,
  },
];

const PROJECT_DICTIONARY: Candidate[] = [
  {
    id: "project:atlas",
    kind: "project",
    value: "atlas",
    label: "Atlas",
    description: "Customer onboarding refresh",
    projectId: "atlas",
    weight: 0.75,
  },
  {
    id: "project:aurora",
    kind: "project",
    value: "aurora",
    label: "Aurora",
    description: "Design system modernization",
    projectId: "aurora",
    weight: 0.72,
  },
  {
    id: "project:pulse",
    kind: "project",
    value: "pulse",
    label: "Pulse",
    description: "Realtime collaboration",
    projectId: "pulse",
    weight: 0.7,
  },
];

const TEAM_DICTIONARY: Candidate[] = [
  {
    id: "team:sparks",
    kind: "user",
    value: "Sparks",
    label: "Team Sparks",
    description: "Growth experiments",
    teamId: "sparks",
  },
  {
    id: "team:insight",
    kind: "user",
    value: "Insight",
    label: "Team Insight",
    description: "Data & AI",
    teamId: "insight",
  },
];

const USER_DICTIONARY: Candidate[] = [
  {
    id: "user:aaron",
    kind: "user",
    value: "aaron",
    label: "@aaron",
    description: "Aaron Chen",
    synonyms: ["ac", "aaron chen"],
    weight: 0.9,
  },
  {
    id: "user:samara",
    kind: "user",
    value: "samara",
    label: "@samara",
    description: "Samara Patel",
    synonyms: ["sam"],
    weight: 0.82,
  },
  {
    id: "user:miguel",
    kind: "user",
    value: "miguel",
    label: "@miguel",
    description: "Miguel Rodriguez",
    synonyms: ["mike"],
    weight: 0.78,
  },
];

const CORRECTION_CORPUS: Record<string, string> = {
  "pritorty": "priority",
  "statuz": "status",
  "assigneee": "assignee",
  "recnt": "recent",
};

const detectTrigger = (token: string): SuggestionTrigger => {
  for (const { trigger, match } of TRIGGERS) {
    if (match(token)) {
      return trigger;
    }
  }
  return "none";
};

const SYNONYM_CANDIDATES: Candidate[] = Object.entries(SYNONYM_CORPUS).map(
  ([term, synonyms]) => ({
    id: `synonym:${term}`,
    kind: "synonym" as const,
    value: term,
    label: `Synonym: ${term}`,
    description: `Matches ${synonyms.join(", ")}`,
    synonyms,
    weight: 0.55,
  })
);

const ACTIVE_DICTIONARIES: Record<
  "root" | "entity" | "field" | "operator" | "value" | "postfix",
  Candidate[]
> = {
  root: [...ENTITY_DICTIONARY, ...SYNONYM_CANDIDATES],
  entity: FIELD_DICTIONARY,
  field: OPERATOR_DICTIONARY,
  operator: ENUM_DICTIONARY,
  value: ENUM_DICTIONARY,
  postfix: ENTITY_DICTIONARY,
};

const TRIGGER_DICTIONARIES: Record<SuggestionTrigger, Candidate[]> = {
  mention: USER_DICTIONARY,
  label: LABEL_DICTIONARY,
  project: PROJECT_DICTIONARY,
  space: TEAM_DICTIONARY,
  filetype: [
    {
      id: "filetype:pdf",
      kind: "enumeration",
      value: "pdf",
      label: "filetype:pdf",
      description: "PDF documents",
    },
    {
      id: "filetype:md",
      kind: "enumeration",
      value: "md",
      label: "filetype:md",
      description: "Markdown files",
    },
    {
      id: "filetype:fig",
      kind: "enumeration",
      value: "fig",
      label: "filetype:fig",
      description: "Figma resources",
    },
  ],
  none: [],
};

const matchesPermission = (
  candidate: Candidate,
  context?: OpqlSuggestionContext
) => {
  if (!candidate.permissions?.length) return true;
  const available = context?.permissions ?? [];
  return candidate.permissions.some((permission) => available.includes(permission));
};

const applyContextBoost = (
  candidate: Candidate,
  context?: OpqlSuggestionContext
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
  prefix: string,
  candidates: Candidate[]
): DidYouMeanSuggestion[] => {
  if (!prefix) return [];
  const normalized = prefix.toLowerCase();
  const corrections: DidYouMeanSuggestion[] = [];

  if (CORRECTION_CORPUS[normalized]) {
    corrections.push({
      id: `correction:${normalized}`,
      text: CORRECTION_CORPUS[normalized],
      reason: "Spelling",
    });
  }

  for (const candidate of candidates) {
    if (!candidate.synonyms?.length) continue;
    for (const synonym of candidate.synonyms) {
      if (synonym.toLowerCase() === normalized) {
        corrections.push({
          id: `synonym:${candidate.id}:${synonym}`,
          text: candidate.value,
          reason: `Synonym for ${candidate.label}`,
        });
      }
    }
  }

  return corrections;
};

const gatherCandidates = (
  state: OpqlGrammarState,
  trigger: SuggestionTrigger
): Candidate[] => {
  if (trigger !== "none") {
    return (TRIGGER_DICTIONARIES[trigger] ?? []).map((candidate) => ({
      ...candidate,
      trigger,
    }));
  }
  return (ACTIVE_DICTIONARIES[state] ?? ENTITY_DICTIONARY).map((candidate) => ({
    ...candidate,
    trigger: undefined,
  }));
};

const computeScore = (
  candidate: Candidate,
  prefix: string,
  context?: OpqlSuggestionContext
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

  score += applyContextBoost(candidate, context);
  if (candidate.recencyBoost) {
    score += candidate.recencyBoost * 0.2;
  }
  if (candidate.frequency) {
    score += clamp(candidate.frequency / 20, 0, 0.2);
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
  const baseValue = (() => {
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
  })();

  const typedValue = typed ?? "";
  const remainder = baseValue.slice(typedValue.length);
  const ghostSuffix = remainder ? `${remainder} ` : "";
  const insertText = `${baseValue} `;
  const nextCursor = tokenStart + insertText.length;

  return {
    id: candidate.id,
    kind: candidate.kind,
    label: candidate.label,
    insertText,
    range: { start: tokenStart, end: tokenEnd },
    nextCursor,
    ghostSuffix,
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
  const trigger = detectTrigger(prefix);
  const candidates = gatherCandidates(grammarState, trigger)
    .filter((candidate) => matchesPermission(candidate, request.context))
    .map((candidate) => ({
      ...candidate,
      soundex: candidate.soundex ?? toSoundex(candidate.value),
    }));

  applyHistory(candidates, request.history);

  const scored = candidates
    .map((candidate) => ({
      candidate,
      score: computeScore(candidate, prefix || token, request.context),
    }))
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, request.limit ?? DEFAULT_LIMIT);

  const bestCandidate = scored[0]?.candidate;
  const completion = buildCompletion(bestCandidate, prefix || token, tokenStart, tokenEnd);
  const corrections = buildCorrections(prefix || token, candidates).slice(0, 3);

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

