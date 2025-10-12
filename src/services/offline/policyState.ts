import {
  DEFAULT_OFFLINE_POLICY,
  DEFAULT_REMOTE_WIPE_POLICY,
  type OfflinePolicy,
  type OfflinePolicyUpdate,
  type RemoteWipePolicy,
} from "./types";
import { enforceOfflinePolicy } from "./enforcement";

let currentPolicy: OfflinePolicy = { ...DEFAULT_OFFLINE_POLICY };
const listeners = new Set<(policy: OfflinePolicy) => void>();

function normalizeRemoteWipe(policy?: Partial<RemoteWipePolicy> | null): RemoteWipePolicy {
  return {
    ...DEFAULT_REMOTE_WIPE_POLICY,
    ...(policy ?? {}),
    sessionIds: policy?.sessionIds?.filter(Boolean) ?? [],
  };
}

export function normalizeOfflinePolicy(
  policy: OfflinePolicy | (Partial<OfflinePolicy> & { remoteWipe?: Partial<RemoteWipePolicy> })
): OfflinePolicy {
  return {
    ...DEFAULT_OFFLINE_POLICY,
    ...policy,
    remoteWipe: normalizeRemoteWipe(policy.remoteWipe ?? (policy as OfflinePolicy).remoteWipe),
  };
}

function notify() {
  for (const listener of listeners) {
    listener(currentPolicy);
  }
}

export function getOfflinePolicyState(): OfflinePolicy {
  return currentPolicy;
}

export function setOfflinePolicyState(policy: OfflinePolicy): OfflinePolicy {
  currentPolicy = normalizeOfflinePolicy(policy);
  notify();
  return currentPolicy;
}

export function updateOfflinePolicyState(update: OfflinePolicyUpdate): OfflinePolicy {
  const next = normalizeOfflinePolicy({
    ...currentPolicy,
    ...update,
    remoteWipe: { ...currentPolicy.remoteWipe, ...(update.remoteWipe ?? {}) },
  });
  currentPolicy = next;
  notify();
  return currentPolicy;
}

export async function applyOfflinePolicy(policy: OfflinePolicy): Promise<OfflinePolicy> {
  const normalized = normalizeOfflinePolicy(policy);
  await enforceOfflinePolicy(normalized);
  currentPolicy = normalized;
  notify();
  return currentPolicy;
}

export function subscribeOfflinePolicy(listener: (policy: OfflinePolicy) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetOfflinePolicyState() {
  currentPolicy = { ...DEFAULT_OFFLINE_POLICY };
  notify();
}
