// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

type GitHubRepoResponse = {
  id?: string | number;
  node_id?: string;
  full_name?: string;
  name?: string;
  owner?: string | { login?: string; name?: string } | null;
  private?: boolean;
  description?: string | null;
  html_url?: string | null;
  url?: string | null;
  default_branch?: string | null;
  updated_at?: string | null;
};

export type GitHubRepo = {
  id: string;
  node_id?: string;
  name: string;
  owner: string;
  full_name: string;
  private: boolean;
  description: string | null;
  url: string;
  default_branch: string | null;
  updated_at: string | null;
};

type GitHubIssueResponse = {
  id?: string | number;
  number?: number;
  title?: string | null;
  html_url?: string | null;
  url?: string | null;
  web_url?: string | null;
  state?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  assignee?: string | { login?: string | null; name?: string | null } | null;
};

export type GitHubIssue = {
  id: string;
  number: number;
  title: string;
  url: string;
  state: string;
  created_at: string | null;
  updated_at: string | null;
  assignee: string | null;
};

type ListReposResponse = { repos?: GitHubRepoResponse[] } | GitHubRepoResponse[] | null;
type ListIssuesResponse = { issues?: GitHubIssueResponse[] } | GitHubIssueResponse[] | null;

const normalizeOwner = (owner?: GitHubRepoResponse["owner"]): string => {
  if (!owner) return "";
  if (typeof owner === "string") return owner;
  return owner.login ?? owner.name ?? "";
};

const normalizeRepo = (repo: GitHubRepoResponse): GitHubRepo => {
  const owner = normalizeOwner(repo.owner);
  const nameFromFull = repo.full_name?.split("/").pop()?.trim() ?? "";
  const name = repo.name?.trim() || nameFromFull;
  const derivedFullName = owner && name ? `${owner}/${name}` : repo.full_name ?? name;
  return {
    id: String(repo.id ?? repo.node_id ?? derivedFullName ?? ""),
    node_id: repo.node_id ?? undefined,
    name,
    owner: owner || (repo.full_name?.split("/").shift()?.trim() ?? ""),
    full_name: repo.full_name ?? derivedFullName ?? "",
    private: Boolean(repo.private),
    description: repo.description ?? null,
    url:
      repo.html_url ??
      repo.url ??
      (repo.full_name || derivedFullName ? `https://github.com/${repo.full_name ?? derivedFullName}` : ""),
    default_branch: repo.default_branch ?? null,
    updated_at: repo.updated_at ?? null,
  };
};

const normalizeIssue = (
  issue: GitHubIssueResponse,
  repoFullName?: string
): GitHubIssue => {
  const candidateNumber =
    issue.number ??
    (typeof issue.id === "number"
      ? issue.id
      : issue.id !== undefined
        ? Number(issue.id)
        : undefined);
  const parsedNumber = Number(candidateNumber);
  const safeNumber = Number.isFinite(parsedNumber) && parsedNumber > 0 ? parsedNumber : 0;
  const title = issue.title?.trim() || (safeNumber ? `Issue #${safeNumber}` : "Untitled issue");
  const assignee =
    typeof issue.assignee === "string"
      ? issue.assignee
      : issue.assignee?.login ?? issue.assignee?.name ?? null;

  const fallbackUrl =
    repoFullName && safeNumber
      ? `https://github.com/${repoFullName}/issues/${safeNumber}`
      : "";

  return {
    id: String(issue.id ?? `${repoFullName ?? ""}#${safeNumber || title}`),
    number: safeNumber,
    title,
    url: issue.html_url ?? issue.url ?? issue.web_url ?? fallbackUrl,
    state: issue.state ?? "open",
    created_at: issue.created_at ?? null,
    updated_at: issue.updated_at ?? null,
    assignee,
  };
};

const extractRepos = (payload: ListReposResponse): GitHubRepoResponse[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.repos)) return payload.repos;
  return [];
};

const extractIssues = (payload: ListIssuesResponse): GitHubIssueResponse[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.issues)) return payload.issues;
  return [];
};

const handleInvokeError = (error: { message?: string | null } | null, fallback: string): never => {
  if (!error) {
    throw new Error(fallback);
  }
  throw new Error(error.message ?? fallback);
};

export const listGitHubRepos = async (): Promise<GitHubRepo[]> => {
  const { data, error } = await supabase.functions.invoke<ListReposResponse>("github-list-repos");

  if (error) {
    handleInvokeError(error, "Unable to list GitHub repositories.");
  }

  return extractRepos(data).map(normalizeRepo);
};

type SaveRepoDefaultInput = {
  repoFullName: string;
  projectId?: string | null;
};

type SaveRepoDefaultResponse = { config?: Record<string, unknown> } | Record<string, unknown> | null;

export const saveRepoDefault = async (
  input: SaveRepoDefaultInput
): Promise<Record<string, unknown>> => {
  const repoFullName = input?.repoFullName?.trim();
  if (!repoFullName) {
    throw new Error("Repository is required.");
  }

  const { data, error } = await supabase.functions.invoke<SaveRepoDefaultResponse>(
    "github-save-default",
    {
      body: {
        repo_full_name: repoFullName,
        project_id: input.projectId ?? null,
      },
    }
  );

  if (error) {
    handleInvokeError(error, "Unable to save GitHub repository settings.");
  }

  const payload = data && "config" in data ? data.config : data;
  return {
    default_repo: repoFullName,
    ...(payload ?? {}),
  };
};

type ListIssuesMockInput = {
  repoFullName: string;
  projectId?: string | null;
  limit?: number;
};

export const listIssuesMock = async (input: ListIssuesMockInput): Promise<GitHubIssue[]> => {
  const repoFullName = input?.repoFullName?.trim();
  if (!repoFullName) {
    throw new Error("Repository is required to list issues.");
  }

  const { data, error } = await supabase.functions.invoke<ListIssuesResponse>(
    "github-list-issues",
    {
      body: {
        repo_full_name: repoFullName,
        project_id: input.projectId ?? null,
        limit: input.limit ?? 20,
      },
    }
  );

  if (error) {
    handleInvokeError(error, "Unable to load GitHub issues.");
  }

  return extractIssues(data).map((issue) => normalizeIssue(issue, repoFullName));
};

type LinkIssueInput = {
  taskId: string;
  repoFullName: string;
  number: number;
  url: string;
  title: string;
  projectId?: string | null;
};

type LinkIssueResponse =
  | {
      linked_resource_id?: string | null;
      linkedResourceId?: string | null;
      task_id?: string | null;
      taskId?: string | null;
      issue?: GitHubIssueResponse | null;
    }
  | null;

export const linkIssue = async (
  input: LinkIssueInput
): Promise<{ linked_resource_id: string | null; task_id: string; issue: GitHubIssue }> => {
  const taskId = input?.taskId?.trim();
  if (!taskId) {
    throw new Error("Task ID is required.");
  }

  const repoFullName = input?.repoFullName?.trim();
  if (!repoFullName) {
    throw new Error("Repository is required.");
  }

  const issueNumber = Number(input.number);
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) {
    throw new Error("Issue number is invalid.");
  }

  const issueUrl = input?.url?.trim();
  if (!issueUrl) {
    throw new Error("Issue URL is required.");
  }

  const title = input?.title?.trim();
  if (!title) {
    throw new Error("Issue title is required.");
  }

  const { data, error } = await supabase.functions.invoke<LinkIssueResponse>("github-link-issue", {
    body: {
      task_id: taskId,
      repo_full_name: repoFullName,
      issue_number: issueNumber,
      issue_url: issueUrl,
      issue_title: title,
      project_id: input.projectId ?? null,
    },
  });

  if (error) {
    handleInvokeError(error, "Unable to link GitHub issue.");
  }

  const normalizedIssue = normalizeIssue(
    data?.issue ?? {
      number: issueNumber,
      title,
      html_url: issueUrl,
    },
    repoFullName
  );

  return {
    linked_resource_id: data?.linked_resource_id ?? data?.linkedResourceId ?? null,
    task_id: data?.task_id ?? data?.taskId ?? taskId,
    issue: normalizedIssue,
  };
};
