export const FEATURE_FLAGS = {
  dashboards: true,
  automations: true,
  integrations: true,
  forms: true,
  goals: true,
  timeTracking: true,
  apiExplorer: true,
} as const;

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
