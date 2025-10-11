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
  | "correction";

export type SuggestionTrigger =
  | "mention"
  | "label"
  | "project"
  | "space"
  | "filetype"
  | "none";

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
}

export interface SuggestionCompletion {
  id: string;
  kind: SuggestionKind;
  label: string;
  insertText: string;
  range: { start: number; end: number };
  nextCursor: number;
  ghostSuffix: string;
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
  context?: OpqlSuggestionContext;
  limit?: number;
  history?: SuggestionHistoryEntry[];
}
