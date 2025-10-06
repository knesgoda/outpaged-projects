import { useQuery } from "@tanstack/react-query";
import { getHelpArticleBySlug, listHelpArticles, searchHelp } from "@/services/help";
import type { HelpArticle } from "@/types";

const STALE_TIME = 1000 * 60 * 5;

export function useHelpSearch(query: string, options?: { enabled?: boolean }) {
  const trimmed = query.trim();

  return useQuery<HelpArticle[]>({
    queryKey: ["help", "search", trimmed],
    queryFn: () => searchHelp(trimmed),
    enabled: Boolean(trimmed) && (options?.enabled ?? true),
    staleTime: 1000 * 60,
  });
}

export function useHelpArticles(params?: {
  category?: string;
  q?: string;
  limit?: number;
}) {
  return useQuery<HelpArticle[]>({
    queryKey: ["help", "articles", params],
    queryFn: () => listHelpArticles(params),
    staleTime: STALE_TIME,
  });
}

export function useHelpArticle(slug: string | null | undefined) {
  const normalized = slug?.trim();

  return useQuery<HelpArticle | null>({
    queryKey: ["help", "article", normalized],
    queryFn: () => getHelpArticleBySlug(normalized ?? ""),
    enabled: Boolean(normalized),
    staleTime: STALE_TIME,
  });
}
