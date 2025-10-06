import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWorkspaceSettings,
  listMembers,
  removeMember,
  setMemberRole,
  upsertWorkspaceSettings,
  uploadBrandLogo,
} from "@/services/settings";
import type { WorkspaceMember, WorkspaceSettings } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const SETTINGS_KEY = ["workspace", "settings"] as const;
const MEMBERS_KEY = ["workspace", "members"] as const;

export function useWorkspaceSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: getWorkspaceSettings,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: upsertWorkspaceSettings,
    onSuccess: (settings: WorkspaceSettings) => {
      queryClient.setQueryData(SETTINGS_KEY, settings);
      toast({ title: "Workspace saved", description: "Changes are live for your team." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to save workspace settings.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    },
  });
}

export function useUploadBrandLogo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: uploadBrandLogo,
    onSuccess: (url: string) => {
      queryClient.setQueryData(SETTINGS_KEY, (old: WorkspaceSettings | null | undefined) =>
        old ? { ...old, brand_logo_url: url, updated_at: new Date().toISOString() } : old ?? null
      );
      toast({ title: "Logo updated", description: "Your branding now appears across the workspace." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to upload logo.";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: listMembers,
    staleTime: 1000 * 30,
  });
}

export function useSetMemberRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: WorkspaceMember["role"] }) =>
      setMemberRole(userId, role),
    onSuccess: () => {
      toast({ title: "Role updated", description: "Permissions refreshed for this member." });
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to update role.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      toast({ title: "Member removed", description: "They no longer have access." });
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to remove member.";
      toast({ title: "Remove failed", description: message, variant: "destructive" });
    },
  });
}
