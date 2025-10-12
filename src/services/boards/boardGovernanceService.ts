// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { handleSupabaseError, requireUserId } from "@/services/utils";

export type BoardRole = Database["public"]["Enums"]["board_role"];
export type BoardMemberRow = Database["public"]["Tables"]["board_members"]["Row"];
export type BoardShareLinkRow = Database["public"]["Tables"]["board_share_links"]["Row"];
export type BoardFieldVisibilityRow = Database["public"]["Tables"]["board_field_visibility"]["Row"];
export type BoardItemPrivacyRow = Database["public"]["Tables"]["board_item_privacy"]["Row"];
export type BoardMemberProfileRow = Database["public"]["Views"]["board_members_with_profiles"]["Row"];

const ROLE_PRIORITY: Record<BoardRole, number> = {
  guest: 0,
  viewer: 1,
  commenter: 2,
  editor: 3,
  manager: 4,
  owner: 5,
};

const BOARD_ROLE_ORDER: BoardRole[] = ["owner", "manager", "editor", "commenter", "viewer", "guest"];

export function compareRoles(a: BoardRole, b: BoardRole) {
  return ROLE_PRIORITY[a] - ROLE_PRIORITY[b];
}

export function roleAtLeast(current: BoardRole, required: BoardRole) {
  return ROLE_PRIORITY[current] >= ROLE_PRIORITY[required];
}

async function hashPassword(password?: string | null) {
  if (!password) return null;
  if (typeof globalThis.crypto?.subtle === "undefined") {
    return password;
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function fetchBoardMembership(boardId: string, userId: string) {
  const { data, error } = await supabase
    .from("board_members")
    .select("*")
    .eq("board_id", boardId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    handleSupabaseError(error, "Unable to load board membership.");
  }

  return data as BoardMemberRow | null;
}

export async function fetchBoardMembersWithProfiles(boardId: string) {
  const { data, error } = await supabase
    .from("board_members_with_profiles")
    .select("*")
    .eq("board_id", boardId)
    .order("role", { ascending: false });

  if (error) {
    handleSupabaseError(error as any, "Unable to load board members.");
  }

  return (data ?? []) as BoardMemberProfileRow[];
}

export interface UpsertBoardMemberOptions {
  boardId: string;
  userId: string;
  role: BoardRole;
  invitationMessage?: string;
}

export async function upsertBoardMember({ boardId, userId, role, invitationMessage }: UpsertBoardMemberOptions) {
  const invitedBy = await requireUserId();
  const { error } = await supabase.from("board_members").upsert(
    {
      board_id: boardId,
      user_id: userId,
      role,
      invited_by: invitedBy,
      invitation_message: invitationMessage ?? null,
    },
    { onConflict: "board_id,user_id" }
  );

  if (error) {
    handleSupabaseError(error, "Unable to update board member role.");
  }
}

export async function removeBoardMember(boardId: string, userId: string) {
  const { error } = await supabase
    .from("board_members")
    .delete()
    .eq("board_id", boardId)
    .eq("user_id", userId);

  if (error) {
    handleSupabaseError(error, "Unable to remove board member.");
  }
}

export async function fetchBoardFieldVisibility(boardId: string) {
  const { data, error } = await supabase
    .from("board_field_visibility")
    .select("*")
    .eq("board_id", boardId)
    .order("field_key", { ascending: true });

  if (error) {
    handleSupabaseError(error, "Unable to load field visibility.");
  }

  return (data ?? []) as BoardFieldVisibilityRow[];
}

export interface UpdateFieldVisibilityOptions {
  boardId: string;
  fieldKey: string;
  hiddenForRoles: BoardRole[];
  isSensitive?: boolean;
}

export async function updateFieldVisibility({ boardId, fieldKey, hiddenForRoles, isSensitive }: UpdateFieldVisibilityOptions) {
  const { error } = await supabase.from("board_field_visibility").upsert(
    {
      board_id: boardId,
      field_key: fieldKey,
      hidden_for_roles: hiddenForRoles,
      is_sensitive: isSensitive ?? false,
    },
    { onConflict: "board_id,field_key" }
  );

  if (error) {
    handleSupabaseError(error, "Unable to update field visibility.");
  }
}

export async function fetchBoardItemPrivacy(boardId: string) {
  const { data, error } = await supabase
    .from("board_item_privacy")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Unable to load item privacy rules.");
  }

  return (data ?? []) as BoardItemPrivacyRow[];
}

export interface SetItemPrivacyOptions {
  boardId: string;
  itemId: string;
  visibility: BoardRole;
  reason?: string;
}

export async function setItemPrivacy({ boardId, itemId, visibility, reason }: SetItemPrivacyOptions) {
  const createdBy = await requireUserId();
  const { error } = await supabase.from("board_item_privacy").upsert(
    {
      board_id: boardId,
      item_id: itemId,
      visibility,
      reason: reason ?? null,
      created_by: createdBy,
    },
    { onConflict: "board_id,item_id" }
  );

  if (error) {
    handleSupabaseError(error, "Unable to update item privacy.");
  }
}

export async function removeItemPrivacy(boardId: string, itemId: string) {
  const { error } = await supabase
    .from("board_item_privacy")
    .delete()
    .eq("board_id", boardId)
    .eq("item_id", itemId);

  if (error) {
    handleSupabaseError(error, "Unable to remove item privacy rule.");
  }
}

export interface ShareLinkInput {
  allowedRole: BoardRole;
  expiresAt?: string | null;
  maxUses?: number | null;
  password?: string | null;
}

export async function fetchBoardShareLinks(boardId: string) {
  const { data, error } = await supabase
    .from("board_share_links")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Unable to load share links.");
  }

  return (data ?? []) as BoardShareLinkRow[];
}

function generateShareSlug() {
  return Math.random().toString(36).substring(2, 10);
}

export async function createBoardShareLink(boardId: string, input: ShareLinkInput) {
  const createdBy = await requireUserId();
  const password_hash = await hashPassword(input.password);

  const { error } = await supabase.from("board_share_links").insert({
    board_id: boardId,
    slug: generateShareSlug(),
    created_by: createdBy,
    allowed_role: input.allowedRole,
    expires_at: input.expiresAt ?? null,
    max_uses: input.maxUses ?? null,
    password_hash,
  });

  if (error) {
    handleSupabaseError(error, "Unable to create share link.");
  }
}

export interface UpdateShareLinkOptions {
  id: string;
  allowedRole?: BoardRole;
  expiresAt?: string | null;
  maxUses?: number | null;
  password?: string | null;
  revokedAt?: string | null;
}

export async function updateBoardShareLink({ id, allowedRole, expiresAt, maxUses, password, revokedAt }: UpdateShareLinkOptions) {
  const payload: Partial<BoardShareLinkRow> = {};
  if (allowedRole) payload.allowed_role = allowedRole;
  if (typeof expiresAt !== "undefined") payload.expires_at = expiresAt;
  if (typeof maxUses !== "undefined") payload.max_uses = maxUses;
  if (typeof revokedAt !== "undefined") payload.revoked_at = revokedAt;
  if (typeof password !== "undefined") {
    payload.password_hash = await hashPassword(password);
  }

  const { error } = await supabase
    .from("board_share_links")
    .update(payload)
    .eq("id", id);

  if (error) {
    handleSupabaseError(error, "Unable to update share link.");
  }
}

export async function revokeBoardShareLink(id: string) {
  const now = new Date().toISOString();
  await updateBoardShareLink({ id, revokedAt: now });
}

export const BOARD_ROLES = BOARD_ROLE_ORDER;
