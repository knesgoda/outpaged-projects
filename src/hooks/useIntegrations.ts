import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectIntegration as connectIntegrationService,
  createWebhook as createWebhookService,
  deleteWebhook as deleteWebhookService,
  disconnectIntegration as disconnectIntegrationService,
  listIntegrations,
  listUserIntegrations,
  listWebhooks,
  updateIntegrationConfig as updateIntegrationConfigService,
  updateUserIntegration as updateUserIntegrationService,
  updateWebhook as updateWebhookService,
} from "@/services/integrations";
import type { Integration, UserIntegration, Webhook } from "@/types";

const integrationsKey = ["integrations"] as const;
const userIntegrationsKey = (projectId: string | null) => ["user-integrations", projectId ?? "workspace"] as const;
const workspaceWebhooksKey = ["webhooks", "workspace"] as const;
const projectWebhooksKey = (projectId: string) => ["webhooks", `project-${projectId}`] as const;

type UseIntegrationsOptions = {
  projectId?: string;
};

type ConnectInput = Parameters<typeof connectIntegrationService>[0];
type UpdateUserIntegrationInput = Parameters<typeof updateUserIntegrationService>[1];
type CreateWebhookInput = Parameters<typeof createWebhookService>[0];
type UpdateWebhookInput = Parameters<typeof updateWebhookService>[1];

export function useIntegrations(options: UseIntegrationsOptions = {}) {
  const projectId = options.projectId ?? null;
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: integrationsKey,
    queryFn: listIntegrations,
    staleTime: 1000 * 60,
  });

  const userIntegrationsQuery = useQuery({
    queryKey: userIntegrationsKey(projectId),
    queryFn: () => listUserIntegrations({ projectId: projectId ?? undefined }),
    staleTime: 1000 * 30,
  });

  const workspaceWebhooksQuery = useQuery({
    queryKey: workspaceWebhooksKey,
    queryFn: () => listWebhooks(),
    staleTime: 1000 * 30,
  });

  const projectWebhooksQuery = useQuery({
    queryKey: projectId ? projectWebhooksKey(projectId) : ["webhooks", "project"] ,
    queryFn: () => (projectId ? listWebhooks(projectId) : []),
    staleTime: 1000 * 30,
    enabled: Boolean(projectId),
  });

  const connectMutation = useMutation({
    mutationFn: (input: ConnectInput) => connectIntegrationService(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectIntegrationService(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateUserIntegrationInput }) =>
      updateUserIntegrationService(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: userIntegrationsKey(projectId) });
      const previous = queryClient.getQueryData<UserIntegration[]>(userIntegrationsKey(projectId));
      queryClient.setQueryData<UserIntegration[]>(userIntegrationsKey(projectId), (current = []) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userIntegrationsKey(projectId), context.previous);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-integrations"] });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: (input: CreateWebhookInput) => createWebhookService(input),
    onSuccess: (result, variables) => {
      const key = variables.projectId ? projectWebhooksKey(variables.projectId) : workspaceWebhooksKey;
      queryClient.setQueryData<Webhook[]>(key, (current = []) => [result, ...current]);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateWebhookInput }) => updateWebhookService(id, patch),
    onSuccess: (result) => {
      const scopeKey = result.project_id ? projectWebhooksKey(result.project_id) : workspaceWebhooksKey;
      queryClient.setQueryData<Webhook[]>(scopeKey, (current = []) => current.map((item) => (item.id === result.id ? result : item)));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: string) => deleteWebhookService(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Webhook[]>(workspaceWebhooksKey, (current = []) => current.filter((item) => item.id !== id));
      if (projectId) {
        queryClient.setQueryData<Webhook[]>(projectWebhooksKey(projectId), (current = []) =>
          current.filter((item) => item.id !== id)
        );
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });

  return useMemo(() => {
    const integrations = integrationsQuery.data ?? [];
    const userIntegrations = userIntegrationsQuery.data ?? [];
    const workspaceWebhooks = workspaceWebhooksQuery.data ?? [];
    const projectWebhooks = (projectWebhooksQuery.data ?? []) as Webhook[];

    const error =
      (integrationsQuery.error as Error | undefined) ||
      (userIntegrationsQuery.error as Error | undefined) ||
      (workspaceWebhooksQuery.error as Error | undefined) ||
      (projectWebhooksQuery.error as Error | undefined) ||
      null;

    const isLoading =
      integrationsQuery.isLoading ||
      userIntegrationsQuery.isLoading ||
      workspaceWebhooksQuery.isLoading ||
      projectWebhooksQuery.isLoading;

    const isRefreshing =
      integrationsQuery.isFetching ||
      userIntegrationsQuery.isFetching ||
      workspaceWebhooksQuery.isFetching ||
      projectWebhooksQuery.isFetching;

    return {
      integrations: integrations as Integration[],
      userIntegrations,
      workspaceWebhooks,
      projectWebhooks,
      isLoading,
      isRefreshing,
      error,
      connectIntegration: (input: ConnectInput) => connectMutation.mutateAsync(input),
      disconnectIntegration: (id: string) => disconnectMutation.mutateAsync(id),
      updateUserIntegration: (id: string, patch: UpdateUserIntegrationInput) =>
        updateIntegrationMutation.mutateAsync({ id, patch }),
      updateIntegrationConfig: (key: Integration["key"], patch: any) =>
        updateIntegrationConfigService(key, patch),
      createWebhook: (input: CreateWebhookInput) => createWebhookMutation.mutateAsync(input),
      updateWebhook: (id: string, patch: UpdateWebhookInput) =>
        updateWebhookMutation.mutateAsync({ id, patch }),
      deleteWebhook: (id: string) => deleteWebhookMutation.mutateAsync(id),
      isConnecting: connectMutation.isPending,
      isDisconnecting: disconnectMutation.isPending,
      isUpdatingIntegration: updateIntegrationMutation.isPending,
      isSavingWebhook: createWebhookMutation.isPending || updateWebhookMutation.isPending,
      isDeletingWebhook: deleteWebhookMutation.isPending,
    };
  }, [
    connectMutation,
    createWebhookMutation,
    deleteWebhookMutation,
    disconnectMutation,
    integrationsQuery.data,
    integrationsQuery.error,
    integrationsQuery.isFetching,
    integrationsQuery.isLoading,
    projectId,
    projectWebhooksQuery.data,
    projectWebhooksQuery.error,
    projectWebhooksQuery.isFetching,
    projectWebhooksQuery.isLoading,
    updateIntegrationMutation,
    updateWebhookMutation,
    userIntegrationsQuery.data,
    userIntegrationsQuery.error,
    userIntegrationsQuery.isFetching,
    userIntegrationsQuery.isLoading,
    workspaceWebhooksQuery.data,
    workspaceWebhooksQuery.error,
    workspaceWebhooksQuery.isFetching,
    workspaceWebhooksQuery.isLoading,
  ]);
}
