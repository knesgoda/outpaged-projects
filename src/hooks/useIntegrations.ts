import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Integration, UserIntegration, Webhook } from "@/types";
import {
  connectIntegration as connectIntegrationService,
  createWebhook as createIntegrationWebhook,
  deleteWebhook as deleteIntegrationWebhook,
  disconnectIntegration as disconnectIntegrationService,
  listIntegrations,
  listProjectWebhooks,
  listUserIntegrations,
  listWorkspaceWebhooks,
  updateIntegrationConfig as updateIntegrationConfigService,
  updateUserIntegration as updateUserIntegrationService,
  updateWebhook as updateIntegrationWebhook,
  type ConnectIntegrationInput,
  type CreateIntegrationWebhookInput,
  type UpdateIntegrationConfigInput,
  type UpdateUserIntegrationInput,
} from "@/services/integrations";

const INTEGRATIONS_QUERY_KEY = ["integrations"] as const;
const USER_INTEGRATIONS_QUERY_KEY = (projectId: string | null) =>
  ["user-integrations", projectId] as const;
const WORKSPACE_WEBHOOKS_QUERY_KEY = ["webhooks", "workspace"] as const;
const PROJECT_WEBHOOKS_QUERY_KEY = (projectId: string | null) =>
  ["webhooks", "project", projectId] as const;

const USER_INTEGRATIONS_ROOT_KEY = ["user-integrations"] as const;
const WEBHOOKS_ROOT_KEY = ["webhooks"] as const;

type UseIntegrationsOptions = {
  projectId?: string;
};

type UpdateWebhookInput = Partial<{
  target_url: string;
  secret?: string | null;
  active?: boolean;
}>;

type UpdateIntegrationConfigArgs = UpdateIntegrationConfigInput;

type CreateWebhookArgs = CreateIntegrationWebhookInput;

type ConnectIntegrationArgs = ConnectIntegrationInput;

type UpdateUserIntegrationArgs = UpdateUserIntegrationInput;

const ensureArray = <T,>(value: T[] | undefined): T[] => value ?? [];

export function useIntegrations(options: UseIntegrationsOptions = {}) {
  const queryClient = useQueryClient();
  const scopedProjectId = options.projectId ?? null;

  const integrationsQuery = useQuery({
    queryKey: INTEGRATIONS_QUERY_KEY,
    queryFn: listIntegrations,
    placeholderData: (previous) => previous ?? [],
  });

  const userIntegrationsQuery = useQuery({
    queryKey: USER_INTEGRATIONS_QUERY_KEY(scopedProjectId),
    queryFn: () => listUserIntegrations({ projectId: scopedProjectId ?? undefined }),
    placeholderData: (previous) => previous ?? [],
  });

  const workspaceWebhooksQuery = useQuery({
    queryKey: WORKSPACE_WEBHOOKS_QUERY_KEY,
    queryFn: listWorkspaceWebhooks,
    placeholderData: (previous) => previous ?? [],
  });

  const projectWebhooksQuery = useQuery({
    queryKey: PROJECT_WEBHOOKS_QUERY_KEY(scopedProjectId),
    queryFn: () => {
      if (!scopedProjectId) {
        return Promise.resolve<Webhook[]>([]);
      }
      return listProjectWebhooks(scopedProjectId);
    },
    enabled: Boolean(scopedProjectId),
    placeholderData: (previous) => previous ?? [],
  });

  const connectIntegrationMutation = useMutation({
    mutationFn: connectIntegrationService,
    onSuccess: (connection) => {
      queryClient.setQueriesData<UserIntegration[]>(
        { queryKey: USER_INTEGRATIONS_ROOT_KEY },
        (previous) => {
          const list = previous ?? [];
          const existingIndex = list.findIndex((item) => item.id === connection.id);
          if (existingIndex >= 0) {
            const next = list.slice();
            next[existingIndex] = connection;
            return next;
          }
          return [connection, ...list];
        },
      );
      queryClient.invalidateQueries({ queryKey: USER_INTEGRATIONS_ROOT_KEY });
    },
  });

  const disconnectIntegrationMutation = useMutation({
    mutationFn: disconnectIntegrationService,
    onSuccess: (_, id) => {
      queryClient.setQueriesData<UserIntegration[]>(
        { queryKey: USER_INTEGRATIONS_ROOT_KEY },
        (previous) => {
          if (!previous) return previous;
          const next = previous.filter((item) => item.id !== id);
          return next;
        },
      );
      queryClient.invalidateQueries({ queryKey: USER_INTEGRATIONS_ROOT_KEY });
    },
  });

  const updateUserIntegrationMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateUserIntegrationArgs }) =>
      updateUserIntegrationService(id, patch),
    onSuccess: (connection) => {
      queryClient.setQueriesData<UserIntegration[]>(
        { queryKey: USER_INTEGRATIONS_ROOT_KEY },
        (previous) => {
          if (!previous) return [connection];
          return previous.map((item) => (item.id === connection.id ? connection : item));
        },
      );
      queryClient.invalidateQueries({ queryKey: USER_INTEGRATIONS_ROOT_KEY });
    },
  });

  const updateIntegrationConfigMutation = useMutation({
    mutationFn: (input: UpdateIntegrationConfigArgs) =>
      updateIntegrationConfigService(input),
    onSuccess: (integration) => {
      queryClient.setQueriesData<Integration[]>(
        { queryKey: INTEGRATIONS_QUERY_KEY },
        (previous) => {
          if (!previous) return [integration];
          const existingIndex = previous.findIndex((item) => item.key === integration.key);
          if (existingIndex === -1) {
            return [integration, ...previous];
          }
          const next = previous.slice();
          next[existingIndex] = integration;
          return next;
        },
      );
      queryClient.invalidateQueries({ queryKey: INTEGRATIONS_QUERY_KEY });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: (input: CreateWebhookArgs) => createIntegrationWebhook(input),
    onSuccess: (webhook) => {
      const scopeKey = webhook.project_id
        ? PROJECT_WEBHOOKS_QUERY_KEY(webhook.project_id)
        : WORKSPACE_WEBHOOKS_QUERY_KEY;
      queryClient.setQueryData<Webhook[]>(scopeKey, (previous) => {
        const list = previous ?? [];
        const existingIndex = list.findIndex((item) => item.id === webhook.id);
        if (existingIndex >= 0) {
          const next = list.slice();
          next[existingIndex] = webhook;
          return next;
        }
        return [webhook, ...list];
      });
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_ROOT_KEY });
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateWebhookInput }) =>
      updateIntegrationWebhook(id, patch),
    onSuccess: (webhook) => {
      const scopeKey = webhook.project_id
        ? PROJECT_WEBHOOKS_QUERY_KEY(webhook.project_id)
        : WORKSPACE_WEBHOOKS_QUERY_KEY;
      queryClient.setQueryData<Webhook[]>(scopeKey, (previous) => {
        if (!previous) return [webhook];
        return previous.map((item) => (item.id === webhook.id ? webhook : item));
      });
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_ROOT_KEY });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => deleteIntegrationWebhook(id),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<Webhook[]>(
        { queryKey: WEBHOOKS_ROOT_KEY },
        (previous) => {
          if (!previous) return previous;
          const next = previous.filter((item) => item.id !== id);
          return next;
        },
      );
      queryClient.invalidateQueries({ queryKey: WEBHOOKS_ROOT_KEY });
    },
  });

  const connectIntegration = useCallback(
    (input: ConnectIntegrationArgs) =>
      connectIntegrationMutation.mutateAsync({
        ...input,
        projectId: input.projectId ?? scopedProjectId ?? null,
      }),
    [connectIntegrationMutation, scopedProjectId],
  );

  const disconnectIntegration = useCallback(
    (id: string) => disconnectIntegrationMutation.mutateAsync(id),
    [disconnectIntegrationMutation],
  );

  const updateUserIntegration = useCallback(
    (id: string, patch: UpdateUserIntegrationArgs) =>
      updateUserIntegrationMutation.mutateAsync({ id, patch }),
    [updateUserIntegrationMutation],
  );

  const updateIntegrationConfig = useCallback(
    (input: UpdateIntegrationConfigArgs) => updateIntegrationConfigMutation.mutateAsync(input),
    [updateIntegrationConfigMutation],
  );

  const createWebhook = useCallback(
    (input: CreateWebhookArgs) =>
      createWebhookMutation.mutateAsync({
        ...input,
        projectId: input.projectId ?? scopedProjectId ?? null,
      }),
    [createWebhookMutation, scopedProjectId],
  );

  const updateWebhook = useCallback(
    (id: string, patch: UpdateWebhookInput) =>
      updateWebhookMutation.mutateAsync({ id, patch }),
    [updateWebhookMutation],
  );

  const deleteWebhook = useCallback(
    (id: string) => deleteWebhookMutation.mutateAsync(id),
    [deleteWebhookMutation],
  );

  const combinedError =
    integrationsQuery.error ??
    userIntegrationsQuery.error ??
    workspaceWebhooksQuery.error ??
    projectWebhooksQuery.error ??
    connectIntegrationMutation.error ??
    disconnectIntegrationMutation.error ??
    updateUserIntegrationMutation.error ??
    updateIntegrationConfigMutation.error ??
    createWebhookMutation.error ??
    updateWebhookMutation.error ??
    deleteWebhookMutation.error ??
    null;

  return useMemo(
    () => ({
      integrations: ensureArray(integrationsQuery.data) as Integration[],
      userIntegrations: ensureArray(userIntegrationsQuery.data) as UserIntegration[],
      workspaceWebhooks: ensureArray(workspaceWebhooksQuery.data) as Webhook[],
      projectWebhooks: ensureArray(projectWebhooksQuery.data) as Webhook[],
      isLoading:
        integrationsQuery.isLoading ||
        userIntegrationsQuery.isLoading ||
        workspaceWebhooksQuery.isLoading ||
        projectWebhooksQuery.isLoading,
      isRefreshing:
        integrationsQuery.isFetching ||
        userIntegrationsQuery.isFetching ||
        workspaceWebhooksQuery.isFetching ||
        projectWebhooksQuery.isFetching,
      error: (combinedError ?? null) as Error | null,
      connectIntegration,
      disconnectIntegration,
      updateUserIntegration,
      updateIntegrationConfig,
      createWebhook,
      updateWebhook,
      deleteWebhook,
      isConnecting: connectIntegrationMutation.isPending,
      isDisconnecting: disconnectIntegrationMutation.isPending,
      isUpdatingIntegration:
        updateUserIntegrationMutation.isPending || updateIntegrationConfigMutation.isPending,
      isSavingWebhook: createWebhookMutation.isPending || updateWebhookMutation.isPending,
      isDeletingWebhook: deleteWebhookMutation.isPending,
    }),
    [
      integrationsQuery.data,
      integrationsQuery.isFetching,
      integrationsQuery.isLoading,
      userIntegrationsQuery.data,
      userIntegrationsQuery.isFetching,
      userIntegrationsQuery.isLoading,
      workspaceWebhooksQuery.data,
      workspaceWebhooksQuery.isFetching,
      workspaceWebhooksQuery.isLoading,
      projectWebhooksQuery.data,
      projectWebhooksQuery.isFetching,
      projectWebhooksQuery.isLoading,
      connectIntegration,
      disconnectIntegration,
      updateUserIntegration,
      updateIntegrationConfig,
      createWebhook,
      updateWebhook,
      deleteWebhook,
      connectIntegrationMutation.isPending,
      disconnectIntegrationMutation.isPending,
      updateUserIntegrationMutation.isPending,
      updateIntegrationConfigMutation.isPending,
      createWebhookMutation.isPending,
      updateWebhookMutation.isPending,
      deleteWebhookMutation.isPending,
      combinedError,
    ],
  );
}
