import { updateIntegrationConfig } from "@/services/integrations";
import { addLinkedResource } from "@/services/linkedResources";
import type { LinkedResource } from "@/types";

type SaveRepoDefaultInput = {
  repoFullName: string;
};

type ListIssuesMockInput = {
  repoFullName: string;
};

type MockIssue = {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed";
};

type LinkIssueInput = {
  taskId: string;
  repoFullName: string;
  number: number;
  url: string;
  title: string;
  projectId?: string | null;
};

export async function saveRepoDefault({
  repoFullName,
}: SaveRepoDefaultInput): Promise<void> {
  const trimmed = repoFullName.trim();
  if (!trimmed) {
    throw new Error("Repository is required");
  }

  await updateIntegrationConfig("github", {
    default_repo: trimmed,
  });
}

export async function listIssuesMock({
  repoFullName,
}: ListIssuesMockInput): Promise<MockIssue[]> {
  const trimmed = repoFullName.trim();
  if (!trimmed) {
    throw new Error("Repository is required");
  }

  return new Array(5).fill(null).map((_, index) => {
    const number = index + 1;
    return {
      number,
      title: `Mock issue #${number} in ${trimmed}`,
      url: `https://github.com/${trimmed}/issues/${number}`,
      state: "open" as const,
    };
  });
}

export async function linkIssue(input: LinkIssueInput): Promise<LinkedResource> {
  if (!input.taskId) {
    throw new Error("Task ID is required");
  }

  if (!input.repoFullName?.trim()) {
    throw new Error("Repository is required");
  }

  return addLinkedResource({
    provider: "github",
    external_type: "issue",
    external_id: `${input.repoFullName}#${input.number}`,
    url: input.url,
    title: input.title,
    metadata: {
      repo: input.repoFullName,
      number: input.number,
      state: "open",
    },
    entity_type: "task",
    entity_id: input.taskId,
    project_id: input.projectId ?? null,
  });
}
