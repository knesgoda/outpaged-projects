import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteFile as deleteFileService,
  getSignedUrl as getFileSignedUrl,
  listFiles,
  renameFile as renameFileService,
  uploadFile as uploadFileService,
} from "@/services/files";
import type { ProjectFile } from "@/types";

const filesKey = (projectId?: string | null, search?: string | null) => [
  "files",
  projectId ?? "all",
  search?.trim() ?? "",
];

type UseFilesOptions = {
  projectId?: string;
  search?: string;
  enabled?: boolean;
};

type UploadFileInput = {
  projectId: string;
  file: File;
};

type RenameFileInput = {
  id: string;
  title: string;
};

export function useFiles(options: UseFilesOptions = {}) {
  const { projectId, search, enabled = true } = options;
  const queryClient = useQueryClient();
  const queryKey = filesKey(projectId ?? null, search ?? null);

  const listQuery = useQuery({
    queryKey,
    queryFn: () => listFiles({ projectId: projectId ?? undefined, q: search }),
    enabled,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    keepPreviousData: true,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ projectId: uploadProjectId, file }: UploadFileInput) =>
      uploadFileService(uploadProjectId, file),
    onMutate: async ({ file }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectFile[]>(queryKey);

      const optimistic: ProjectFile = {
        id: `optimistic-${Date.now()}`,
        project_id: projectId ?? "pending",
        bucket: "files",
        path: "pending",
        size_bytes: file.size,
        mime_type: file.type || null,
        title: file.name,
        uploaded_by: "pending",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ProjectFile[]>(queryKey, (current = []) => [optimistic, ...current]);

      return { previous, optimisticId: optimistic.id };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (result, _variables, context) => {
      queryClient.setQueryData<ProjectFile[]>(queryKey, (current = []) => {
        if (!context?.optimisticId) {
          return [result, ...current];
        }
        return [result, ...current.filter((item) => item.id !== context.optimisticId)];
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: RenameFileInput) => renameFileService(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectFile[]>(queryKey);
      queryClient.setQueryData<ProjectFile[]>(queryKey, (current = []) =>
        current.map((item) => (item.id === id ? { ...item, title } : item))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData<ProjectFile[]>(queryKey, (current = []) =>
        current.map((item) => (item.id === result.id ? result : item))
      );
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFileService(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectFile[]>(queryKey);
      queryClient.setQueryData<ProjectFile[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== id)
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });

  return useMemo(
    () => ({
      files: listQuery.data ?? [],
      isLoading: listQuery.isLoading,
      isFetching: listQuery.isFetching,
      error: listQuery.error as Error | null,
      uploadFile: (input: UploadFileInput) => uploadMutation.mutateAsync(input),
      renameFile: (input: RenameFileInput) => renameMutation.mutateAsync(input),
      deleteFile: (id: string) => deleteMutation.mutateAsync(id),
      getSignedUrl: getFileSignedUrl,
      refetch: listQuery.refetch,
      isUploading: uploadMutation.isPending,
      isRenaming: renameMutation.isPending,
      isDeleting: deleteMutation.isPending,
    }),
    [
      deleteMutation.isPending,
      deleteMutation.mutateAsync,
      listQuery.data,
      listQuery.error,
      listQuery.isFetching,
      listQuery.isLoading,
      listQuery.refetch,
      renameMutation.isPending,
      renameMutation.mutateAsync,
      uploadMutation.isPending,
      uploadMutation.mutateAsync,
    ]
  );
}
