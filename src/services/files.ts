import { supabase } from "@/integrations/supabase/client";
import type { ProjectFile } from "@/types";
import { uploadToBucket, getSignedUrl as getStorageSignedUrl } from "./storage";

const FILE_BUCKET = "files";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function sanitizeSearchTerm(term: string) {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  const user = data?.user;
  if (!user) {
    throw new Error("You must be signed in to upload files");
  }

  return user.id;
}

export async function listFiles(params: { projectId?: string; q?: string } = {}): Promise<ProjectFile[]> {
  let query = supabase
    .from("project_files")
    .select("*")
    .order("created_at", { ascending: false });

  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  if (params.projectId === null) {
    query = query.is("project_id", null);
  }

  if (params.q) {
    const sanitized = sanitizeSearchTerm(params.q.trim());
    if (sanitized) {
      query = query.or(
        `title.ilike.%${sanitized}%,path.ilike.%${sanitized}%`
      );
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as ProjectFile[];
}

function buildStoragePath(projectId: string, name: string) {
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${projectId}/${Date.now()}-${safeName}`;
}

export async function uploadFile(projectId: string, file: File): Promise<ProjectFile> {
  if (!projectId) {
    throw new Error("projectId is required to upload a file");
  }

  if (!file) {
    throw new Error("File is required");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds 50 MB limit");
  }

  // TODO: Integrate antivirus scanning before persisting uploaded files.
  const uploadedBy = await requireUserId();
  const storagePath = buildStoragePath(projectId, file.name);
  await uploadToBucket(FILE_BUCKET, storagePath, file, { upsert: true });

  const { data, error } = await supabase
    .from("project_files")
    .insert({
      project_id: projectId,
      path: storagePath,
      size_bytes: file.size,
      mime_type: file.type || null,
      title: file.name,
      uploaded_by: uploadedBy,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to save file metadata");
  }

  return data as ProjectFile;
}

export async function getSignedUrl(file: ProjectFile, expiresIn = 600): Promise<string> {
  return getStorageSignedUrl(file.bucket, file.path, expiresIn);
}

export async function renameFile(id: string, newTitle: string): Promise<ProjectFile> {
  const title = newTitle.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const { data, error } = await supabase
    .from("project_files")
    .update({ title })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("File not found");
  }

  return data as ProjectFile;
}

export async function deleteFile(id: string): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from("project_files")
    .select("bucket, path")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  if (!existing) {
    return;
  }

  const bucket = (existing as { bucket: string; path: string }).bucket ?? FILE_BUCKET;
  const path = (existing as { bucket: string; path: string }).path;

  const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
  if (storageError) {
    throw storageError;
  }

  const { error: deleteError } = await supabase.from("project_files").delete().eq("id", id);
  if (deleteError) {
    throw deleteError;
  }
}
