export type SearchResult = {
  id: string;
  type:
    | "task"
    | "project"
    | "doc"
    | "file"
    | "comment"
    | "person"
    | "team_member";
  title: string;
  snippet?: string | null;
  url: string;
  project_id?: string | null;
  updated_at?: string | null;
  score?: number;
};

export type OpqlGrammarState =
  | "root"
  | "entity"
  | "field"
  | "operator"
  | "value"
  | "postfix";

export type SuggestionKind =
  | "entity"
  | "field"
  | "operator"
  | "enumeration"
  | "label"
  | "user"
  | "project"
  | "synonym"
  | "macro"
  | "template"
  | "correction";

export type SuggestionTrigger =
  | "mention"
  | "label"
  | "project"
  | "space"
  | "filetype"
  | "none";

export interface SuggestionParameter {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}

export interface OpqlSuggestionItem {
  id: string;
  kind: SuggestionKind;
  value: string;
  label: string;
  description?: string;
  trigger?: SuggestionTrigger;
  synonyms?: string[];
  projectId?: string;
  teamId?: string;
  permissions?: string[];
  tags?: string[];
  icon?: string;
  documentation?: string;
  template?: string;
  parameters?: SuggestionParameter[];
  valueType?: string;
  field?: string;
  operator?: string;
  example?: string;
}

export interface SuggestionHistoryEntry {
  id: string;
  kind: SuggestionKind;
  lastUsed: string;
  frequency: number;
}

export interface DidYouMeanSuggestion {
  id: string;
  text: string;
  reason: string;
  replacement: string;
  preview: {
    before: string;
    replacement: string;
    after: string;
  };
}

export interface SuggestionCompletion {
  id: string;
  kind: SuggestionKind;
  label: string;
  insertText: string;
  range: { start: number; end: number };
  nextCursor: number;
  ghostSuffix: string;
  cursorOffset?: number;
  parameters?: SuggestionParameter[];
}

export interface SuggestionDictionaryItem extends OpqlSuggestionItem {
  weight?: number;
}

export interface SuggestionDictionaries {
  fields?: SuggestionDictionaryItem[];
  enumerations?: SuggestionDictionaryItem[];
  labels?: SuggestionDictionaryItem[];
  teams?: SuggestionDictionaryItem[];
  synonyms?: Record<string, string[]>;
}

export interface OpqlCursorContext {
  token: string;
  prefix: string;
  state: OpqlGrammarState;
  previousToken?: string;
  precedingKeyword?: string;
  field?: string;
  operator?: string;
  expecting?: "entity" | "field" | "operator" | "value" | "logical";
  inList?: boolean;
  depth?: number;
}

export interface OpqlSuggestionResponse {
  items: OpqlSuggestionItem[];
  completion?: SuggestionCompletion;
  corrections: DidYouMeanSuggestion[];
  triggeredBy: SuggestionTrigger | null;
  latency: number;
  token: {
    value: string;
    start: number;
    end: number;
  };
}

export interface OpqlSuggestionContext {
  projectId?: string;
  teamId?: string;
  spaceId?: string;
  activeUserId?: string;
  permissions?: string[];
  types?: string[];
  dictionaries?: SuggestionDictionaries;
}

export interface OpqlSuggestionRequest {
  text: string;
  cursor?: number;
  grammarState?: OpqlGrammarState;
  cursorContext?: OpqlCursorContext;
  context?: OpqlSuggestionContext;
  limit?: number;
  history?: SuggestionHistoryEntry[];
}
