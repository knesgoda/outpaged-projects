import { useQuery } from "@tanstack/react-query";
import { searchAll } from "@/services/search";
import type { CrossReferenceSuggestion } from "@/components/rich-text/extensions/xref";

export function useCrossReferenceSearch(query: string, options?: { projectId?: string; enabled?: boolean }) {
  const enabled = (options?.enabled ?? true) && query.trim().length > 0;
  return useQuery({
    queryKey: ["cross-reference-search", query, options?.projectId],
    enabled,
    queryFn: async (): Promise<CrossReferenceSuggestion[]> => {
      if (!query.trim()) return [];
      const result = await searchAll({ q: query, projectId: options?.projectId, limit: 8 });
      return result.items
        .filter((item) => ["task", "project", "doc", "file", "comment"].includes(item.type))
        .map((item) => ({
          id: item.id,
          type: item.type as CrossReferenceSuggestion["type"],
          title: item.title ?? item.key ?? item.id,
          subtitle: item.snippet ?? item.description ?? undefined,
          url: item.url ?? null,
        }));
    },
  });
}
