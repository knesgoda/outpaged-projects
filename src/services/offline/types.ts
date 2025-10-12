export interface RemoteWipePolicy {
  active: boolean;
  reason?: string | null;
  issuedAt?: string | null;
  target?: "all" | "sessions";
  sessionIds?: string[];
}

export interface OfflinePolicy {
  enabled: boolean;
  cacheLimitMb: number;
  retentionHours: number;
  remoteWipe: RemoteWipePolicy;
}

export const DEFAULT_REMOTE_WIPE_POLICY: RemoteWipePolicy = {
  active: false,
  reason: null,
  issuedAt: null,
  target: "all",
  sessionIds: [],
};

export const DEFAULT_OFFLINE_POLICY: OfflinePolicy = {
  enabled: true,
  cacheLimitMb: 64,
  retentionHours: 72,
  remoteWipe: DEFAULT_REMOTE_WIPE_POLICY,
};

export type OfflinePolicyUpdate = Partial<OfflinePolicy> & {
  remoteWipe?: Partial<RemoteWipePolicy>;
};

export const REMOTE_WIPE_ACK_STORAGE_KEY = "outpaged-remote-wipe-ack";
