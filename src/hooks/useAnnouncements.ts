import { useQuery } from "@tanstack/react-query";
import { listAnnouncements } from "@/services/announcements";
import type { Announcement } from "@/types";

const STALE_TIME = 1000 * 60 * 10;

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["announcements", "list"],
    queryFn: () => listAnnouncements(),
    staleTime: STALE_TIME,
  });
}
