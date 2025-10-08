import { useMemo } from "react";
import type { ProjectFile } from "@/types";

type UseFilesOptions = {
  projectId?: string;
  search?: string;
  enabled?: boolean;
};

export function useFiles(_options: UseFilesOptions = {}) {
  return useMemo(() => ({
    files: [] as ProjectFile[],
    isLoading: false,
    isFetching: false,
    error: null,
    uploadFile: async () => { console.warn('Files service not implemented'); return {} as ProjectFile; },
    renameFile: async () => { console.warn('Files service not implemented'); },
    deleteFile: async () => { console.warn('Files service not implemented'); },
    getSignedUrl: async () => { console.warn('Files service not implemented'); return { publicUrl: '', signedUrl: '' }; },
    refetch: async () => { console.warn('Files service not implemented'); },
    isUploading: false,
    isRenaming: false,
    isDeleting: false,
  }), []);
}
