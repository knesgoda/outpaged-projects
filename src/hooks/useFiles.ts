import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteFile,
  getSignedUrl,
  listFiles,
  renameFile,
  uploadFile,
} from "@/services/files";
import { ProjectFile } from "@/types";
import { useToast } from "@/hooks/use-toast";

type FilesKey = ["files", { projectId?: string | null; q?: string }];

export function useFiles(params: { projectId?: string; search?: string } = {}) {
  const { toast } = useToast();

  return useQuery<ProjectFile[], Error>({
    queryKey: [
      "files",
      { projectId: params.projectId ?? null, q: params.search ?? "" },
    ] as FilesKey,
    queryFn: () => listFiles({ projectId: params.projectId, q: params.search }),
    staleTime: 30_000,
    onError: (error) => {
      toast({
        title: "Failed to load files",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) =>
      uploadFile(projectId, file),
    onMutate: async ({ projectId, file }) => {
      await queryClient.cancelQueries({ queryKey: ["files"] });
      const placeholder: ProjectFile = {
        id: `temp-${Date.now()}`,
        project_id: projectId,
        bucket: "files",
        path: "uploading",
        size_bytes: file.size,
        mime_type: file.type,
        title: file.name,
        uploaded_by: "pending",
        created_at: new Date().toISOString(),
      };

      const queries = queryClient.getQueriesData<ProjectFile[]>({
        queryKey: ["files"],
      });

      queries.forEach(([key, previous]) => {
        queryClient.setQueryData<ProjectFile[]>(
          key,
          previous ? [placeholder, ...previous] : [placeholder]
        );
      });

      return { placeholder, queries };
    },
    onError: (error: Error, _variables, context) => {
      context?.queries?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: (file) => {
      toast({ title: "File uploaded" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameFile(id, title),
    onSuccess: (file) => {
      queryClient.setQueriesData<ProjectFile[]>(
        { queryKey: ["files"] },
        (old) =>
          old?.map((current) =>
            current.id === file.id ? { ...current, title: file.title } : current
          ) ?? []
      );
      toast({ title: "File renamed" });
      return file;
    },
    onError: (error: Error) => {
      toast({
        title: "Rename failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteFile,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["files"] });
      const snapshot = queryClient.getQueriesData<ProjectFile[]>({
        queryKey: ["files"],
      });
      snapshot.forEach(([key, data]) => {
        queryClient.setQueryData<ProjectFile[]>(
          key,
          data?.filter((file) => file.id !== id) ?? []
        );
      });
      return { snapshot };
    },
    onError: (error: Error, _id, context) => {
      context?.snapshot?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "File deleted" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function useSignedFileUrl() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ file, expiresIn }: { file: ProjectFile; expiresIn?: number }) =>
      getSignedUrl(file, expiresIn),
    onError: (error: Error) => {
      toast({
        title: "Could not generate link",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
