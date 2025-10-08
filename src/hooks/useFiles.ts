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
    uploadFile: async (_params: any) => { console.warn('Files service not implemented'); return {} as ProjectFile; },
    renameFile: async (_params: any) => { console.warn('Files service not implemented'); },
    deleteFile: async (_id: string) => { console.warn('Files service not implemented'); },
    getSignedUrl: async (_file: ProjectFile, _ttl?: number) => { console.warn('Files service not implemented'); return ''; },
    refetch: async () => { console.warn('Files service not implemented'); },
    isUploading: false,
    isRenaming: false,
    isDeleting: false,
  }), []);
}
