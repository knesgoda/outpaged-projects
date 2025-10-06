import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} from "@/services/profile";
import type { Profile } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const PROFILE_QUERY_KEY = ["profile", "me"] as const;

export function useMyProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getMyProfile,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (profile: Profile) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, profile);
      toast({
        title: "Profile saved",
        description: "Your profile has been updated.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to save profile.";
      toast({
        title: "Update failed",
        description: message,
        variant: "destructive",
      });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: uploadMyAvatar,
    onSuccess: (url: string) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, (old: Profile | null | undefined) =>
        old ? { ...old, avatar_url: url, updated_at: new Date().toISOString() } : old ?? null
      );
      toast({
        title: "Avatar updated",
        description: "Your profile photo is live.",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not upload avatar.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
