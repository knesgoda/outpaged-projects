import { resetSupabaseMocks, supabaseMock } from "@/testing/supabaseHarness";
import { listGitHubRepos, listIssuesMock, linkIssue, saveRepoDefault } from "../github";

describe("GitHub service", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe("listGitHubRepos", () => {
    it("returns normalized repository metadata", async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          repos: [
            {
              id: 123,
              name: "workspace",
              owner: { login: "outpaged" },
              private: false,
              description: "Workspace UI",
              html_url: "https://github.com/outpaged/workspace",
              default_branch: "main",
            },
          ],
        },
        error: null,
      });

      const repos = await listGitHubRepos();

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("github-list-repos");
      expect(repos).toHaveLength(1);
      expect(repos[0]).toMatchObject({
        id: "123",
        name: "workspace",
        owner: "outpaged",
        full_name: "outpaged/workspace",
        url: "https://github.com/outpaged/workspace",
        default_branch: "main",
      });
    });

    it("throws when the function returns an error", async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: "token expired" },
      });

      await expect(listGitHubRepos()).rejects.toThrow("token expired");
    });
  });

  describe("saveRepoDefault", () => {
    it("persists workspace defaults through the API", async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: { config: { default_repo: "outpaged/workspace" } },
        error: null,
      });

      const result = await saveRepoDefault({
        repoFullName: "outpaged/workspace",
        projectId: "project-123",
      });

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("github-save-default", {
        body: {
          repo_full_name: "outpaged/workspace",
          project_id: "project-123",
        },
      });

      expect(result).toMatchObject({ default_repo: "outpaged/workspace" });
    });

    it("requires a repository name", async () => {
      await expect(saveRepoDefault({ repoFullName: "" })).rejects.toThrow(
        "Repository is required."
      );
    });
  });

  describe("listIssuesMock", () => {
    it("fetches issues via Supabase functions", async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          issues: [
            {
              id: 55,
              number: 42,
              title: "Fix login redirect",
              html_url: "https://github.com/outpaged/workspace/issues/42",
              state: "open",
              assignee: { login: "ada" },
            },
          ],
        },
        error: null,
      });

      const issues = await listIssuesMock({ repoFullName: "outpaged/workspace", limit: 5 });

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("github-list-issues", {
        body: {
          repo_full_name: "outpaged/workspace",
          project_id: null,
          limit: 5,
        },
      });

      expect(issues).toEqual([
        expect.objectContaining({
          number: 42,
          title: "Fix login redirect",
          url: "https://github.com/outpaged/workspace/issues/42",
          assignee: "ada",
        }),
      ]);
    });

    it("validates repository input", async () => {
      await expect(listIssuesMock({ repoFullName: " " })).rejects.toThrow(
        "Repository is required to list issues."
      );
    });
  });

  describe("linkIssue", () => {
    it("links an issue to a task via the API", async () => {
      supabaseMock.functions.invoke.mockResolvedValueOnce({
        data: {
          linked_resource_id: "lr-1",
          task_id: "task-1",
          issue: {
            number: 101,
            title: "Improve loading states",
            html_url: "https://github.com/outpaged/workspace/issues/101",
          },
        },
        error: null,
      });

      const response = await linkIssue({
        taskId: "task-1",
        repoFullName: "outpaged/workspace",
        number: 101,
        url: "https://github.com/outpaged/workspace/issues/101",
        title: "Improve loading states",
      });

      expect(supabaseMock.functions.invoke).toHaveBeenCalledWith("github-link-issue", {
        body: {
          task_id: "task-1",
          repo_full_name: "outpaged/workspace",
          issue_number: 101,
          issue_url: "https://github.com/outpaged/workspace/issues/101",
          issue_title: "Improve loading states",
          project_id: null,
        },
      });

      expect(response).toEqual({
        linked_resource_id: "lr-1",
        task_id: "task-1",
        issue: expect.objectContaining({
          number: 101,
          title: "Improve loading states",
          url: "https://github.com/outpaged/workspace/issues/101",
        }),
      });
    });

    it("validates required linking data", async () => {
      await expect(
        linkIssue({ taskId: "", repoFullName: "repo", number: 1, url: "u", title: "t" })
      ).rejects.toThrow("Task ID is required.");

      await expect(
        linkIssue({ taskId: "task", repoFullName: " ", number: 1, url: "u", title: "t" })
      ).rejects.toThrow("Repository is required.");

      await expect(
        linkIssue({ taskId: "task", repoFullName: "repo", number: 0, url: "u", title: "t" })
      ).rejects.toThrow("Issue number is invalid.");

      await expect(
        linkIssue({
          taskId: "task",
          repoFullName: "repo",
          number: 1,
          url: " ",
          title: "t",
        })
      ).rejects.toThrow("Issue URL is required.");

      await expect(
        linkIssue({
          taskId: "task",
          repoFullName: "repo",
          number: 1,
          url: "https://example.com",
          title: " ",
        })
      ).rejects.toThrow("Issue title is required.");
    });
  });
});

