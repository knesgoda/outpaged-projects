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
    .from("audit_logs")
    .select("id, actor, action, target_type, target_id, metadata, created_at")
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
        `target_type.ilike.${ilike}`,
        `target_id.ilike.${ilike}`,
      ].join(",")
    );
  }

  const { data, error } = await query;

  if (error) {
    handleSupabaseError(error, "Failed to load audit logs.");
  }

  return (data as AuditLog[]) ?? [];
}

export async function recordAudit(
  action: string,
  target?: { type?: string; id?: string },
  metadata?: any
): Promise<void> {
  const actor = await requireUserId();
  const payload = {
    actor,
    action,
    target_type: target?.type ?? null,
    target_id: target?.id ?? null,
    metadata: metadata ?? null,
  };

  const { error } = await supabase.from("audit_logs").insert(payload);

  if (error) {
    handleSupabaseError(error, "Failed to record audit log.");
  }
}
