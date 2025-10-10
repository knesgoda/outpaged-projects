export type Report = {
  id: string;
  owner: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  config: any;
  created_at: string;
  updated_at: string;
};

export type ReportColumn = {
  key: string;
  label: string;
  type?: string | null;
  format?: string | null;
};

export type ReportResult = {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  meta: {
    total?: number;
    groupCounts?: Record<string, Record<string, number>>;
    [key: string]: unknown;
  };
};
