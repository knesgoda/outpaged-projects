import { supabase } from "@/integrations/supabase/client";
import type { ProjectFile } from "@/types";
import { getSignedUrl as getStorageSignedUrl, uploadToBucket } from "./storage";
import { escapeLikePattern, mapSupabaseError, normalizeSearchTerm, requireUserId } from "./utils";

const FILE_BUCKET = "files";
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

type ListFilesParams = {
  projectId?: string;
  q?: string;
};

const sanitizeFileName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "file";

const mapRowToFile = (row: any): ProjectFile => ({
  id: row.id,
  project_id: row.project_id,
  bucket: (row.bucket ?? FILE_BUCKET) as ProjectFile["bucket"],
  path: row.path,
  size_bytes: Number(row.size_bytes ?? 0),
  mime_type: row.mime_type ?? null,
  title: row.title ?? null,
  uploaded_by: row.uploaded_by,
  created_at: row.created_at,
});

export async function listFiles(params: ListFilesParams = {}): Promise<ProjectFile[]> {
  const { projectId, q } = params;

  let query = supabase
    .from("project_files")
    .select("id, project_id, bucket, path, size_bytes, mime_type, title, uploaded_by, created_at")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  if (q && q.trim().length > 0) {
    const term = normalizeSearchTerm(q);
    const pattern = `%${escapeLikePattern(term)}%`;
    query = query.or(`title.ilike.${pattern},path.ilike.${pattern}`);
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to load files.");
  }

  return (data ?? []).map(mapRowToFile);
}

export async function uploadFile(projectId: string, file: File): Promise<ProjectFile> {
  if (!projectId) {
    throw new Error("A project is required to upload files.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File must be smaller than 50 MB.");
  }

  const userId = await requireUserId();
  const safeName = sanitizeFileName(file.name || "file");
  const objectPath = `${projectId}/${Date.now()}-${safeName}`;

  await uploadToBucket(FILE_BUCKET, objectPath, file, { upsert: true });

  const { data, error } = await supabase
    .from("project_files")
    .insert({
      project_id: projectId,
      bucket: FILE_BUCKET,
      path: objectPath,
      size_bytes: file.size,
      mime_type: file.type || null,
      title: file.name || safeName,
      uploaded_by: userId,
    })
    .select("id, project_id, bucket, path, size_bytes, mime_type, title, uploaded_by, created_at")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to save file metadata.");
  }

  return mapRowToFile(data);
}

export async function getSignedUrl(file: ProjectFile, expiresIn = 60): Promise<string> {
  return getStorageSignedUrl(file.bucket, file.path, expiresIn);
}

export async function renameFile(id: string, newTitle: string): Promise<ProjectFile> {
  const title = newTitle.trim();

  const { data, error } = await supabase
    .from("project_files")
    .update({ title: title.length > 0 ? title : null })
    .eq("id", id)
    .select("id, project_id, bucket, path, size_bytes, mime_type, title, uploaded_by, created_at")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to rename file.");
  }

  return mapRowToFile(data);
}

export async function deleteFile(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("project_files")
    .select("bucket, path")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to locate file.");
  }

  const file = data as { bucket?: string | null; path?: string | null } | null;
  const bucket = (file?.bucket ?? FILE_BUCKET) as string;
  const path = file?.path;

  if (path) {
    const { error: storageError } = await supabase.storage.from(bucket).remove([path]);

    if (storageError) {
      throw mapSupabaseError(storageError, "Unable to delete file from storage.");
    }
  }

  const { error: deleteError } = await supabase.from("project_files").delete().eq("id", id);

  if (deleteError) {
    throw mapSupabaseError(deleteError, "Unable to delete file record.");
  }
}
