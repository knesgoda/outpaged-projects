import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { DocPage } from "@/types";
import {
  createDoc,
  createDocVersionFromCurrent,
  deleteDoc,
  getDoc,
  listDocVersions,
  listDocs,
  restoreDocVersion,
  updateDoc,
} from "@/services/docs";

const DOCS_KEY = ["docs"] as const;

const listKey = ({
  projectId,
  parentId,
  q,
}: {
  projectId?: string;
  parentId?: string | null;
  q?: string;
}) => [
  ...DOCS_KEY,
  "list",
  projectId ?? "all",
  parentId ?? "root",
  q ?? "",
];

const detailKey = (id: string) => [...DOCS_KEY, "detail", id];
const versionsKey = (id: string) => [...DOCS_KEY, "versions", id];

type UseDocsListOptions = {
  projectId?: string;
  parentId?: string | null;
  q?: string;
  enabled?: boolean;
};

export function useDocsList(options: UseDocsListOptions = {}) {
  const { projectId, parentId, q, enabled = true } = options;

  return useQuery({
    queryKey: listKey({ projectId, parentId, q }),
    queryFn: () => listDocs({ projectId, parentId, q }),
    enabled,
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });
}

export function useDoc(docId?: string) {
  return useQuery({
    queryKey: docId ? detailKey(docId) : [...DOCS_KEY, "detail", "unknown"],
    queryFn: () => {
      if (!docId) {
        throw new Error("Doc id is required");
      }
      return getDoc(docId);
    },
    enabled: Boolean(docId),
  });
}

export function useCreateDoc() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createDoc,
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: DOCS_KEY });
      queryClient.setQueryData(detailKey(doc.id), doc);
      toast({ title: "Doc created", description: "Your document is ready." });
      return doc;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to create the doc.";
      toast({ title: "Create failed", description: message, variant: "destructive" });
    },
  });
}

export function useUpdateDoc(docId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (patch: Partial<
      Pick<DocPage, "title" | "body_markdown" | "is_published" | "parent_id">
    >) => updateDoc(docId, patch),
    onSuccess: (doc) => {
      queryClient.setQueryData(detailKey(docId), doc);
      queryClient.invalidateQueries({ queryKey: DOCS_KEY });
      toast({ title: "Doc saved", description: "Changes stored." });
      return doc;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to save the doc.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    },
  });
}

export function useDeleteDoc() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteDoc,
    onSuccess: (_data, docId) => {
      queryClient.removeQueries({ queryKey: detailKey(docId) });
      queryClient.invalidateQueries({ queryKey: DOCS_KEY });
      toast({ title: "Doc deleted", description: "The document has been removed." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to delete the doc.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    },
  });
}

export function useDocVersions(docId?: string) {
  return useQuery({
    queryKey: docId ? versionsKey(docId) : [...DOCS_KEY, "versions", "unknown"],
    queryFn: () => {
      if (!docId) {
        throw new Error("Doc id is required");
      }
      return listDocVersions(docId);
    },
    enabled: Boolean(docId),
  });
}

export function useCreateDocVersion(docId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => createDocVersionFromCurrent(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey(docId) });
      queryClient.invalidateQueries({ queryKey: versionsKey(docId) });
      toast({ title: "Version saved", description: "Snapshot created." });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to snapshot the doc.";
      toast({ title: "Version failed", description: message, variant: "destructive" });
    },
  });
}

export function useRestoreDocVersion(docId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (version: number) => restoreDocVersion(docId, version),
    onSuccess: (doc) => {
      queryClient.setQueryData(detailKey(docId), doc);
      queryClient.invalidateQueries({ queryKey: versionsKey(docId) });
      toast({ title: "Version restored", description: "Content reverted." });
      return doc;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to restore the doc.";
      toast({ title: "Restore failed", description: message, variant: "destructive" });
    },
  });
}
