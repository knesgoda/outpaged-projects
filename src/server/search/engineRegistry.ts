import { QueryEngine } from "./queryEngine";
import { MockSearchRepository } from "./repository";

const repository = new MockSearchRepository();

export const searchEngine = new QueryEngine({ repository });

export { toSearchResult } from "./queryEngine";
export type { PrincipalContext, QueryRequest, QueryEngineResult } from "./queryEngine";
