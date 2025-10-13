import { supabase } from "@/integrations/supabase/client";

export interface DeviceSessionRecord {
  id: string;
  user_id: string;
  user_email: string | null;
  device_type: "desktop" | "mobile" | string | null;
  browser: string | null;
  last_seen_at: string | null;
  sw_version: string | null;
  pending_remote_wipe?: boolean | null;
}

const DEVICE_SESSIONS_FUNCTION = "admin-device-sessions";
const REMOTE_WIPE_FUNCTION = "admin-remote-wipe-session";

function normalizeResponse(payload: unknown): DeviceSessionRecord[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload as DeviceSessionRecord[];
  }
  if (typeof payload === "object" && payload !== null) {
    const maybeSessions = (payload as { sessions?: unknown }).sessions;
    if (Array.isArray(maybeSessions)) {
      return maybeSessions as DeviceSessionRecord[];
    }
  }
  return [];
}

export async function fetchDeviceSessions(): Promise<DeviceSessionRecord[]> {
  const { data, error } = await supabase.functions.invoke(DEVICE_SESSIONS_FUNCTION, {
    body: { action: "list" },
  });

  if (error) {
    throw new Error(error.message || "Failed to load device inventory");
  }

  return normalizeResponse(data);
}

export async function triggerRemoteWipe(deviceId: string): Promise<void> {
  if (!deviceId) {
    throw new Error("Device ID is required to trigger a remote wipe");
  }

  const { error } = await supabase.functions.invoke(REMOTE_WIPE_FUNCTION, {
    body: { deviceId },
  });

  if (error) {
    throw new Error(error.message || "Failed to trigger remote wipe");
  }
}
