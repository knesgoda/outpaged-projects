import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CustomFieldDefinition, CustomFieldContext } from "@/domain/customFields";
import {
  buildCustomFieldDefaults,
  evaluateCustomFieldVisibility,
  listCustomFieldDefinitions,
  type ListCustomFieldDefinitionsParams,
} from "@/services/customFields";

export interface UseCustomFieldDefinitionsOptions {
  projectId?: string;
  workspaceId?: string;
  contexts?: CustomFieldContext[];
  enabled?: boolean;
}

export function useCustomFieldDefinitions({
  projectId,
  workspaceId,
  contexts,
  enabled = true,
}: UseCustomFieldDefinitionsOptions) {
  const queryParams: ListCustomFieldDefinitionsParams = {
    projectId,
    workspaceId,
    contexts,
  };

  const query = useQuery({
    queryKey: ["custom-field-definitions", queryParams],
    queryFn: () => listCustomFieldDefinitions(queryParams),
    enabled: enabled && Boolean(projectId || workspaceId),
    staleTime: 5 * 60 * 1000,
  });

  const defaults = useMemo(() => {
    if (!query.data) {
      return {} as Record<string, unknown>;
    }
    return buildCustomFieldDefaults(query.data);
  }, [query.data]);

  return {
    ...query,
    defaults,
    definitions: query.data ?? ([] as CustomFieldDefinition[]),
  };
}

export const useVisibleCustomFields = (
  definitions: CustomFieldDefinition[] | undefined,
  values: Record<string, unknown>,
) => {
  return useMemo(() => {
    if (!definitions?.length) {
      return new Set<string>();
    }
    return evaluateCustomFieldVisibility(definitions, values);
  }, [definitions, values]);
};
