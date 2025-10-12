import {
  clearOfflineStorage,
  enforceOfflineCacheBudget,
  getOfflineNodeId,
  pruneOfflineRetention,
  setOfflinePersistenceEnabled,
} from "./indexedDbQueue";
import { clearOfflineIndex } from "./opqlIndex";
import { clearSessionEncryptionState } from "./crypto";
import { performRemoteWipe } from "./remoteWipe";
import { REMOTE_WIPE_ACK_STORAGE_KEY, type OfflinePolicy, type RemoteWipePolicy } from "./types";

function getAckToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(REMOTE_WIPE_ACK_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setAckToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REMOTE_WIPE_ACK_STORAGE_KEY, token);
  } catch {
    // ignore write errors
  }
}

function buildRemoteWipeToken(policy: RemoteWipePolicy): string | null {
  if (!policy.active) return null;
  if (policy.issuedAt) return policy.issuedAt;
  const sessions = policy.sessionIds?.length ? policy.sessionIds.join(",") : "all";
  return `${policy.target ?? "all"}:${sessions}:${policy.reason ?? "remote"}`;
}

function isSessionTargeted(policy: RemoteWipePolicy, sessionId: string): boolean {
  if (!policy.active) return false;
  if (!policy.sessionIds?.length) return true;
  if (policy.target === "all") return true;
  return policy.sessionIds.includes(sessionId);
}

async function evaluateRemoteWipe(policy: RemoteWipePolicy): Promise<void> {
  if (!policy.active) return;
  const token = buildRemoteWipeToken(policy);
  if (!token) return;
  const sessionId = getOfflineNodeId();
  if (!isSessionTargeted(policy, sessionId)) return;
  const ack = getAckToken();
  if (ack === token) return;
  await performRemoteWipe({ reason: policy.reason ?? undefined, token });
  setAckToken(token);
}

export async function enforceOfflinePolicy(policy: OfflinePolicy): Promise<void> {
  setOfflinePersistenceEnabled(policy.enabled);
  if (!policy.enabled) {
    await clearOfflineStorage();
    await clearOfflineIndex();
    clearSessionEncryptionState();
    return;
  }

  if (policy.retentionHours > 0) {
    await pruneOfflineRetention(policy.retentionHours * 60 * 60 * 1000);
  }

  if (policy.cacheLimitMb > 0) {
    await enforceOfflineCacheBudget(Math.floor(policy.cacheLimitMb * 1024 * 1024));
  }

  await evaluateRemoteWipe(policy.remoteWipe);
}
