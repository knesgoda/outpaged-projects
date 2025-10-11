import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BOARD_ROLES,
  type BoardRole,
  type BoardMemberProfileRow,
  type BoardShareLinkRow,
  type BoardFieldVisibilityRow,
  type BoardItemPrivacyRow,
  fetchBoardMembership,
  fetchBoardMembersWithProfiles,
  fetchBoardShareLinks,
  fetchBoardFieldVisibility,
  fetchBoardItemPrivacy,
  upsertBoardMember,
  removeBoardMember,
  updateFieldVisibility,
  setItemPrivacy,
  removeItemPrivacy,
  createBoardShareLink,
  updateBoardShareLink,
  revokeBoardShareLink,
  roleAtLeast,
  type ShareLinkInput,
  type UpdateShareLinkOptions,
  type UpsertBoardMemberOptions,
  type SetItemPrivacyOptions,
  type UpdateFieldVisibilityOptions,
} from "@/services/boards/boardGovernanceService";

const MEMBERSHIP_KEY = (boardId?: string) => ["board", boardId, "membership"] as const;
const MEMBERS_KEY = (boardId?: string) => ["board", boardId, "members"] as const;
const FIELD_VISIBILITY_KEY = (boardId?: string) => ["board", boardId, "field-visibility"] as const;
const ITEM_PRIVACY_KEY = (boardId?: string) => ["board", boardId, "item-privacy"] as const;
const SHARE_LINKS_KEY = (boardId?: string) => ["board", boardId, "share-links"] as const;

export interface BoardPermissions {
  role: BoardRole;
  permissions: {
    canView: boolean;
    canComment: boolean;
    canEditItems: boolean;
    canConfigureStructure: boolean;
    canManageMembers: boolean;
    canManagePrivacy: boolean;
    canManageShareLinks: boolean;
    canViewAudit: boolean;
  };
  members: BoardMemberProfileRow[];
  shareLinks: BoardShareLinkRow[];
  fieldVisibility: BoardFieldVisibilityRow[];
  itemPrivacy: BoardItemPrivacyRow[];
  hiddenFields: string[];
  restrictedItemIds: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  actions: {
    inviteOrUpdateMember: (options: UpsertBoardMemberOptions) => Promise<void>;
    removeMember: (userId: string) => Promise<void>;
    updateFieldVisibility: (options: UpdateFieldVisibilityOptions) => Promise<void>;
    setItemPrivacy: (options: SetItemPrivacyOptions) => Promise<void>;
    removeItemPrivacy: (itemId: string) => Promise<void>;
    createShareLink: (input: ShareLinkInput) => Promise<void>;
    updateShareLink: (options: UpdateShareLinkOptions) => Promise<void>;
    revokeShareLink: (id: string) => Promise<void>;
  };
}

export function useBoardPermissions(boardId?: string): BoardPermissions {
  const queryClient = useQueryClient();

  const membershipQuery = useQuery({
    queryKey: MEMBERSHIP_KEY(boardId),
    enabled: !!boardId,
    queryFn: async () => {
      if (!boardId) return null;
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return null;
      return fetchBoardMembership(boardId, userId);
    },
  });

  const role = membershipQuery.data?.role ?? ("guest" as BoardRole);

  const permissions = useMemo(
    () => ({
      canView: roleAtLeast(role, "guest"),
      canComment: roleAtLeast(role, "commenter"),
      canEditItems: roleAtLeast(role, "editor"),
      canConfigureStructure: roleAtLeast(role, "editor"),
      canManageMembers: roleAtLeast(role, "manager"),
      canManagePrivacy: roleAtLeast(role, "manager"),
      canManageShareLinks: roleAtLeast(role, "manager"),
      canViewAudit: roleAtLeast(role, "manager"),
    }),
    [role]
  );

  const membersQuery = useQuery({
    queryKey: MEMBERS_KEY(boardId),
    enabled: !!boardId && roleAtLeast(role, "viewer"),
    queryFn: () => fetchBoardMembersWithProfiles(boardId!),
  });

  const fieldVisibilityQuery = useQuery({
    queryKey: FIELD_VISIBILITY_KEY(boardId),
    enabled: !!boardId && roleAtLeast(role, "viewer"),
    queryFn: () => fetchBoardFieldVisibility(boardId!),
  });

  const itemPrivacyQuery = useQuery({
    queryKey: ITEM_PRIVACY_KEY(boardId),
    enabled: !!boardId && roleAtLeast(role, "commenter"),
    queryFn: () => fetchBoardItemPrivacy(boardId!),
  });

  const shareLinksQuery = useQuery({
    queryKey: SHARE_LINKS_KEY(boardId),
    enabled: !!boardId && roleAtLeast(role, "viewer"),
    queryFn: () => fetchBoardShareLinks(boardId!),
  });

  const inviteMutation = useMutation({
    mutationFn: upsertBoardMember,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MEMBERS_KEY(boardId) }),
        queryClient.invalidateQueries({ queryKey: MEMBERSHIP_KEY(boardId) }),
      ]);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) => removeBoardMember(boardId!, userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: MEMBERS_KEY(boardId) }),
        queryClient.invalidateQueries({ queryKey: MEMBERSHIP_KEY(boardId) }),
      ]);
    },
  });

  const updateFieldVisibilityMutation = useMutation({
    mutationFn: updateFieldVisibility,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FIELD_VISIBILITY_KEY(boardId) });
    },
  });

  const setItemPrivacyMutation = useMutation({
    mutationFn: setItemPrivacy,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ITEM_PRIVACY_KEY(boardId) });
    },
  });

  const removeItemPrivacyMutation = useMutation({
    mutationFn: (itemId: string) => removeItemPrivacy(boardId!, itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ITEM_PRIVACY_KEY(boardId) });
    },
  });

  const createShareLinkMutation = useMutation({
    mutationFn: (input: ShareLinkInput) => createBoardShareLink(boardId!, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHARE_LINKS_KEY(boardId) });
    },
  });

  const updateShareLinkMutation = useMutation({
    mutationFn: updateBoardShareLink,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHARE_LINKS_KEY(boardId) });
    },
  });

  const revokeShareLinkMutation = useMutation({
    mutationFn: (id: string) => revokeBoardShareLink(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SHARE_LINKS_KEY(boardId) });
    },
  });

  const fieldVisibility = fieldVisibilityQuery.data ?? [];
  const hiddenFields = useMemo(
    () => fieldVisibility.filter((row) => row.hidden_for_roles?.includes(role)).map((row) => row.field_key),
    [fieldVisibility, role]
  );

  const itemPrivacy = itemPrivacyQuery.data ?? [];
  const restrictedItemIds = useMemo(
    () =>
      itemPrivacy
        .filter((row) => !roleAtLeast(role, row.visibility))
        .map((row) => row.item_id),
    [itemPrivacy, role]
  );

  const shareLinks = shareLinksQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_KEY(boardId) }),
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY(boardId) }),
      queryClient.invalidateQueries({ queryKey: FIELD_VISIBILITY_KEY(boardId) }),
      queryClient.invalidateQueries({ queryKey: ITEM_PRIVACY_KEY(boardId) }),
      queryClient.invalidateQueries({ queryKey: SHARE_LINKS_KEY(boardId) }),
    ]);
  };

  return {
    role,
    permissions,
    members,
    shareLinks,
    fieldVisibility,
    itemPrivacy,
    hiddenFields,
    restrictedItemIds,
    isLoading:
      membershipQuery.isLoading ||
      membersQuery.isLoading ||
      fieldVisibilityQuery.isLoading ||
      itemPrivacyQuery.isLoading ||
      shareLinksQuery.isLoading,
    refresh,
    actions: {
      inviteOrUpdateMember: async (options: UpsertBoardMemberOptions) => inviteMutation.mutateAsync(options),
      removeMember: async (userId: string) => removeMemberMutation.mutateAsync({ userId }),
      updateFieldVisibility: async (options: UpdateFieldVisibilityOptions) =>
        updateFieldVisibilityMutation.mutateAsync(options),
      setItemPrivacy: async (options: SetItemPrivacyOptions) => setItemPrivacyMutation.mutateAsync(options),
      removeItemPrivacy: async (itemId: string) => removeItemPrivacyMutation.mutateAsync(itemId),
      createShareLink: async (input: ShareLinkInput) => createShareLinkMutation.mutateAsync(input),
      updateShareLink: async (options: UpdateShareLinkOptions) => updateShareLinkMutation.mutateAsync(options),
      revokeShareLink: async (id: string) => revokeShareLinkMutation.mutateAsync(id),
    },
  };
}

export { BOARD_ROLES };
