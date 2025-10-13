import {
  BuilderClause,
  BuilderGroup,
  BuilderQuery,
  BuilderChangeMeta,
  createClause,
  createGroup,
  createQuery,
  findClause,
  normalizeGroup,
  normalizeQuery,
  opqlToQuery,
  queryToOpql,
  summarizeQuery,
} from "./builder";

export type NaturalLanguageTokenKind = "clause" | "noise" | "operator";

export interface NaturalLanguageToken {
  text: string;
  start: number;
  end: number;
  kind: NaturalLanguageTokenKind;
  clause?: BuilderClause;
  confidence: number;
}

export interface NaturalLanguageInterpretation {
  original: string;
  normalized: string;
  opql: string;
  builder: BuilderQuery;
  tokens: NaturalLanguageToken[];
  warnings: string[];
  timestamp: number;
  provenance: "natural-language" | "opql";
}

export interface NaturalLanguageInterpretOptions {
  previous?: NaturalLanguageInterpretation | null;
}

type Pattern = {
  id: string;
  regex: RegExp;
  interpret: (match: RegExpExecArray) => BuilderClause[];
};

const stripQuotes = (value: string) => value.replace(/^"|"$/gu, "").replace(/^'|'$/gu, "");

const createNaturalClause = (
  field: string,
  comparator: string,
  value: string,
  confidence = 0.8
) => {
  const clause = createClause(field, comparator, value);
  clause.source = "natural-language";
  clause.confidence = confidence;
  return clause;
};

const resolveRelativeDate = (input: string): string => {
  const lower = input.toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/u.test(lower)) {
    return lower;
  }
  switch (lower) {
    case "today":
      return "today()";
    case "yesterday":
      return "today()-1d";
    case "tomorrow":
      return "today()+1d";
    case "this week":
      return "now()-7d";
    case "next week":
      return "now()+7d";
    case "last week":
      return "now()-7d";
    case "this month":
      return "now()-30d";
    case "last month":
      return "now()-30d";
    default: {
      const pastMatch = lower.match(/past\s+(?<amount>\d+)\s+(?<unit>day|days|week|weeks|month|months)/u);
      if (pastMatch?.groups) {
        const amount = Number(pastMatch.groups.amount);
        const unit = pastMatch.groups.unit.startsWith("week") ? "w" : pastMatch.groups.unit.startsWith("month") ? "mo" : "d";
        if (!Number.isNaN(amount)) {
          return `now()-${amount}${unit}`;
        }
      }
      return lower;
    }
  }
};

const PATTERNS: Pattern[] = [
  {
    id: "assignee-me",
    regex: /\b(?:assigned|assignments?)\s+(?:to\s+)?(?<target>me|myself)\b/giu,
    interpret: () => [createNaturalClause("assignee", "=", "@me", 0.95)],
  },
  {
    id: "assignee-name",
    regex: /\b(?:assigned|owner|owned)\s+(?:to\s+)?(?<target>@?[\w.-]+(?:\s+[\w.-]+)?)\b/giu,
    interpret: (match) => {
      const target = stripQuotes(match.groups?.target ?? match[0]).replace(/^@/u, "@");
      return [createNaturalClause("assignee", "=", target.startsWith("@") ? target : `"${target}"`, 0.8)];
    },
  },
  {
    id: "status",
    regex: /\b(?:status|state)\s+(?:is\s+)?(?<status>open|closed|blocked|todo|doing|"[^"]+"|done|backlog)\b/giu,
    interpret: (match) => {
      const status = stripQuotes(match.groups?.status ?? match[0]).toLowerCase();
      const normalized =
        status === "doing" ? "in_progress" : status === "todo" ? "todo" : status;
      return [createNaturalClause("status", "=", normalized, 0.92)];
    },
  },
  {
    id: "priority",
    regex: /\b(?:priority|p\s?\d)\s*(?<level>low|medium|high|p0|p1|p2|p3)\b/giu,
    interpret: (match) => {
      const level = match.groups?.level?.toUpperCase() ?? match[0].toUpperCase();
      return [createNaturalClause("priority", "=", level, 0.9)];
    },
  },
  {
    id: "type",
    regex: /\b(?:type|kind|entity)\s+(?:is\s+)?(?<type>task|doc|document|project|file|person|initiative|view)s?\b/giu,
    interpret: (match) => {
      const type = match.groups?.type?.toLowerCase() ?? "task";
      const normalized =
        type === "document" ? "doc" : type === "initiative" ? "project" : type;
      return [createNaturalClause("type", "=", normalized, 0.85)];
    },
  },
  {
    id: "project",
    regex: /\b(?:in|within|inside)\s+(?:project|initiative|program)\s+(?<project>"[^"]+"|[\w.-]+)/giu,
    interpret: (match) => {
      const project = stripQuotes(match.groups?.project ?? match[0]);
      return [createNaturalClause("project", "=", project, 0.75)];
    },
  },
  {
    id: "tag",
    regex: /\b(?:tagged|tag|label)\s+(?:with\s+)?#?(?<tag>[\w-]+)/giu,
    interpret: (match) => {
      const tag = match.groups?.tag ?? match[0];
      return [createNaturalClause("tags", "CONTAINS", tag.toLowerCase(), 0.7)];
    },
  },
  {
    id: "due",
    regex: /\b(?:due|deadline|by)\s+(?<direction>before|after|on)?\s*(?<time>today|tomorrow|yesterday|this week|next week|last week|this month|last month|\d{4}-\d{2}-\d{2}|past\s+\d+\s+\w+)\b/giu,
    interpret: (match) => {
      const direction = (match.groups?.direction ?? "on").toLowerCase();
      const when = resolveRelativeDate(match.groups?.time ?? "today");
      if (direction === "before") {
        return [createNaturalClause("due_at", "<", when, 0.85)];
      }
      if (direction === "after") {
        return [createNaturalClause("due_at", ">", when, 0.85)];
      }
      return [createNaturalClause("due_at", "=", when, 0.8)];
    },
  },
  {
    id: "updated",
    regex: /\b(?:updated|edited|touched|active)\s+(?:in\s+the\s+)?(?<window>last\s+\d+\s+\w+|past\s+\d+\s+\w+|today|yesterday|week|month)\b/giu,
    interpret: (match) => {
      const window = match.groups?.window ?? match[0];
      const range = resolveRelativeDate(window);
      return [createNaturalClause("updated_at", ">", range, 0.75)];
    },
  },
  {
    id: "created",
    regex: /\bcreated\s+(?:by\s+)?(?<creator>me|myself|@?[\w.-]+)\b/giu,
    interpret: (match) => {
      const creator = match.groups?.creator ?? match[0];
      const normalized = creator === "me" || creator === "myself" ? "@me" : creator;
      return [createNaturalClause("created_by", "=", normalized, 0.75)];
    },
  },
  {
    id: "mentions",
    regex: /"(?<quote>[^"\n]+)"/gu,
    interpret: (match) => {
      const quote = stripQuotes(match.groups?.quote ?? match[0]);
      return [createNaturalClause("text", "MATCH", quote, 0.6)];
    },
  },
];

const cloneFromPrevious = (
  clause: BuilderClause,
  previous?: NaturalLanguageInterpretation | null
): BuilderClause => {
  if (!previous) return clause;
  const existing = findClause(previous.builder.where, (candidate) =>
    candidate.field === clause.field &&
    candidate.comparator === clause.comparator &&
    candidate.value.toLowerCase() === clause.value.toLowerCase()
  );
  if (existing) {
    clause.id = existing.id;
  }
  return clause;
};

const buildInterpretation = (
  text: string,
  options?: NaturalLanguageInterpretOptions
): NaturalLanguageInterpretation => {
  const trimmed = text.trim();
  if (!trimmed) {
    const empty = createQuery();
    return {
      original: text,
      normalized: "",
      opql: "",
      builder: empty,
      tokens: [],
      warnings: [],
      timestamp: Date.now(),
      provenance: "natural-language",
    };
  }

  const consumed = new Array(trimmed.length).fill(false);
  const clauses: BuilderClause[] = [];
  const tokens: NaturalLanguageToken[] = [];
  const warnings: string[] = [];

  PATTERNS.forEach((pattern) => {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes("g") ? pattern.regex.flags : `${pattern.regex.flags}g`);
    let match = regex.exec(trimmed);
    while (match) {
      const start = match.index;
      const end = start + match[0].length;
      let overlap = false;
      for (let index = start; index < end; index += 1) {
        if (consumed[index]) {
          overlap = true;
          break;
        }
      }
      if (!overlap) {
        for (let index = start; index < end; index += 1) {
          consumed[index] = true;
        }
        const derived = pattern.interpret(match).map((clause) =>
          cloneFromPrevious(clause, options?.previous)
        );
        derived.forEach((clause) => clauses.push(clause));
        tokens.push({
          text: match[0],
          start,
          end,
          kind: "clause",
          clause: clauses[clauses.length - 1],
          confidence: clauses[clauses.length - 1]?.confidence ?? 0.6,
        });
      }
      match = regex.exec(trimmed);
    }
  });

  let buffer = "";
  let bufferStart = -1;
  const flushBuffer = () => {
    const cleaned = buffer.trim();
    if (cleaned.length === 0) {
      buffer = "";
      bufferStart = -1;
      return;
    }
    const clause = createNaturalClause("text", "MATCH", cleaned, 0.4);
    cloneFromPrevious(clause, options?.previous);
    clauses.push(clause);
    tokens.push({
      text: cleaned,
      start: bufferStart,
      end: bufferStart + cleaned.length,
      kind: "noise",
      clause,
      confidence: clause.confidence ?? 0.4,
    });
    buffer = "";
    bufferStart = -1;
  };

  for (let index = 0; index < trimmed.length; index += 1) {
    if (consumed[index]) {
      flushBuffer();
      continue;
    }
    const char = trimmed[index];
    if (bufferStart === -1) {
      bufferStart = index;
    }
    buffer += char;
  }
  flushBuffer();

  if (clauses.length === 0) {
    warnings.push("Could not confidently interpret any filters; falling back to full text search");
    const fallback = createNaturalClause("text", "MATCH", trimmed, 0.3);
    clauses.push(fallback);
    tokens.push({
      text: trimmed,
      start: 0,
      end: trimmed.length,
      kind: "clause",
      clause: fallback,
      confidence: 0.3,
    });
  }

  const query = createQuery();
  query.where = normalizeGroup(createGroup("AND", clauses));
  const normalizedQuery = normalizeQuery(query);
  const opql = queryToOpql(normalizedQuery);

  return {
    original: text,
    normalized: trimmed,
    opql,
    builder: normalizedQuery,
    tokens,
    warnings,
    timestamp: Date.now(),
    provenance: "natural-language",
  };
};

export const interpretNaturalLanguage = (
  text: string,
  options?: NaturalLanguageInterpretOptions
): NaturalLanguageInterpretation => buildInterpretation(text, options);

export class NaturalLanguageSession {
  private last: NaturalLanguageInterpretation | null = null;

  interpret(text: string): NaturalLanguageInterpretation {
    this.last = buildInterpretation(text, { previous: this.last });
    return this.last;
  }

  synchronizeFromOpql(opql: string): NaturalLanguageInterpretation {
    const builder = opqlToQuery(opql);
    const normalized = queryToOpql(builder);
    this.last = {
      original: opql,
      normalized,
      opql: normalized,
      builder,
      tokens: [],
      warnings: [],
      timestamp: Date.now(),
      provenance: "opql",
    };
    return this.last;
  }

  synchronizeFromBuilder(builder: BuilderQuery): NaturalLanguageInterpretation {
    const normalized = queryToOpql(builder);
    this.last = {
      original: normalized,
      normalized,
      opql: normalized,
      builder,
      tokens: [],
      warnings: [],
      timestamp: Date.now(),
      provenance: "opql",
    };
    return this.last;
  }

  describe(builder: BuilderQuery): string {
    if (!builder) {
      return "";
    }
    return summarizeQuery(builder);
  }

  get interpretation(): NaturalLanguageInterpretation | null {
    return this.last;
  }
}

export const resynchronizeBuilderFromOpql = (
  opql: string,
  session: NaturalLanguageSession
): {
  builder: BuilderQuery;
  meta: BuilderChangeMeta;
} => {
  const builder = opqlToQuery(opql);
  const normalized = queryToOpql(builder);
  session.synchronizeFromBuilder(builder);
  return {
    builder,
    meta: {
      origin: "opql",
      opql: normalized,
    },
  };
};
