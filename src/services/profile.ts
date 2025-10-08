import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";
import { requireUserId } from "@/services/utils";
import { uploadPublicImage } from "./storage";

export async function getMyProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const { data, error } = await (supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, updated_at")
    .eq("user_id", userId)
    .maybeSingle() as any);

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return (data as Profile | null) ?? null;
}

export async function updateMyProfile(
  patch: Partial<Pick<Profile, "full_name" | "avatar_url">>
): Promise<Profile> {
  const userId = await requireUserId();
  const payload = {
    user_id: userId,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id, full_name, avatar_url, updated_at")
    .single() as any);

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

export async function uploadMyAvatar(file: File): Promise<string> {
  if (!file.type?.startsWith("image/")) {
    throw new Error("Avatar must be an image.");
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Avatar must be smaller than 5 MB.");
  }

  const userId = await requireUserId();
  const { publicUrl } = await uploadPublicImage("avatars", file, `avatars/${userId}/avatar-${Date.now()}`);

  const { error: updateError } = await (supabase
    .from("profiles")
    .upsert({ user_id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: "user_id" }) as any);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return publicUrl;
}
