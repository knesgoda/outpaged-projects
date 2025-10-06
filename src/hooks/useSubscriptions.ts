import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSubscriptions,
  toggleSubscription,
} from "@/services/subscriptions";
import type { Subscription } from "@/types";

export type SubscriptionEntityRef = {
  type: Subscription["entity_type"];
  id: string;
};

const QUERY_KEY = ["notification-subscriptions"] as const;

export function useSubscriptions() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listSubscriptions,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const subscriptions = data ?? [];

  const isFollowing = useCallback(
    (entity: SubscriptionEntityRef) =>
      subscriptions.some(
        (subscription) =>
          subscription.entity_id === entity.id &&
          subscription.entity_type === entity.type
      ),
    [subscriptions]
  );

  const mutation = useMutation({
    mutationFn: (entity: SubscriptionEntityRef) => toggleSubscription(entity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    subscriptions,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    isFollowing,
    toggleSubscription: mutation.mutateAsync,
    isToggling: mutation.isPending,
  };
}
