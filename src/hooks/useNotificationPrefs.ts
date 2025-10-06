import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyNotificationPreferences,
  upsertMyNotificationPreferences,
} from "@/services/notificationPrefs";
import type { NotificationPreferences } from "@/types";

const QUERY_KEY = ["notification-preferences"] as const;

export function useNotificationPrefs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getMyNotificationPreferences,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSaveNotificationPrefs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      upsertMyNotificationPreferences(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}
