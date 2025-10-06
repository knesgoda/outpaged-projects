import type { ID } from "./core";

export type Report = {
  id: ID;
  owner: ID;
  name: string;
  description?: string | null;
  config: any;
  created_at: string;
  updated_at: string;
};
