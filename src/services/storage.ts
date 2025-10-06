import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseError } from "./utils";

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadHelpScreenshot(file: File, userId: string): Promise<{ publicUrl: string }> {
  if (file.size > MAX_SCREENSHOT_SIZE) {
    throw new Error("Screenshot must be smaller than 5 MB.");
  }

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectPath = `${userId}/${Date.now()}-${sanitizedName}`;

  const { error } = await supabase.storage.from("help").upload(objectPath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw mapSupabaseError(error, "Unable to upload the screenshot.");
  }

  const { data } = supabase.storage.from("help").getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    throw new Error("Unable to resolve the screenshot URL.");
  }

  return { publicUrl };
}
