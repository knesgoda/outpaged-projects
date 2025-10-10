const truthy = new Set(["true", "1", "on", "yes"]);

let cachedImportMetaEnv: Record<string, string | undefined> | undefined | null = null;

function getImportMetaEnv(): Record<string, string | undefined> | undefined {
  if (cachedImportMetaEnv !== null) {
    return cachedImportMetaEnv ?? undefined;
  }

  try {
    const evaluator = new Function(
      "return typeof import !== 'undefined' && import.meta ? import.meta.env : undefined;"
    );
    cachedImportMetaEnv = evaluator() as Record<string, string | undefined> | undefined;
  } catch (error) {
    console.warn("Failed to evaluate import.meta.env", { error });
    cachedImportMetaEnv = undefined;
  }

  return cachedImportMetaEnv ?? undefined;
}

function readEnv(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }

  const importMetaEnv = getImportMetaEnv();
  return importMetaEnv?.[key];
}

function isEnabled(): boolean {
  const raw = readEnv("VITE_AUDIT_CLIENT_ENABLED");
  if (typeof raw !== "string") {
    return false;
  }
  return truthy.has(raw.toLowerCase());
}

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

export interface AuditClient {
  log(entry: AuditLogEntry): Promise<void>;
}

function buildHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function handleResponse(response: Response) {
  if (response.ok) {
    return;
  }

  let details: string | undefined;

  try {
    const json = await response.json();
    if (typeof json === "string") {
      details = json;
    } else if (json && typeof json === "object") {
      const errorMessage =
        (json as { error?: string }).error || (json as { message?: string }).message;
      if (typeof errorMessage === "string") {
        details = errorMessage;
      }
    }
  } catch (jsonError) {
    try {
      details = await response.text();
    } catch {
      // Ignore parsing errors
    }
  }

  const statusLabel = `${response.status} ${response.statusText}`.trim();
  const suffix = details ? `: ${details}` : "";
  throw new Error(`Audit service responded with ${statusLabel}${suffix}`);
}

export function createAuditClient(): AuditClient | null {
  if (!isEnabled()) {
    return null;
  }

  const endpoint = readEnv("VITE_AUDIT_SERVICE_URL");
  if (!endpoint) {
    console.warn("Audit client enabled but VITE_AUDIT_SERVICE_URL is not defined");
    return null;
  }

  const token = readEnv("VITE_AUDIT_SERVICE_TOKEN");

  return {
    async log(entry: AuditLogEntry) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: buildHeaders(token),
        body: JSON.stringify(entry)
      });

      await handleResponse(response);
    }
  };
}
