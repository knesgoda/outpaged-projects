import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "-");
}

export async function uploadPublicImage(
  bucket: "branding" | "avatars",
  file: File,
  pathPrefix: string
): Promise<{ path: string; publicUrl: string }> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File must be 2 MB or smaller");
  }

  const extension = file.name.split(".").pop() ?? "bin";
  const fileName = `${Date.now()}.${extension}`;
  const cleanPrefix = pathPrefix.replace(/\/+$/, "");
  const path = `${cleanPrefix}/${sanitizeFileName(fileName)}`;

  const { error: uploadError } = await supabase
    .storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    throw new Error(uploadError.message ?? "Upload failed");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    throw new Error("Could not fetch public URL");
  }

  return { path, publicUrl };
}
