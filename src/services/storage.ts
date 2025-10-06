import { supabase } from "@/integrations/supabase/client";

export async function uploadToBucket(
  bucket: string,
  path: string,
  file: File,
  opts?: { upsert?: boolean }
): Promise<{ path: string }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: opts?.upsert ?? false,
      cacheControl: "3600",
      contentType: file.type || undefined,
    });

  if (error) {
    throw error;
  }

  if (!data?.path) {
    throw new Error("Upload did not return a file path");
  }

  return { path: data.path };
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  if (!data?.signedUrl) {
    throw new Error("Signed URL is unavailable");
  }

  return data.signedUrl;
}
