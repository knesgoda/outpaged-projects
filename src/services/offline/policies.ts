import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_OFFLINE_POLICY,
  REMOTE_WIPE_ACK_STORAGE_KEY,
  type OfflinePolicy,
  type OfflinePolicyUpdate,
  type RemoteWipePolicy,
} from "./types";
import {
  applyOfflinePolicy,
  getOfflinePolicyState,
  normalizeOfflinePolicy,
  updateOfflinePolicyState,
} from "./policyState";

const FUNCTION_NAME = "admin-offline-policies";
const LOCAL_STORAGE_KEY = "outpaged-offline-policy-cache";

function readLocalPolicy(): OfflinePolicy {
  if (typeof window === "undefined") return DEFAULT_OFFLINE_POLICY;
  try {
    const value = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!value) return DEFAULT_OFFLINE_POLICY;
    const parsed = JSON.parse(value) as OfflinePolicy;
    return normalizeOfflinePolicy(parsed);
  } catch {
    return DEFAULT_OFFLINE_POLICY;
  }
}

function persistLocalPolicy(policy: OfflinePolicy) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(policy));
  } catch {
    // ignore write errors
  }
}

async function invokePolicyFunction(
  action: string,
  payload?: Record<string, unknown>
): Promise<OfflinePolicy | null> {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: { action, payload },
    });
    if (error) {
      throw new Error(error.message);
    }
    if (!data) return null;
    const maybePolicy = (data as { policy?: OfflinePolicy }).policy ?? data;
    if (maybePolicy && typeof maybePolicy === "object") {
      return normalizeOfflinePolicy(maybePolicy as OfflinePolicy);
    }
    return null;
  } catch (error) {
    console.warn("Failed to invoke offline policy function", error);
    return null;
  }
}

export async function fetchOfflinePolicy(): Promise<OfflinePolicy> {
  const remote = await invokePolicyFunction("get");
  const policy = remote ?? readLocalPolicy();
  const applied = await applyOfflinePolicy(policy);
  persistLocalPolicy(applied);
  return applied;
}

export async function saveOfflinePolicy(update: OfflinePolicyUpdate): Promise<OfflinePolicy> {
  const current = getOfflinePolicyState();
  const candidate = normalizeOfflinePolicy({
    ...current,
    ...update,
    remoteWipe: { ...current.remoteWipe, ...(update.remoteWipe ?? {}) },
  });

  const remote = await invokePolicyFunction("update", { policy: update });
  const policy = remote ?? candidate;
  const applied = await applyOfflinePolicy(policy);
  persistLocalPolicy(applied);
  return applied;
}

export interface RemoteWipeRequest {
  reason?: string;
  target?: RemoteWipePolicy["target"];
  sessionIds?: string[];
}

export async function triggerRemoteWipe(request: RemoteWipeRequest): Promise<OfflinePolicy> {
  const payload = {
    reason: request.reason ?? null,
    target: request.target ?? "all",
    sessionIds: (request.sessionIds ?? []).filter(Boolean),
  };

  const remote = await invokePolicyFunction("remote-wipe", payload);
  let policy = remote;

  if (!policy) {
    const issuedAt = new Date().toISOString();
    policy = updateOfflinePolicyState({
      remoteWipe: {
        active: true,
        reason: request.reason ?? null,
        issuedAt,
        target: payload.target,
        sessionIds: payload.sessionIds,
      },
    });
  }

  const applied = await applyOfflinePolicy(policy);
  persistLocalPolicy(applied);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(REMOTE_WIPE_ACK_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  return applied;
}

export function getCachedOfflinePolicy(): OfflinePolicy {
  return getOfflinePolicyState();
}
