import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocPage } from "@/types";
import {
  createDoc,
  createDocVersionFromCurrent,
  deleteDoc,
  getDoc,
  listDocVersions,
  listDocs,
  updateDoc,
} from "@/services/docs";

type DocsListParams = {
  projectId?: string;
  parentId?: string | null;
  q?: string;
};

const docsKeys = {
  all: ["docs"] as const,
  list: (params: DocsListParams = {}) =>
    [
      "docs",
      "list",
      params.projectId ?? "all",
      params.parentId ?? "any",
      params.q ?? "",
    ] as const,
  detail: (id: string) => ["docs", "detail", id] as const,
  versions: (id: string) => ["docs", "versions", id] as const,
};

export function useDocs(params: DocsListParams = {}) {
  return useQuery({
    queryKey: docsKeys.list(params),
    queryFn: () => listDocs(params),
    staleTime: 1000 * 30,
  });
}

export function useDoc(id?: string) {
  return useQuery({
    queryKey: id ? docsKeys.detail(id) : ["docs", "detail", "missing"] as const,
    queryFn: () => getDoc(id as string),
    enabled: Boolean(id),
    staleTime: 1000 * 60,
  });
}

export function useCreateDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDoc,
    onSuccess: async (doc) => {
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "docs" });
      queryClient.setQueryData(docsKeys.detail(doc.id), doc);
    },
  });
}

export function useUpdateDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateDoc>[1] }) =>
      updateDoc(id, patch),
    onSuccess: async (doc) => {
      queryClient.setQueryData(docsKeys.detail(doc.id), doc);
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "docs" });
    },
  });
}

export function useDeleteDoc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDoc(id),
    onSuccess: async (_data, id) => {
      queryClient.removeQueries({ queryKey: docsKeys.detail(id) });
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "docs" });
    },
  });
}

export function useDocVersions(docId?: string) {
  return useQuery({
    queryKey: docId ? docsKeys.versions(docId) : ["docs", "versions", "missing"] as const,
    queryFn: () => listDocVersions(docId as string),
    enabled: Boolean(docId),
    staleTime: 1000 * 10,
  });
}

export function useCreateDocVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (docId: string) => createDocVersionFromCurrent(docId),
    onSuccess: async (_data, docId) => {
      await queryClient.invalidateQueries({ queryKey: docsKeys.versions(docId) });
    },
  });
}

export function useDocSearch(docs: DocPage[] | undefined, term: string) {
  return useMemo(() => {
    if (!docs) {
      return [] as DocPage[];
    }
    const value = term.trim().toLowerCase();
    if (!value) {
      return docs;
    }
    return docs.filter((doc) => {
      return (
        doc.title.toLowerCase().includes(value) ||
        (doc.body_markdown ?? "").toLowerCase().includes(value)
      );
    });
  }, [docs, term]);
}
