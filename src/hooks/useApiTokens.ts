import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiToken, listApiTokens, revokeApiToken } from "@/services/apiTokens";
import type { ApiToken } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const TOKENS_QUERY_KEY = ["admin", "api", "tokens"] as const;

export function useApiTokens() {
  return useQuery({
    queryKey: TOKENS_QUERY_KEY,
    queryFn: listApiTokens,
    staleTime: 1000 * 30,
  });
}

export function useCreateApiToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createApiToken,
    onSuccess: ({ tokenRow }: { token: string; tokenRow: ApiToken }) => {
      queryClient.setQueryData<ApiToken[]>(TOKENS_QUERY_KEY, (previous) => {
        const list = previous ?? [];
        return [tokenRow, ...list];
      });
      toast({
        title: "Token created",
        description: "Copy the token now. You will not see it again.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to create token.";
      toast({ title: "Token creation failed", description: message, variant: "destructive" });
    },
  });
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: revokeApiToken,
    onSuccess: (_, id) => {
      queryClient.setQueryData<ApiToken[]>(TOKENS_QUERY_KEY, (previous) => {
        if (!previous) {
          return previous ?? [];
        }
        return previous.map((token) =>
          token.id === id ? { ...token, revoked_at: new Date().toISOString() } : token
        );
      });
      toast({ title: "Token revoked", description: "The token can no longer be used." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to revoke token.";
      toast({ title: "Revoke failed", description: message, variant: "destructive" });
    },
  });
}
