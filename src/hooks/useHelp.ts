import { useQuery } from "@tanstack/react-query";

export function useHelpSearch(_query: string, _options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["help", "search"],
    queryFn: async () => [],
    enabled: false,
  });
}

export function useHelpArticles(_params?: any) {
  return useQuery({
    queryKey: ["help", "articles"],
    queryFn: async () => [],
  });
}

export function useHelpArticle(_slug: string | null | undefined) {
  return useQuery({
    queryKey: ["help", "article"],
    queryFn: async () => null,
    enabled: false,
  });
}
