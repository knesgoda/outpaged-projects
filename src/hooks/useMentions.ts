import { useQuery } from '@tanstack/react-query';
import { searchTeammates } from '@/services/people';

const MENTION_CACHE_TIME = 1000 * 60;

type Options = {
  projectId?: string;
};

export function useMentionSearch(query: string, options: Options = {}) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['mentions', trimmed, options.projectId],
    queryFn: () => searchTeammates({ q: trimmed, projectId: options.projectId }),
    enabled: trimmed.length > 0,
    staleTime: MENTION_CACHE_TIME,
    keepPreviousData: true,
  });
}
