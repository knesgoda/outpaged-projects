import { useMemo } from "react";
import type { Integration, UserIntegration, Webhook } from "@/types";

type UseIntegrationsOptions = {
  projectId?: string;
};

export function useIntegrations(_options: UseIntegrationsOptions = {}) {
  return useMemo(() => ({
    integrations: [] as Integration[],
    userIntegrations: [] as UserIntegration[],
    workspaceWebhooks: [] as Webhook[],
    projectWebhooks: [] as Webhook[],
    isLoading: false,
    isRefreshing: false,
    error: null,
    connectIntegration: async () => { console.warn('Integrations not implemented'); },
    disconnectIntegration: async () => { console.warn('Integrations not implemented'); },
    updateUserIntegration: async () => { console.warn('Integrations not implemented'); },
    updateIntegrationConfig: async () => { console.warn('Integrations not implemented'); },
    createWebhook: async () => { console.warn('Integrations not implemented'); return {} as Webhook; },
    updateWebhook: async () => { console.warn('Integrations not implemented'); },
    deleteWebhook: async () => { console.warn('Integrations not implemented'); },
    isConnecting: false,
    isDisconnecting: false,
    isUpdatingIntegration: false,
    isSavingWebhook: false,
    isDeletingWebhook: false,
  }), []);
}
