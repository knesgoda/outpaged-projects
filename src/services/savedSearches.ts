// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapSupabaseError, requireUserId } from "./utils";

type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
type SavedSearchInsert = Database["public"]["Tables"]["saved_searches"]["Insert"];
type SavedSearchUpdate = Database["public"]["Tables"]["saved_searches"]["Update"];

export type SavedSearchVisibility = SavedSearchRow["visibility"];
export type SavedSearchOwnerType = SavedSearchRow["owner_type"];
export type SavedSearchAlertFrequency = SavedSearchRow["alert_frequency"];
export type SavedSearchAlertChannel =
  SavedSearchRow["alert_channels"] extends Array<infer Channel>
    ? Channel
    : never;

export type SavedSearchParameterToken = {
  token: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
};

export type SavedSearchAlertThreshold = {
  metric: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  value: number;
  windowMinutes?: number;
};

export type SavedSearchAlertConfig = {
  frequency: SavedSearchAlertFrequency;
  thresholds: SavedSearchAlertThreshold[];
  channels: SavedSearchAlertChannel[];
  metadata: Record<string, unknown>;
  lastSentAt: string | null;
};

export type SavedSearchAuditExport = {
  at: string;
  actorId?: string | null;
  format: "csv" | "json" | "board" | "report" | "dataset";
  channel?: string;
};

export type SavedSearchAuditMetadata = {
  createdBy?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  lastAccessedAt?: string | null;
  exports?: SavedSearchAuditExport[];
};

export type SavedSearchOwner = {
  type: SavedSearchOwnerType;
  id: string | null;
};

export type SavedSearch = {
  id: SavedSearchRow["id"];
  name: SavedSearchRow["name"];
  query: SavedSearchRow["query"];
  filters: Record<string, unknown>;
  visibility: SavedSearchVisibility;
  description: string | null;
  parameterTokens: SavedSearchParameterToken[];
  owner: SavedSearchOwner;
  sharedSlug: string | null;
  sharedUrl: string | null;
  alertConfig: SavedSearchAlertConfig;
  maskedFields: string[];
  audit: SavedSearchAuditMetadata;
  created_at: SavedSearchRow["created_at"];
  updated_at: SavedSearchRow["updated_at"];
};

export type CreateSavedSearchInput = Pick<
  SavedSearchInsert,
  "name" | "query" | "filters" | "visibility" | "description"
> & {
  filters?: Record<string, unknown> | null;
  parameterTokens?: SavedSearchParameterToken[];
  owner?: Partial<SavedSearchOwner> | null;
  alertConfig?: Partial<SavedSearchAlertConfig>;
  maskedFields?: string[];
  sharedUrl?: string | null;
  sharedSlug?: string | null;
};

export type UpdateSavedSearchInput = Partial<
  Pick<
    SavedSearchUpdate,
    | "name"
    | "query"
    | "filters"
    | "visibility"
    | "description"
    | "parameter_tokens"
    | "owner_type"
    | "owner_id"
    | "shared_slug"
    | "shared_url"
    | "alert_frequency"
    | "alert_thresholds"
    | "alert_channels"
    | "alert_metadata"
    | "masked_fields"
  >
> & {
  parameterTokens?: SavedSearchParameterToken[];
  alertConfig?: Partial<SavedSearchAlertConfig>;
  maskedFields?: string[];
  owner?: Partial<SavedSearchOwner> | null;
};

const SAVED_SEARCH_FIELDS =
  [
    "id",
    "name",
    "query",
    "filters",
    "created_at",
    "visibility",
    "description",
    "parameter_tokens",
    "owner_type",
    "owner_id",
    "shared_slug",
    "shared_url",
    "alert_frequency",
    "alert_thresholds",
    "alert_channels",
    "alert_metadata",
    "audit_metadata",
    "updated_at",
    "updated_by",
    "last_accessed_at",
    "last_alert_sent_at",
    "masked_fields",
  ].join(", ");

const normalizeFilters = (filters: SavedSearchRow["filters"]) => {
  if (filters && typeof filters === "object") {
    return filters as Record<string, unknown>;
  }
  return {};
};

const normalizeParameterTokens = (
  tokens: SavedSearchRow["parameter_tokens"]
): SavedSearchParameterToken[] => {
  if (!tokens) return [];
  if (Array.isArray(tokens)) {
    return tokens.filter((token) => typeof token === "object" && token !== null).map((token) => {
      const entry = token as Record<string, unknown>;
      const tokenValue = typeof entry.token === "string" ? entry.token : "";
      const label = typeof entry.label === "string" ? entry.label : tokenValue;
      return {
        token: tokenValue,
        label,
        description:
          typeof entry.description === "string" ? (entry.description as string) : undefined,
        required: typeof entry.required === "boolean" ? (entry.required as boolean) : undefined,
        defaultValue: entry.defaultValue as SavedSearchParameterToken["defaultValue"],
      } satisfies SavedSearchParameterToken;
    });
  }
  return [];
};

const normalizeAlertThresholds = (
  thresholds: SavedSearchRow["alert_thresholds"]
): SavedSearchAlertThreshold[] => {
  if (!thresholds) return [];
  if (Array.isArray(thresholds)) {
    return thresholds
      .filter((threshold) => typeof threshold === "object" && threshold !== null)
      .map((threshold) => {
        const record = threshold as Record<string, unknown>;
        const metric = typeof record.metric === "string" ? record.metric : "count";
        const operator =
          record.operator === "gt" ||
          record.operator === "gte" ||
          record.operator === "lt" ||
          record.operator === "lte" ||
          record.operator === "eq" ||
          record.operator === "neq"
            ? (record.operator as SavedSearchAlertThreshold["operator"])
            : "gte";
        const value = typeof record.value === "number" ? record.value : 0;
        const windowMinutes =
          typeof record.windowMinutes === "number" ? record.windowMinutes : undefined;
        return { metric, operator, value, windowMinutes };
      });
  }
  if (typeof thresholds === "object" && thresholds !== null) {
    const record = thresholds as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      return normalizeAlertThresholds(record.items as SavedSearchRow["alert_thresholds"]);
    }
  }
  return [];
};

const normalizeAlertMetadata = (
  metadata: SavedSearchRow["alert_metadata"]
): Record<string, unknown> => {
  if (metadata && typeof metadata === "object") {
    return metadata as Record<string, unknown>;
  }
  return {};
};

const normalizeAuditMetadata = (
  audit: SavedSearchRow["audit_metadata"],
  row: SavedSearchRow
): SavedSearchAuditMetadata => {
  const base: SavedSearchAuditMetadata = {
    createdBy: row.user_id,
    updatedBy: row.updated_by ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    lastAccessedAt: row.last_accessed_at ?? undefined,
  };
  if (audit && typeof audit === "object") {
    const parsed = audit as Record<string, unknown>;
    if (typeof parsed.createdBy === "string") {
      base.createdBy = parsed.createdBy;
    }
    if (typeof parsed.updatedBy === "string") {
      base.updatedBy = parsed.updatedBy;
    }
    if (typeof parsed.updatedAt === "string") {
      base.updatedAt = parsed.updatedAt;
    }
    if (typeof parsed.lastAccessedAt === "string") {
      base.lastAccessedAt = parsed.lastAccessedAt;
    }
    if (Array.isArray(parsed.exports)) {
      base.exports = parsed.exports
        .filter((entry) => typeof entry === "object" && entry !== null)
        .map((entry) => {
          const record = entry as Record<string, unknown>;
          return {
            at: typeof record.at === "string" ? record.at : new Date().toISOString(),
            actorId:
              typeof record.actorId === "string" || record.actorId === null
                ? (record.actorId as string | null)
                : undefined,
            format:
              record.format === "csv" ||
              record.format === "json" ||
              record.format === "board" ||
              record.format === "report" ||
              record.format === "dataset"
                ? (record.format as SavedSearchAuditExport["format"])
                : "json",
            channel: typeof record.channel === "string" ? record.channel : undefined,
          } satisfies SavedSearchAuditExport;
        });
    }
  }
  return base;
};

const mapRowToSavedSearch = (row: SavedSearchRow): SavedSearch => ({
  id: row.id,
  name: row.name,
  query: row.query,
  filters: normalizeFilters(row.filters),
  visibility: row.visibility,
  description: row.description ?? null,
  parameterTokens: normalizeParameterTokens(row.parameter_tokens),
  owner: {
    type: row.owner_type,
    id: row.owner_id ?? null,
  },
  sharedSlug: row.shared_slug ?? null,
  sharedUrl: row.shared_url ?? null,
  alertConfig: {
    frequency: row.alert_frequency,
    thresholds: normalizeAlertThresholds(row.alert_thresholds),
    channels: Array.isArray(row.alert_channels) ? row.alert_channels : [],
    metadata: normalizeAlertMetadata(row.alert_metadata),
    lastSentAt: row.last_alert_sent_at ?? null,
  },
  maskedFields: Array.isArray(row.masked_fields) ? row.masked_fields : [],
  audit: normalizeAuditMetadata(row.audit_metadata, row),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const listSavedSearches = async (): Promise<SavedSearch[]> => {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("saved_searches")
    .select(SAVED_SEARCH_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw mapSupabaseError(error, "Unable to load saved searches.");
  }

  const rows = (data ?? []) as SavedSearchRow[];

  return rows.map(mapRowToSavedSearch);
};

export const createSavedSearch = async (
  input: CreateSavedSearchInput
): Promise<SavedSearch> => {
  const userId = await requireUserId();

  const name = input.name?.trim();
  if (!name) {
    throw new Error("A name is required to save the search.");
  }

  const query = input.query?.trim();
  if (!query) {
    throw new Error("A query is required to save the search.");
  }

  const visibility = input.visibility ?? "private";
  const parameterTokens = input.parameterTokens ?? [];
  const ownerType = input.owner?.type ?? "user";
  const ownerId = input.owner?.id ?? null;
  const maskedFields = input.maskedFields ?? [];

  const alertConfig: SavedSearchAlertConfig = {
    frequency: input.alertConfig?.frequency ?? "off",
    thresholds: input.alertConfig?.thresholds ?? [],
    channels: input.alertConfig?.channels ?? [],
    metadata: input.alertConfig?.metadata ?? {},
    lastSentAt: null,
  };

  const payload: SavedSearchInsert = {
    name,
    query,
    filters: (input.filters ?? {}) as SavedSearchInsert["filters"],
    user_id: userId,
    visibility,
    description: input.description ?? null,
    parameter_tokens: parameterTokens as SavedSearchInsert["parameter_tokens"],
    owner_type: ownerType,
    owner_id: ownerId ?? null,
    shared_slug: input.sharedSlug ?? null,
    shared_url: input.sharedUrl ?? null,
    alert_frequency: alertConfig.frequency,
    alert_thresholds: alertConfig.thresholds as SavedSearchInsert["alert_thresholds"],
    alert_channels: alertConfig.channels as SavedSearchInsert["alert_channels"],
    alert_metadata: alertConfig.metadata as SavedSearchInsert["alert_metadata"],
    masked_fields: maskedFields,
    audit_metadata: {
      createdBy: userId,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
    } as SavedSearchInsert["audit_metadata"],
  };

  const { data, error } = await supabase
    .from("saved_searches")
    .insert(payload)
    .select(SAVED_SEARCH_FIELDS)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to save the search.");
  }

  if (!data) {
    throw new Error("Unable to save the search.");
  }

  const row = data as SavedSearchRow;

  return mapRowToSavedSearch(row);
};

export const deleteSavedSearch = async (id: string): Promise<void> => {
  const trimmedId = id?.trim();
  if (!trimmedId) {
    throw new Error("A saved search id is required.");
  }

  const userId = await requireUserId();

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", trimmedId)
    .eq("user_id", userId);

  if (error) {
    throw mapSupabaseError(error, "Unable to delete the saved search.");
  }
};

export const updateSavedSearch = async (
  id: string,
  input: UpdateSavedSearchInput
): Promise<SavedSearch> => {
  const trimmedId = id?.trim();
  if (!trimmedId) {
    throw new Error("A saved search id is required.");
  }

  const userId = await requireUserId();

  const { data: existingRow, error: loadError } = await supabase
    .from("saved_searches")
    .select(SAVED_SEARCH_FIELDS)
    .eq("id", trimmedId)
    .eq("user_id", userId)
    .single();

  if (loadError) {
    throw mapSupabaseError(loadError, "Unable to load saved search for update.");
  }

  if (!existingRow) {
    throw new Error("Saved search not found.");
  }

  const existing = existingRow as SavedSearchRow;

  const update: SavedSearchUpdate = {};

  if (typeof input.name === "string") {
    update.name = input.name.trim();
  }
  if (typeof input.query === "string") {
    update.query = input.query.trim();
  }
  if (input.filters) {
    update.filters = input.filters as SavedSearchUpdate["filters"];
  }
  if (input.visibility) {
    update.visibility = input.visibility;
  }
  if ("description" in input) {
    update.description = input.description ?? null;
  }
  if (input.parameterTokens) {
    update.parameter_tokens = input.parameterTokens as SavedSearchUpdate["parameter_tokens"];
  }
  if (input.owner) {
    update.owner_type = input.owner.type ?? "user";
    update.owner_id = input.owner.id ?? null;
  }
  if ("sharedSlug" in input) {
    update.shared_slug = (input as { sharedSlug?: string | null }).sharedSlug ?? null;
  }
  if ("sharedUrl" in input) {
    update.shared_url = (input as { sharedUrl?: string | null }).sharedUrl ?? null;
  }
  if (input.alertConfig) {
    if (input.alertConfig.frequency) {
      update.alert_frequency = input.alertConfig.frequency;
    }
    if (input.alertConfig.thresholds) {
      update.alert_thresholds = input.alertConfig.thresholds as SavedSearchUpdate["alert_thresholds"];
    }
    if (input.alertConfig.channels) {
      update.alert_channels = input.alertConfig.channels as SavedSearchUpdate["alert_channels"];
    }
    if (input.alertConfig.metadata) {
      update.alert_metadata = input.alertConfig.metadata as SavedSearchUpdate["alert_metadata"];
    }
  }
  if (input.maskedFields) {
    update.masked_fields = input.maskedFields;
  }

  const nowIso = new Date().toISOString();
  update.updated_at = nowIso;
  update.updated_by = userId;

  const currentAudit = normalizeAuditMetadata(existing.audit_metadata, existing);
  update.audit_metadata = {
    ...currentAudit,
    updatedBy: userId,
    updatedAt: nowIso,
  } as SavedSearchUpdate["audit_metadata"];

  const { data, error } = await supabase
    .from("saved_searches")
    .update(update)
    .eq("id", trimmedId)
    .eq("user_id", userId)
    .select(SAVED_SEARCH_FIELDS)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to update the saved search.");
  }

  if (!data) {
    throw new Error("Unable to update the saved search.");
  }

  return mapRowToSavedSearch(data as SavedSearchRow);
};

export const recordSavedSearchAccess = async (id: string): Promise<void> => {
  const trimmedId = id?.trim();
  if (!trimmedId) return;

  const userId = await requireUserId();
  const nowIso = new Date().toISOString();

  const { data, error: loadError } = await supabase
    .from("saved_searches")
    .select(SAVED_SEARCH_FIELDS)
    .eq("id", trimmedId)
    .eq("user_id", userId)
    .single();

  if (loadError) {
    throw mapSupabaseError(loadError, "Unable to load saved search for access recording.");
  }

  if (!data) {
    throw new Error("Saved search not found.");
  }

  const row = data as SavedSearchRow;
  const auditMetadata = normalizeAuditMetadata(row.audit_metadata, row);

  const audit: Record<string, unknown> = {
    ...auditMetadata,
    lastAccessedAt: nowIso,
    lastActor: userId,
  };

  const { error } = await supabase
    .from("saved_searches")
    .update({
      last_accessed_at: nowIso,
      audit_metadata: audit as SavedSearchUpdate["audit_metadata"],
      updated_at: nowIso,
      updated_by: userId,
    })
    .eq("id", trimmedId)
    .eq("user_id", userId);

  if (error) {
    throw mapSupabaseError(error, "Unable to record saved search access.");
  }
};

type ExportFormat = "csv" | "json" | "board" | "report" | "dataset";

const maskRows = (rows: Record<string, unknown>[], fields: string[]) => {
  if (!fields.length) return rows;
  return rows.map((row) => {
    const clone: Record<string, unknown> = { ...row };
    fields.forEach((field) => {
      if (field in clone) {
        clone[field] = "***";
      }
    });
    return clone;
  });
};

const toCsv = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }
  return lines.join("\n");
};

export const exportSavedSearchResults = async (
  id: string,
  format: ExportFormat,
  rows: Record<string, unknown>[],
  options?: { channel?: string }
): Promise<{ data: string | Record<string, unknown>[]; masked: boolean }> => {
  const trimmedId = id?.trim();
  if (!trimmedId) {
    throw new Error("A saved search id is required.");
  }

  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("saved_searches")
    .select(SAVED_SEARCH_FIELDS)
    .eq("id", trimmedId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to load saved search for export.");
  }

  if (!data) {
    throw new Error("Saved search not found.");
  }

  const row = data as SavedSearchRow;
  const maskedRows = maskRows(rows, Array.isArray(row.masked_fields) ? row.masked_fields : []);
  const payload: string | Record<string, unknown>[] =
    format === "csv" ? toCsv(maskedRows) : maskedRows;

  const nowIso = new Date().toISOString();
  const auditMetadata = normalizeAuditMetadata(row.audit_metadata, row);
  const exports = auditMetadata.exports ?? [];
  exports.push({
    at: nowIso,
    actorId: userId,
    format,
    channel: options?.channel,
  });

  const updatePayload: SavedSearchUpdate = {
    audit_metadata: {
      ...auditMetadata,
      exports,
      updatedBy: userId,
      updatedAt: nowIso,
    } as SavedSearchUpdate["audit_metadata"],
    updated_at: nowIso,
    updated_by: userId,
  };

  const { error: updateError } = await supabase
    .from("saved_searches")
    .update(updatePayload)
    .eq("id", trimmedId)
    .eq("user_id", userId);

  if (updateError) {
    throw mapSupabaseError(updateError, "Unable to update audit metadata.");
  }

  return { data: payload, masked: !!row.masked_fields?.length };
};
