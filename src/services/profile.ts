import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";
import { uploadPublicImage } from "./storage";
import { requireUserId, supabaseErrorMessage } from "./utils";

export async function getMyProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "PGRST116") {
      return null;
    }
    throw new Error(supabaseErrorMessage(error, "Could not load profile"));
  }

  return data as Profile | null;
}

export async function updateMyProfile(
  patch: Partial<Pick<Profile, "full_name" | "avatar_url">>
): Promise<Profile> {
  const userId = await requireUserId();
  const changes = {
    ...patch,
    id: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(changes, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(supabaseErrorMessage(error, "Could not update profile"));
  }

  return data as Profile;
}

export async function uploadMyAvatar(file: File): Promise<string> {
  const userId = await requireUserId();
  const { publicUrl } = await uploadPublicImage(
    "avatars",
    file,
    `avatars/${userId}`
  );

  await updateMyProfile({ avatar_url: publicUrl });
  return publicUrl;
}
