import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectIntegration as connectIntegrationService,
  disconnectIntegration as disconnectIntegrationService,
  listIntegrations,
  listUserIntegrations,
  updateIntegrationConfig as updateIntegrationConfigService,
  type IntegrationRecord,
} from "@/services/integrations";
import type { IntegrationKey, UserIntegration } from "@/types";

const integrationsKey = ["integrations"] as const;
const userIntegrationsKey = (projectId?: string | null) => [
  "user-integrations",
  projectId ?? "workspace",
];

type UseIntegrationsResult = {
  integrations: IntegrationRecord[];
  userIntegrations: UserIntegration[];
  isLoading: boolean;
  isRefreshing: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isUpdatingConfig: boolean;
  connectIntegration: (
    input: Parameters<typeof connectIntegrationService>[0]
  ) => Promise<UserIntegration>;
  disconnectIntegration: (id: string) => Promise<void>;
  updateIntegrationConfig: (
    key: IntegrationKey,
    patch: any
  ) => Promise<void>;
};

export function useIntegrations(projectId?: string | null): UseIntegrationsResult {
  const queryClient = useQueryClient();

  const integrationsQuery = useQuery({
    queryKey: integrationsKey,
    queryFn: listIntegrations,
    staleTime: 1000 * 30,
  });

  const userIntegrationsQuery = useQuery({
    queryKey: userIntegrationsKey(projectId ?? null),
    queryFn: () => listUserIntegrations({ projectId: projectId ?? undefined }),
    staleTime: 1000 * 10,
  });

  const connectMutation = useMutation({
    mutationFn: connectIntegrationService,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: userIntegrationsKey(projectId ?? null) }),
        queryClient.invalidateQueries({ queryKey: userIntegrationsKey(variables.projectId ?? null) }),
      ]);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectIntegrationService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userIntegrationsKey(projectId ?? null) });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ key, patch }: { key: IntegrationKey; patch: any }) =>
      updateIntegrationConfigService(key, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationsKey });
    },
  });

  return useMemo(
    () => ({
      integrations: integrationsQuery.data ?? [],
      userIntegrations: userIntegrationsQuery.data ?? [],
      isLoading: integrationsQuery.isLoading || userIntegrationsQuery.isLoading,
      isRefreshing: integrationsQuery.isFetching || userIntegrationsQuery.isFetching,
      isConnecting: connectMutation.isPending,
      isDisconnecting: disconnectMutation.isPending,
      isUpdatingConfig: updateConfigMutation.isPending,
      connectIntegration: async (input) =>
        connectMutation.mutateAsync({ ...input, projectId: input.projectId ?? projectId ?? null }),
      disconnectIntegration: (id: string) => disconnectMutation.mutateAsync(id),
      updateIntegrationConfig: (key, patch) =>
        updateConfigMutation.mutateAsync({ key, patch }),
    }),
    [
      connectMutation,
      disconnectMutation,
      integrationsQuery.data,
      integrationsQuery.isFetching,
      integrationsQuery.isLoading,
      projectId,
      updateConfigMutation,
      userIntegrationsQuery.data,
      userIntegrationsQuery.isFetching,
      userIntegrationsQuery.isLoading,
    ]
  );
}
