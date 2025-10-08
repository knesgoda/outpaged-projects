import type { GitHubRepository } from "@/types";

export async function listGitHubRepos(): Promise<GitHubRepository[]> {
  console.warn('GitHub integration not fully implemented');
  return [];
}

export async function saveRepoDefault(): Promise<void> {
  console.warn('GitHub integration not fully implemented');
}

export async function listIssuesMock(): Promise<any[]> {
  console.warn('GitHub integration not fully implemented');
  return [];
}

export async function linkIssue(): Promise<any> {
  console.warn('GitHub integration not fully implemented');
  return null;
}
