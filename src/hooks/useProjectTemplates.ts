import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  applyProjectTemplate,
  createProjectTemplate,
  getProjectTemplate,
  listProjectTemplates,
  type ProjectTemplateRecord,
  type ProjectTemplateSummary,
  type TemplateCreationInput,
} from "@/services/projectTemplates";

const templatesKey = ["project-templates"] as const;

export function useProjectTemplates() {
  return useQuery<ProjectTemplateSummary[]>({
    queryKey: templatesKey,
    queryFn: () => listProjectTemplates(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useProjectTemplate(id?: string | null) {
  return useQuery<ProjectTemplateRecord | null>({
    queryKey: id ? [...templatesKey, id] : null,
    queryFn: () => (id ? getProjectTemplate(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 10,
  });
}

export function useApplyProjectTemplate() {
  return useMutation({
    mutationFn: ({ projectId, templateId }: { projectId: string; templateId: string }) =>
      applyProjectTemplate(projectId, templateId),
  });
}

export function useCreateProjectTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TemplateCreationInput) => createProjectTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templatesKey });
    },
  });
}
