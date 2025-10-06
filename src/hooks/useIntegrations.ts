import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  connectIntegration,
  createWebhook,
  deleteWebhook,
  disconnectIntegration,
  listIntegrations,
  listUserIntegrations,
  listWebhooks,
  updateUserIntegration,
  updateWebhook,
} from "@/services/integrations";
import type { Integration, UserIntegration, Webhook } from "@/types";
import { useToast } from "@/hooks/use-toast";

const INTEGRATIONS_KEY = ["integrations"] as const;

const userIntegrationsKey = (params: { projectId?: string | null } = {}) => [
  "user-integrations",
  params.projectId ?? "all",
];

const webhooksKey = (projectId: string | null | "all") => ["webhooks", projectId];

export function useIntegrationsCatalog() {
  return useQuery<Integration[]>({
    queryKey: INTEGRATIONS_KEY,
    queryFn: () => listIntegrations(),
    staleTime: 5 * 60_000,
  });
}

export function useUserIntegrations(params: { projectId?: string | null } = {}) {
  return useQuery<UserIntegration[]>({
    queryKey: userIntegrationsKey(params),
    queryFn: () => listUserIntegrations(params),
    staleTime: 60_000,
  });
}

export function useWebhooks(projectId?: string | null) {
  const normalized = projectId === undefined ? "all" : projectId ?? null;
  return useQuery<Webhook[]>({
    queryKey: webhooksKey(normalized),
    queryFn: () => listWebhooks(projectId === undefined ? undefined : projectId ?? null),
    staleTime: 30_000,
  });
}

export function useConnectIntegrationMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: connectIntegration,
    onSuccess: (data, variables) => {
      queryClient.setQueryData<UserIntegration[]>(userIntegrationsKey({ projectId: variables.projectId ?? null }), (current = []) => [
        data,
        ...current,
      ]);
      toast({ title: "Integration connected" });
    },
    onError: (error) => {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Unable to connect right now.",
        variant: "destructive",
      });
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: userIntegrationsKey({ projectId: variables?.projectId ?? null }) });
    },
  });
}

export function useDisconnectIntegrationMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id }: { id: string; projectId?: string | null }) => disconnectIntegration(id),
    onSuccess: (_void, variables) => {
      queryClient.setQueryData<UserIntegration[]>(userIntegrationsKey({ projectId: variables.projectId ?? null }), (current = []) =>
        current.filter((item) => item.id !== variables.id)
      );
      toast({ title: "Integration removed" });
    },
    onError: (error) => {
      toast({
        title: "Disconnect failed",
        description: error instanceof Error ? error.message : "Unable to disconnect right now.",
        variant: "destructive",
      });
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: userIntegrationsKey({ projectId: variables?.projectId ?? null }) });
    },
  });
}

export function useUpdateIntegrationMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<UserIntegration, "display_name" | "access_data">> }) =>
      updateUserIntegration(id, patch),
    onSuccess: (data) => {
      queryClient.setQueryData<UserIntegration[]>(userIntegrationsKey({ projectId: data.project_id ?? null }), (current = []) =>
        current.map((item) => (item.id === data.id ? data : item))
      );
      toast({ title: "Integration updated" });
      queryClient.invalidateQueries({ queryKey: userIntegrationsKey({ projectId: data.project_id ?? null }) });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update right now.",
        variant: "destructive",
      });
    },
  });
}

export function useCreateWebhookMutation(projectId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createWebhook,
    onSuccess: (data) => {
      queryClient.setQueryData<Webhook[]>(webhooksKey(projectId === undefined ? "all" : projectId ?? null), (current = []) => [
        data,
        ...current,
      ]);
      toast({ title: "Webhook created" });
    },
    onError: (error) => {
      toast({
        title: "Create failed",
        description: error instanceof Error ? error.message : "Unable to create webhook.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: webhooksKey(projectId === undefined ? "all" : projectId ?? null) });
    },
  });
}

export function useUpdateWebhookMutation(projectId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Webhook, "target_url" | "secret" | "active">> }) =>
      updateWebhook(id, patch),
    onSuccess: (data) => {
      const scope = projectId === undefined ? "all" : projectId ?? data.project_id ?? null;
      queryClient.setQueryData<Webhook[]>(webhooksKey(scope), (current = []) =>
        current.map((item) => (item.id === data.id ? data : item))
      );
      toast({ title: "Webhook updated" });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update webhook.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: webhooksKey(projectId === undefined ? "all" : projectId ?? null) });
    },
  });
}

export function useDeleteWebhookMutation(projectId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: (_void, id) => {
      queryClient.setQueryData<Webhook[]>(webhooksKey(projectId === undefined ? "all" : projectId ?? null), (current = []) =>
        current.filter((item) => item.id !== id)
      );
      toast({ title: "Webhook deleted" });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete webhook.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: webhooksKey(projectId === undefined ? "all" : projectId ?? null) });
    },
  });
}
