import { supabase } from "@/integrations/supabase/client";
import type { AuditLog } from "@/types";
import { handleSupabaseError, requireUserId } from "@/services/utils";

type AuditListParams = {
  q?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function listAuditLogs(params?: AuditListParams): Promise<AuditLog[]> {
  let query = supabase
    .from("audit_logs" as any)
    .select("id, user_id, action, entity_type, entity_id, changes, metadata, created_at")
    .order("created_at", { ascending: false });

  if (params?.action) {
    query = query.eq("action", params.action);
  }

  if (params?.from) {
    query = query.gte("created_at", params.from);
  }

  if (params?.to) {
    query = query.lte("created_at", params.to);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const trimmedQuery = params?.q?.trim();
  if (trimmedQuery) {
    const ilike = `%${trimmedQuery}%`;
    query = query.or(
      [
        `action.ilike.${ilike}`,
        `entity_type.ilike.${ilike}`,
        `entity_id.ilike.${ilike}`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    handleSupabaseError(error, "Failed to load audit logs.");
  }

  return (data as any) ?? [];
}

export async function recordAudit(
  action: string,
  target?: { type?: string; id?: string },
  metadata?: any
): Promise<void> {
  const user_id = await requireUserId();
  const payload = {
    user_id,
    action,
    entity_type: target?.type ?? null,
    entity_id: target?.id ?? null,
    changes: {},
    metadata: metadata ?? null,
  };

  const { error } = await supabase.from("audit_logs" as any).insert(payload as any);

  if (error) {
    handleSupabaseError(error, "Failed to record audit log.");
  }
}
