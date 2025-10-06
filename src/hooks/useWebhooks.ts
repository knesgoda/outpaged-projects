import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createWebhook, deleteWebhook, listWebhooks, updateWebhook } from "@/services/webhooks";
import type { Webhook } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const WEBHOOKS_QUERY_KEY = ["admin", "webhooks"] as const;

export function useWebhooks() {
  return useQuery({
    queryKey: WEBHOOKS_QUERY_KEY,
    queryFn: listWebhooks,
    staleTime: 1000 * 30,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createWebhook,
    onSuccess: (webhook: Webhook) => {
      queryClient.setQueryData<Webhook[]>(WEBHOOKS_QUERY_KEY, (previous) => [webhook, ...(previous ?? [])]);
      toast({ title: "Webhook added", description: "We will send events to this URL." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to create webhook.";
      toast({ title: "Create failed", description: message, variant: "destructive" });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<{ target_url: string; secret?: string; active?: boolean }> }) =>
      updateWebhook(id, patch),
    onSuccess: (webhook: Webhook) => {
      queryClient.setQueryData<Webhook[]>(WEBHOOKS_QUERY_KEY, (previous) => {
        if (!previous) return [webhook];
        return previous.map((item) => (item.id === webhook.id ? webhook : item));
      });
      toast({ title: "Webhook updated", description: "Settings saved." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to update webhook.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: (_, id) => {
      queryClient.setQueryData<Webhook[]>(WEBHOOKS_QUERY_KEY, (previous) => {
        if (!previous) return [];
        return previous.filter((item) => item.id !== id);
      });
      toast({ title: "Webhook removed", description: "We will stop sending events." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to delete webhook.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    },
  });
}
