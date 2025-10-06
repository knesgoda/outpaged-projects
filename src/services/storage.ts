import { supabase } from "@/integrations/supabase/client";

export async function uploadDocImage(file: File, userId: string): Promise<{ publicUrl: string }> {
  if (!file) {
    throw new Error("File is required");
  }

  const bucket = "docs";
  const fileName = `${Date.now()}-${file.name}`.replace(/\s+/g, "-");
  const path = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Failed to upload image", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Could not resolve public URL for image");
  }

  return { publicUrl: data.publicUrl };
}
