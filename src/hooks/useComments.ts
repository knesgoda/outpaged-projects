import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment, deleteComment, listComments, updateComment, type CommentWithAuthor } from '@/services/comments';
import type { CommentEntityType } from '@/types';

const COMMENTS_STALE_TIME = 1000 * 30;

type EntityRef = { type: CommentEntityType; id: string };

type CreateArgs = Parameters<typeof createComment>[0];
type UpdateArgs = { id: string; patch: Parameters<typeof updateComment>[1] };

type DeleteArgs = { id: string };

export function useComments(entity?: EntityRef) {
  const queryKey = ['comments', entity?.type, entity?.id];

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!entity) throw new Error('Missing comment entity');
      return listComments(entity);
    },
    enabled: Boolean(entity?.id && entity?.type),
    staleTime: COMMENTS_STALE_TIME,
  });
}

export function useCreateComment(entity: EntityRef) {
  const queryClient = useQueryClient();
  const queryKey = ['comments', entity.type, entity.id];

  return useMutation({
    mutationFn: (input: Omit<CreateArgs, 'entity_type' | 'entity_id'>) =>
      createComment({
        entity_type: entity.type,
        entity_id: entity.id,
        ...input,
      }),
    onSuccess: (comment) => {
      queryClient.setQueryData<CommentWithAuthor[] | undefined>(queryKey, (prev) => {
        if (!prev) return [comment];
        return [...prev, comment];
      });
    },
  });
}

export function useUpdateComment(entity: EntityRef) {
  const queryClient = useQueryClient();
  const queryKey = ['comments', entity.type, entity.id];

  return useMutation({
    mutationFn: ({ id, patch }: UpdateArgs) => updateComment(id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData<CommentWithAuthor[] | undefined>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((comment) => (comment.id === updated.id ? updated : comment));
      });
    },
  });
}

export function useDeleteComment(entity: EntityRef) {
  const queryClient = useQueryClient();
  const queryKey = ['comments', entity.type, entity.id];

  return useMutation({
    mutationFn: ({ id }: DeleteArgs) => deleteComment(id),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<CommentWithAuthor[] | undefined>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.filter((comment) => comment.id !== variables.id && comment.parent_id !== variables.id);
      });
    },
  });
}
