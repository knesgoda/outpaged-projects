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

export async function uploadToBucket(
  bucket: string,
  path: string,
  file: File,
  opts?: { upsert?: boolean }
): Promise<{ path: string }> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: opts?.upsert ?? false,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw mapSupabaseError(error, "Unable to upload file.");
  }

  return { path };
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 60): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw mapSupabaseError(error, "Unable to generate file link.");
  }

  return data.signedUrl;
}

function getImageExtension(file: File) {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName.length < 10) {
    return fromName.toLowerCase();
  }

  const fromType = file.type?.split("/").pop();
  return fromType?.toLowerCase() ?? "png";
}

export async function uploadPublicImage(
  bucket: "branding" | "avatars",
  file: File,
  pathPrefix: string
): Promise<{ path: string; publicUrl: string }> {
  if (!file.type?.startsWith("image/")) {
    throw new Error("File must be an image.");
  }

  const extension = getImageExtension(file);
  const cleanedPrefix = pathPrefix.replace(/\/+$/, "");
  const objectPath = `${cleanedPrefix}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || "image/png",
  });

  if (error) {
    throw mapSupabaseError(error, "Unable to upload file.");
  }

  const { data, error: urlError } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = data?.publicUrl;

  if (urlError || !publicUrl) {
    throw mapSupabaseError(urlError, "Unable to generate file URL.");
  }

  return { path: objectPath, publicUrl };
}
