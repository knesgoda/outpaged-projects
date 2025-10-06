import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export async function uploadToBucket(
  bucket: string,
  path: string,
  file: File,
  opts?: { upsert?: boolean }
): Promise<{ path: string }> {
  if (!supabaseConfigured) {
    throw new Error("Storage is not available. Configure Supabase first.");
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: opts?.upsert ?? false,
      cacheControl: "3600",
    });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Upload failed with no response.");
  }

  return { path: data.path };
}

export async function getPublicOrSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 60 * 60
): Promise<string> {
  if (!supabaseConfigured) {
    throw new Error("Storage is not available. Configure Supabase first.");
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.signedUrl) {
    throw new Error("Unable to create signed URL.");
  }

  return data.signedUrl;
}
