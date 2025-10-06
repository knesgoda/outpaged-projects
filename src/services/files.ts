import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { ProjectFile } from "@/types";
import { getPublicOrSignedUrl, uploadToBucket } from "@/services/storage";

const FILES_BUCKET = "files";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to manage files.");
  }
  return userId;
}

export async function listFiles(params: {
  projectId?: string;
  q?: string;
} = {}): Promise<ProjectFile[]> {
  if (!supabaseConfigured) {
    return [];
  }

  let query = supabase
    .from("project_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params.q) {
    const safeSearch = params.q.replace(/[\\%_]/g, (char) => `\\${char}`);
    query = query.ilike("title", `%${safeSearch}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProjectFile[];
}

export async function uploadFile(projectId: string, file: File): Promise<ProjectFile> {
  if (!projectId) {
    throw new Error("Project is required for uploads.");
  }
  if (!supabaseConfigured) {
    throw new Error("Storage is not available. Configure Supabase first.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds the 50 MB limit.");
  }
  if (!file.type) {
    throw new Error("File type is required.");
  }

  const userId = await requireUserId();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${projectId}/${Date.now()}-${sanitizedName}`;

  await uploadToBucket(FILES_BUCKET, path, file, { upsert: true });

  const { data, error } = await supabase
    .from("project_files")
    .insert({
      project_id: projectId,
      bucket: FILES_BUCKET,
      path,
      size_bytes: file.size,
      mime_type: file.type || null,
      title: file.name,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProjectFile;
}

export async function getSignedUrl(
  file: ProjectFile,
  expiresIn = 60 * 60
): Promise<string> {
  return getPublicOrSignedUrl(file.bucket, file.path, expiresIn);
}

export async function renameFile(id: string, newTitle: string): Promise<ProjectFile> {
  const { data, error } = await supabase
    .from("project_files")
    .update({ title: newTitle })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProjectFile;
}

export async function deleteFile(id: string): Promise<void> {
  const { data: file, error: fetchError } = await supabase
    .from("project_files")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!file) {
    return;
  }

  const bucket = file.bucket ?? FILES_BUCKET;

  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove([file.path]);

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: deleteError } = await supabase
    .from("project_files")
    .delete()
    .eq("id", id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}
