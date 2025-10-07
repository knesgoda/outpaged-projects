import type { ID } from "./core";

export type Subscription = {
  id: ID;
  user_id: ID;
  entity_type: "task" | "project" | "doc";
  entity_id: ID;
  created_at: string;
};
