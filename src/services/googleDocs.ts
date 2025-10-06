import type { LinkedResource } from "@/types";
import { addLinkedResource } from "@/services/linkedResources";

type LinkDocInput = {
  entityType: LinkedResource["entity_type"];
  entityId: string;
  url: string;
  title: string;
  projectId?: string | null;
};

export async function linkDoc(input: LinkDocInput): Promise<LinkedResource> {
  if (!input.entityId) {
    throw new Error("Entity ID is required");
  }

  const title = input.title?.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  return addLinkedResource({
    provider: "google_docs",
    external_type: "doc",
    external_id: input.url,
    url: input.url,
    title,
    metadata: {},
    entity_type: input.entityType,
    entity_id: input.entityId,
    project_id: input.projectId ?? null,
  });
}
