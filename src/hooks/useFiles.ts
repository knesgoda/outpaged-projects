import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteFile,
  getSignedUrl,
  listFiles,
  renameFile,
  uploadFile,
} from "@/services/files";
import type { ProjectFile } from "@/types";
import { useToast } from "@/hooks/use-toast";

const FILES_KEY = ["files"] as const;

const filesKey = (params: { projectId?: string; q?: string } = {}) => [
  ...FILES_KEY,
  params.projectId ?? "all",
  params.q ?? "",
];

type UploadVariables = { projectId: string; file: File };

type RenameVariables = { id: string; title: string };

type DeleteVariables = { id: string; projectId: string };

type SignedUrlVariables = { file: ProjectFile; expiresIn?: number };

export function useFiles(params: { projectId?: string; q?: string } = {}) {
  return useQuery({
    queryKey: filesKey(params),
    queryFn: () => listFiles(params),
    staleTime: 30_000,
  });
}

export function useUploadFileMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, file }: UploadVariables) => uploadFile(projectId, file),
    onMutate: async ({ projectId, file }) => {
      const key = filesKey({ projectId });
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProjectFile[]>(key) ?? [];

      const optimistic: ProjectFile = {
        id: `optimistic-${Date.now()}`,
        project_id: projectId,
        bucket: "files",
        path: `pending/${file.name}`,
        size_bytes: file.size,
        mime_type: file.type || null,
        title: file.name,
        uploaded_by: "pending",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ProjectFile[]>(key, [optimistic, ...previous]);

      return { previous, key, optimisticId: optimistic.id, fileName: file.name };
    },
    onError: (error, variables, context) => {
      if (context) {
        queryClient.setQueryData<ProjectFile[]>(context.key, context.previous);
      }
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Unable to upload the file right now.",
        variant: "destructive",
      });
    },
    onSuccess: (data, variables, context) => {
      const key = filesKey({ projectId: data.project_id });
      queryClient.setQueryData<ProjectFile[]>(key, (current = []) => {
        const withoutOptimistic = context
          ? current.filter((item) => item.id !== context.optimisticId)
          : current;
        return [data, ...withoutOptimistic];
      });
      toast({
        title: "File uploaded",
        description: data.title ?? context?.fileName ?? "Upload finished",
      });
    },
    onSettled: (_result, _error, variables) => {
      const projectId = variables?.projectId;
      queryClient.invalidateQueries({ queryKey: filesKey({ projectId }) });
      if (!projectId) {
        queryClient.invalidateQueries({ queryKey: filesKey({}) });
      }
    },
  });
}

export function useRenameFileMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, title }: RenameVariables) => renameFile(id, title),
    onSuccess: (updated) => {
      const key = filesKey({ projectId: updated.project_id });
      queryClient.setQueryData<ProjectFile[]>(key, (current = []) =>
        current.map((file) => (file.id === updated.id ? updated : file))
      );
      toast({ title: "File renamed" });
    },
    onError: (error) => {
      toast({
        title: "Rename failed",
        description:
          error instanceof Error ? error.message : "Unable to rename the file right now.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFileMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id }: DeleteVariables) => deleteFile(id),
    onSuccess: (_void, { projectId, id }) => {
      const key = filesKey({ projectId });
      queryClient.setQueryData<ProjectFile[]>(key, (current = []) =>
        current.filter((file) => file.id !== id)
      );
      toast({ title: "File deleted" });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error ? error.message : "Unable to delete the file right now.",
        variant: "destructive",
      });
    },
    onSettled: (_result, _error, variables) => {
      const projectId = variables?.projectId;
      queryClient.invalidateQueries({ queryKey: filesKey({ projectId }) });
      if (!projectId) {
        queryClient.invalidateQueries({ queryKey: filesKey({}) });
      }
    },
  });
}

export function useSignedUrlMutation() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ file, expiresIn }: SignedUrlVariables) => getSignedUrl(file, expiresIn),
    onError: (error) => {
      toast({
        title: "Link error",
        description:
          error instanceof Error ? error.message : "Unable to create a download link.",
        variant: "destructive",
      });
    },
  });
}

export { filesKey };
