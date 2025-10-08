const truthy = new Set(["true", "1", "on", "yes"]);
const falsy = new Set(["false", "0", "off", "no"]);

function readEnv(key: string): string | undefined {
  try {
    return import.meta.env?.[key as keyof ImportMetaEnv];
  } catch (error) {
    console.warn("Failed to read env variable", { key, error });
    return undefined;
  }
}

function getBooleanFlag(key: string, fallback: boolean) {
  const envKey = `VITE_${key}`;
  const raw = readEnv(envKey);

  if (typeof raw === "string") {
    const value = raw.toLowerCase();
    if (truthy.has(value)) return true;
    if (falsy.has(value)) return false;
  }

  return fallback;
}

export const FEATURE_PEOPLE_TEAMS = getBooleanFlag("FEATURE_PEOPLE_TEAMS", true);
export const FEATURE_TIME_TRACKING = getBooleanFlag("FEATURE_TIME_TRACKING", true);

export const FEATURE_FLAGS = {
  dashboards: true,
  automations: true,
  integrations: true,
  forms: true,
  goals: true,
  timeTracking: FEATURE_TIME_TRACKING,
  apiExplorer: true,
  peopleTeams: FEATURE_PEOPLE_TEAMS,
} satisfies Record<string, boolean>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

// Legacy flags kept for backward compatibility with existing modules.
export const enableOutpagedBrand = true;
export const enableGoogleSSO = true;
export const enableDomainAllowlist = false;
export const enableTeamsAndRoles = true;
export const enableWorkflowEngine = true;
export const enableHandoffs = true;
export const enableNotifications = true;
export const enableSlack = true;
export const enableCustomFields = true;
export const enableSLATracking = true;
export const enableAdvancedViews = true;
