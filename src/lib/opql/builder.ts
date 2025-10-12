import { StatementType } from "./parser";

export type BuilderLogicalOperator = "AND" | "OR";

export interface BuilderClause {
  id: string;
  type: "clause";
  field: string;
  comparator: string;
  value: string;
  source?: "manual" | "natural-language" | "opql" | "helper" | "saved";
  confidence?: number;
}

export interface BuilderGroup {
  id: string;
  type: "group";
  operator: BuilderLogicalOperator;
  children: BuilderNode[];
  label?: string;
}

export type BuilderNode = BuilderGroup | BuilderClause;

const createNodeId = () =>
  (typeof globalThis !== "undefined" &&
  "crypto" in globalThis &&
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `qb_${Math.random().toString(16).slice(2)}`);

export const createClause = (
  field = "text",
  comparator = "MATCH",
  value = ""
): BuilderClause => ({
  id: createNodeId(),
  type: "clause",
  field,
  comparator,
  value,
  source: "manual",
  confidence: 1,
});

export const createGroup = (
  operator: BuilderLogicalOperator = "AND",
  children: BuilderNode[] = []
): BuilderGroup => ({
  id: createNodeId(),
  type: "group",
  operator,
  children,
});

export const cloneNode = (node: BuilderNode): BuilderNode => {
  if (node.type === "clause") {
    return { ...node };
  }
  return {
    ...node,
    children: node.children.map(cloneNode),
  };
};

export const shallowClone = <T extends BuilderNode>(node: T): T =>
  node.type === "clause"
    ? ({ ...node } as T)
    : ({
        ...node,
        children: node.children.map((child) => shallowClone(child)),
      } as T);

const quoteValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '""';
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && `${numeric}` === trimmed) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower === "true" || lower === "false" || lower === "null") {
    return lower;
  }
  if (/^:[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    return trimmed;
  }
  const escaped = trimmed.replace(/"/gu, '\\"');
  return `"${escaped}"`;
};

const clauseToOpql = (clause: BuilderClause): string => {
  const operator = clause.comparator.toUpperCase();
  if (operator === "IN" || operator === "NOT IN") {
    return `${clause.field} ${operator} (${clause.value})`;
  }
  if (operator === "BETWEEN") {
    return `${clause.field} BETWEEN ${clause.value}`;
  }
  if (operator === "MATCH" || operator === "CONTAINS") {
    return `${clause.field} ${operator} ${quoteValue(clause.value)}`;
  }
  if (operator === "LIKE") {
    return `${clause.field} LIKE ${quoteValue(clause.value)}`;
  }
  return `${clause.field} ${operator} ${quoteValue(clause.value)}`;
};

export const groupToOpql = (group: BuilderGroup): string => {
  const parts = group.children.map((child) => {
    if (child.type === "clause") {
      return clauseToOpql(child);
    }
    const inner = groupToOpql(child);
    if (!inner) return "";
    if (child.children.length > 1) {
      return `(${inner})`;
    }
    return inner;
  });
  const filtered = parts.filter((part) => part.trim().length > 0);
  return filtered.join(` ${group.operator} `);
};

type Token =
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "AND" }
  | { type: "OR" }
  | { type: "TEXT"; value: string };

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let buffer = "";
  let index = 0;

  const pushBuffer = () => {
    const trimmed = buffer.trim();
    if (trimmed.length === 0) {
      buffer = "";
      return;
    }
    const upper = trimmed.toUpperCase();
    if (upper === "AND" || upper === "OR") {
      tokens.push({ type: upper as "AND" | "OR" });
    } else {
      tokens.push({ type: "TEXT", value: trimmed });
    }
    buffer = "";
  };

  while (index < input.length) {
    const char = input[index];
    if (char === "\"" || char === "'") {
      buffer += char;
      index += 1;
      while (index < input.length) {
        const next = input[index];
        buffer += next;
        if (next === char && input[index - 1] !== "\\") {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (char === "(") {
      pushBuffer();
      tokens.push({ type: "LPAREN" });
      index += 1;
      continue;
    }

    if (char === ")") {
      pushBuffer();
      tokens.push({ type: "RPAREN" });
      index += 1;
      continue;
    }

    if (/\s/u.test(char)) {
      pushBuffer();
      index += 1;
      continue;
    }

    buffer += char;
    index += 1;
  }

  pushBuffer();
  return tokens;
};

type Node = BuilderNode;

const parseClause = (text: string): BuilderClause => {
  const betweenMatch = text.match(/^(?<field>[\w.]+)\s+BETWEEN\s+(?<value>.+)$/iu);
  if (betweenMatch?.groups) {
    return {
      id: createNodeId(),
      type: "clause",
      field: betweenMatch.groups.field,
      comparator: "BETWEEN",
      value: betweenMatch.groups.value.trim(),
      source: "opql",
    };
  }

  const inMatch = text.match(/^(?<field>[\w.]+)\s+(?<operator>NOT\s+IN|IN)\s+\((?<value>.+)\)$/iu);
  if (inMatch?.groups) {
    return {
      id: createNodeId(),
      type: "clause",
      field: inMatch.groups.field,
      comparator: inMatch.groups.operator.replace(/\s+/gu, " ").toUpperCase(),
      value: inMatch.groups.value.trim(),
      source: "opql",
    };
  }

  const comparison = text.match(
    /^(?<field>[\w.]+)\s*(?<operator>=|!=|<>|<=|>=|<|>|MATCH|LIKE|CONTAINS)\s*(?<value>.+)$/iu
  );
  if (comparison?.groups) {
    return {
      id: createNodeId(),
      type: "clause",
      field: comparison.groups.field,
      comparator: comparison.groups.operator.toUpperCase(),
      value: comparison.groups.value.replace(/^"|"$/gu, "").replace(/^'|'$/gu, ""),
      source: "opql",
    };
  }

  return {
    id: createNodeId(),
    type: "clause",
    field: "text",
    comparator: "MATCH",
    value: text.replace(/^"|"$/gu, "").replace(/^'|'$/gu, ""),
    source: "opql",
    confidence: 0.4,
  };
};

const parsePrimary = (tokens: Token[], position: { index: number }): Node | null => {
  const token = tokens[position.index];
  if (!token) return null;
  if (token.type === "LPAREN") {
    position.index += 1;
    const node = parseExpression(tokens, position);
    if (tokens[position.index]?.type === "RPAREN") {
      position.index += 1;
    }
    if (!node) return createGroup();
    return node;
  }
  if (token.type === "TEXT") {
    position.index += 1;
    return parseClause(token.value);
  }
  return null;
};

const collectGroup = (
  operator: BuilderLogicalOperator,
  nodes: Node[]
): Node => {
  if (nodes.length === 1) {
    const single = nodes[0];
    return single.type === "group"
      ? single
      : { ...createGroup(operator, []), children: nodes };
  }
  const group = createGroup(operator);
  group.children = nodes.map((node) =>
    node.type === "group" ? node : ({ ...node } as BuilderNode)
  );
  return group;
};

const parseAnd = (tokens: Token[], position: { index: number }): Node | null => {
  const nodes: Node[] = [];
  let current = parsePrimary(tokens, position);
  if (!current) return null;
  nodes.push(current);
  while (tokens[position.index]?.type === "AND") {
    position.index += 1;
    const next = parsePrimary(tokens, position);
    if (!next) break;
    nodes.push(next);
  }
  return collectGroup("AND", nodes);
};

const parseExpression = (tokens: Token[], position: { index: number }): Node | null => {
  const nodes: Node[] = [];
  let current = parseAnd(tokens, position);
  if (!current) return null;
  nodes.push(current);
  while (tokens[position.index]?.type === "OR") {
    position.index += 1;
    const next = parseAnd(tokens, position);
    if (!next) break;
    nodes.push(next);
  }
  return collectGroup("OR", nodes);
};

export const opqlToGroup = (input: string): BuilderGroup => {
  const trimmed = input.trim();
  if (!trimmed) {
    return createGroup();
  }
  const tokens = tokenize(trimmed);
  const position = { index: 0 };
  const expression = parseExpression(tokens, position);
  if (!expression) {
    return createGroup();
  }
  if (expression.type === "group") {
    return normalizeGroup(expression);
  }
  return normalizeGroup(createGroup("AND", [expression]));
};

export const visitNodes = (
  node: BuilderNode,
  visitor: (node: BuilderNode, parent: BuilderGroup | null) => void,
  parent: BuilderGroup | null = null
) => {
  visitor(node, parent);
  if (node.type === "group") {
    node.children.forEach((child) => visitNodes(child, visitor, node));
  }
};

export const mutateGroupById = (
  node: BuilderGroup,
  id: string,
  mutate: (group: BuilderGroup) => void
): boolean => {
  if (node.id === id) {
    mutate(node);
    return true;
  }
  return node.children.some((child) => {
    if (child.type === "group") {
      return mutateGroupById(child, id, mutate);
    }
    return false;
  });
};

export const mutateClauseById = (
  node: BuilderGroup,
  id: string,
  mutate: (clause: BuilderClause, parent: BuilderGroup) => void
): boolean => {
  return node.children.some((child, index) => {
    if (child.type === "clause" && child.id === id) {
      mutate(child, node);
      return true;
    }
    if (child.type === "group") {
      return mutateClauseById(child, id, mutate);
    }
    return false;
  });
};

export const removeNodeById = (group: BuilderGroup, id: string): boolean => {
  const index = group.children.findIndex((child) => child.id === id);
  if (index >= 0) {
    group.children.splice(index, 1);
    return true;
  }
  return group.children.some((child) => {
    if (child.type === "group") {
      const removed = removeNodeById(child, id);
      if (removed && child.children.length === 0) {
        removeNodeById(group, child.id);
      }
      return removed;
    }
    return false;
  });
};

export const normalizeGroup = (group: BuilderGroup): BuilderGroup => {
  const clone: BuilderGroup = {
    ...group,
    children: [],
  };
  group.children.forEach((child) => {
    if (child.type === "group") {
      const normalized = normalizeGroup(child);
      if (normalized.children.length > 0) {
        clone.children.push(normalized);
      }
      return;
    }
    if (child.value.trim().length === 0 && child.field !== "text") {
      return;
    }
    clone.children.push({ ...child });
  });
  return clone;
};

export const summarizeGroup = (
  group: BuilderGroup,
  mode: "long" | "short" = "long"
): string => {
  if (group.children.length === 0) {
    return "No filters applied";
  }
  const pieces: string[] = [];
  group.children.forEach((child) => {
    if (child.type === "clause") {
      const value = child.value.replace(/^"|"$/gu, "");
      pieces.push(`${child.field} ${child.comparator.toLowerCase()} ${value}`);
      return;
    }
    const inner = summarizeGroup(child, mode);
    pieces.push(mode === "long" ? `(${inner})` : inner);
  });
  return pieces.join(mode === "long" ? ` ${group.operator} ` : ` ${group.operator.toLowerCase()} `);
};

export const findClause = (
  group: BuilderGroup,
  predicate: (clause: BuilderClause) => boolean
): BuilderClause | null => {
  let result: BuilderClause | null = null;
  visitNodes(group, (node) => {
    if (result || node.type !== "clause") return;
    if (predicate(node)) {
      result = node;
    }
  });
  return result;
};

export const countClauses = (group: BuilderGroup): number => {
  let count = 0;
  visitNodes(group, (node) => {
    if (node.type === "clause") {
      count += 1;
    }
  });
  return count;
};

export const ensureGroup = (group?: BuilderGroup): BuilderGroup =>
  group?.type === "group" ? group : createGroup();

export type BuilderChangeMeta = {
  origin: "builder" | "natural-language" | "opql" | "undo" | "redo" | "saved";
  opql: string;
  statement?: StatementType;
};
