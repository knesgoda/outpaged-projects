import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types";
import { requireUserId } from "@/services/utils";

export async function getMyProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, title, department, timezone, capacity_hours_per_week, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return (data as Profile | null) ?? null;
}

export async function updateMyProfile(
  patch: Partial<
    Pick<
      Profile,
      | "full_name"
      | "avatar_url"
      | "title"
      | "department"
      | "timezone"
      | "capacity_hours_per_week"
    >
  >
): Promise<Profile> {
  const userId = await requireUserId();
  const payload = {
    id: userId,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, full_name, avatar_url, title, department, timezone, capacity_hours_per_week, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Profile;
}

function getExtension(file: File) {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName.length < 10) {
    return fromName;
  }
  const fromType = file.type?.split("/").pop();
  return fromType ?? "png";
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
  const extension = getExtension(file);
  const filePath = `avatars/${userId}/avatar-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;
  if (!publicUrl) {
    throw new Error("Failed to generate avatar URL.");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: "id" });

  if (updateError) {
    throw new Error(updateError.message);
  }

  return publicUrl;
}
