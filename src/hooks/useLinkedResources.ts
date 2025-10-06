import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addLinkedResource,
  listLinkedResources,
  removeLinkedResource,
} from "@/services/linkedResources";
import type { LinkedResource } from "@/types";

const linkedResourcesKey = (entity: {
  type: LinkedResource["entity_type"];
  id: string;
}) => ["linked-resources", entity.type, entity.id] as const;

type UseLinkedResourcesInput = {
  type: LinkedResource["entity_type"];
  id: string;
};

type UseLinkedResourcesResult = {
  resources: LinkedResource[];
  isLoading: boolean;
  isRefreshing: boolean;
  addResource: (
    input: Omit<LinkedResource, "id" | "created_at" | "created_by">
  ) => Promise<LinkedResource>;
  removeResource: (id: string) => Promise<void>;
};

export function useLinkedResources(
  entity: UseLinkedResourcesInput
): UseLinkedResourcesResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: linkedResourcesKey(entity),
    queryFn: () => listLinkedResources({ type: entity.type, id: entity.id }),
    enabled: Boolean(entity.id),
    staleTime: 1000 * 5,
  });

  const addMutation = useMutation({
    mutationFn: addLinkedResource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: linkedResourcesKey(entity) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeLinkedResource,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: linkedResourcesKey(entity) });
    },
  });

  return useMemo(
    () => ({
      resources: query.data ?? [],
      isLoading: query.isLoading,
      isRefreshing: query.isFetching,
      addResource: (input) => addMutation.mutateAsync(input),
      removeResource: (id) => removeMutation.mutateAsync(id),
    }),
    [addMutation, query.data, query.isFetching, query.isLoading, removeMutation]
  );
}
