// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { uploadTaskAttachment } from "@/services/storage";
import { mapSupabaseError } from "@/services/utils";

interface PersistTaskFilesOptions {
  taskId: string;
  files: File[];
  userId: string;
}

export interface PersistedTaskFile {
  id: string;
  file_url: string;
  file_name?: string | null;
}

export async function persistTaskFiles({
  taskId,
  files,
  userId,
}: PersistTaskFilesOptions): Promise<PersistedTaskFile[]> {
  if (!taskId || files.length === 0) {
    return [];
  }

  const persisted: PersistedTaskFile[] = [];

  for (const file of files) {
    const { publicUrl } = await uploadTaskAttachment(file, taskId, userId);

    const { data, error } = await supabase
      .from("task_files")
      .insert({
        task_id: taskId,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: userId,
      })
      .select("id, file_url, file_name")
      .single();

    if (error) {
      throw mapSupabaseError(error, "Unable to store attachment metadata");
    }

    if (data) {
      persisted.push(data as PersistedTaskFile);
    }
  }

  return persisted;
}
