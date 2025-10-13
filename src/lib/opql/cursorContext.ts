import type { OpqlCursorContext, OpqlGrammarState } from "@/types";

interface Token {
  value: string;
  start: number;
  end: number;
}

const KEYWORD_SET = new Set([
  "FIND",
  "COUNT",
  "AGGREGATE",
  "UPDATE",
  "EXPLAIN",
  "WHERE",
  "AND",
  "OR",
  "IN",
  "NOT",
  "BETWEEN",
  "GROUP",
  "ORDER",
  "BY",
  "LIMIT",
  "OFFSET",
  "JOIN",
  "ON",
  "HAVING",
]);

const VALUE_OPERATORS = new Set([
  "=",
  "==",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "IN",
  "NOT",
  "LIKE",
  "MATCH",
  "CONTAINS",
  "BETWEEN",
  "IS",
  "IS NOT",
  "IS NULL",
  "IS NOT NULL",
  "IS EMPTY",
  "IS NOT EMPTY",
  "BEFORE",
  "AFTER",
  "ON",
  "DURING",
  "~",
  "!~",
]);

const LOGICAL_OPERATORS = new Set(["AND", "OR"]);

const isWhitespace = (char: string) => /\s/u.test(char);

const isOperatorChar = (char: string) => "=!<>~".includes(char);

const isBoundary = (char: string) => char === "(" || char === ")" || char === ",";

const tokenize = (text: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const char = text[index] ?? "";
    if (!char) break;
    if (isWhitespace(char)) {
      index += 1;
      continue;
    }
    if (isBoundary(char)) {
      tokens.push({ value: char, start: index, end: index + 1 });
      index += 1;
      continue;
    }
    if (isOperatorChar(char)) {
      let end = index + 1;
      while (end < text.length && isOperatorChar(text[end] ?? "")) {
        end += 1;
      }
      tokens.push({ value: text.slice(index, end), start: index, end });
      index = end;
      continue;
    }
    let end = index + 1;
    while (
      end < text.length &&
      !isWhitespace(text[end] ?? "") &&
      !isBoundary(text[end] ?? "") &&
      !isOperatorChar(text[end] ?? "")
    ) {
      end += 1;
    }
    tokens.push({ value: text.slice(index, end), start: index, end });
    index = end;
  }
  return tokens;
};

const normalise = (value: string) => value.trim().replace(/\s+/g, " ");

const inferState = (expecting: OpqlCursorContext["expecting"]): OpqlGrammarState => {
  switch (expecting) {
    case "entity":
      return "entity";
    case "field":
      return "field";
    case "operator":
      return "operator";
    case "value":
      return "value";
    case "logical":
      return "postfix";
    default:
      return "root";
  }
};

const isKeyword = (value: string) => KEYWORD_SET.has(value.toUpperCase());

export const analyzeOpqlCursorContext = (text: string, cursor: number): OpqlCursorContext => {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const tokens = tokenize(text);
  let token: Token | undefined;
  let previousToken: Token | undefined;

  for (const current of tokens) {
    if (current.start <= safeCursor && safeCursor <= current.end) {
      token = current;
      break;
    }
    if (current.end <= safeCursor) {
      previousToken = current;
    }
  }

  if (!token) {
    token = { value: "", start: safeCursor, end: safeCursor };
  }

  const prefix = text.slice(token.start, safeCursor);
  const trimmedToken = normalise(token.value);
  const trimmedPrefix = normalise(prefix);

  let expecting: OpqlCursorContext["expecting"] = "entity";
  let field: string | undefined;
  let operator: string | undefined;
  let depth = 0;
  let precedingKeyword: string | undefined;

  for (const current of tokens) {
    if (current.start >= safeCursor) break;
    const value = normalise(current.value);
    if (!value) continue;
    if (value === "(") {
      depth += 1;
      continue;
    }
    if (value === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    const upper = value.toUpperCase();
    if (LOGICAL_OPERATORS.has(upper)) {
      expecting = "field";
      field = undefined;
      operator = undefined;
      precedingKeyword = upper;
      continue;
    }
    if (upper === "WHERE" || upper === "HAVING") {
      expecting = "field";
      field = undefined;
      operator = undefined;
      precedingKeyword = upper;
      continue;
    }
    if (upper === "NOT") {
      // allow NOT IN / IS NOT patterns
      operator = operator ? `${operator} NOT` : "NOT";
      expecting = "operator";
      precedingKeyword = upper;
      continue;
    }
    if (expecting === "entity") {
      if (KEYWORD_SET.has(upper)) {
        precedingKeyword = upper;
        continue;
      }
      field = value;
      expecting = "field";
      continue;
    }
    if (expecting === "field") {
      if (upper === "BY" && precedingKeyword && ["ORDER", "GROUP"].includes(precedingKeyword)) {
        // skip ORDER BY / GROUP BY field suggestions
        continue;
      }
      field = value;
      expecting = "operator";
      continue;
    }
    if (expecting === "operator") {
      if (VALUE_OPERATORS.has(upper) || VALUE_OPERATORS.has(operator ? `${operator.toUpperCase()} ${upper}` : upper)) {
        operator = operator && operator !== "NOT" ? `${operator} ${value}`.trim() : value;
        expecting = "value";
        precedingKeyword = upper;
        continue;
      }
      if (upper === "IN") {
        operator = operator && operator.toUpperCase() === "NOT" ? "NOT IN" : "IN";
        expecting = "value";
        precedingKeyword = operator;
        continue;
      }
      if (upper === "IS") {
        operator = "IS";
        expecting = "value";
        precedingKeyword = operator;
        continue;
      }
    }
    if (expecting === "value") {
      if (value === ",") {
        if (operator && operator.toUpperCase().includes("IN")) {
          expecting = "value";
        } else {
          expecting = "field";
          field = undefined;
          operator = undefined;
        }
        continue;
      }
      if (LOGICAL_OPERATORS.has(upper)) {
        expecting = "field";
        field = undefined;
        operator = undefined;
        precedingKeyword = upper;
        continue;
      }
      expecting = "logical";
      continue;
    }
    if (expecting === "logical") {
      if (LOGICAL_OPERATORS.has(upper)) {
        expecting = "field";
        field = undefined;
        operator = undefined;
        precedingKeyword = upper;
        continue;
      }
    }
    if (isKeyword(upper)) {
      precedingKeyword = upper;
    }
  }

  const context: OpqlCursorContext = {
    token: trimmedToken,
    prefix: trimmedPrefix,
    state: inferState(expecting),
    previousToken: previousToken ? normalise(previousToken.value) : undefined,
    precedingKeyword,
    field,
    operator,
    expecting,
    inList: Boolean(operator && operator.toUpperCase().includes("IN") && depth > 0),
    depth,
  };

  return context;
};

export { tokenize };
