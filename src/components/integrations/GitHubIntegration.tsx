import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Github, 
  GitBranch, 
  GitCommit, 
  ExternalLink, 
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export function GitHubIntegration() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoCreateIssues, setAutoCreateIssues] = useState(true);
  const [syncCommits, setSyncCommits] = useState(true);

  const handleConnect = async () => {
    if (!accessToken) {
      toast({
        title: "Error",
        description: "Please enter your GitHub access token",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Simulate GitHub API connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsConnected(true);
      setRepos([
        {
          id: 1,
          name: "project-repo",
          full_name: "user/project-repo",
          private: false,
          default_branch: "main",
          html_url: "https://github.com/user/project-repo"
        },
        {
          id: 2,
          name: "frontend-app",
          full_name: "user/frontend-app",
          private: true,
          default_branch: "develop",
          html_url: "https://github.com/user/frontend-app"
        }
      ]);
      
      toast({
        title: "Connected!",
        description: "Successfully connected to GitHub",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to GitHub. Please check your token.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRepoSelect = (repoName: string) => {
    setSelectedRepo(repoName);
    // Simulate fetching commits
    setCommits([
      {
        sha: "abc123",
        message: "Fix critical bug in user authentication",
        author: "john.doe",
        date: "2024-01-15T10:30:00Z",
        url: "https://github.com/user/project-repo/commit/abc123"
      },
      {
        sha: "def456",
        message: "Add new dashboard component",
        author: "jane.smith",
        date: "2024-01-14T15:45:00Z",
        url: "https://github.com/user/project-repo/commit/def456"
      }
    ]);
  };

  const createTaskFromCommit = (commit: GitHubCommit) => {
    toast({
      title: "Task Created",
      description: `Created task from commit: ${commit.message.substring(0, 50)}...`,
    });
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">GitHub Integration</h2>
            <p className="text-muted-foreground">Connect your GitHub repositories to sync commits and issues</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              Connect to GitHub
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="token">GitHub Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Generate a token with repo permissions in your GitHub settings
              </p>
            </div>
            
            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="w-4 h-4 mr-2" />
                  Connect GitHub
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GitHub Integration</h2>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Connected to GitHub</span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setIsConnected(false)}>
          <Settings className="w-4 h-4 mr-2" />
          Reconfigure
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Repository Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedRepo === repo.name ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleRepoSelect(repo.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <span className="font-medium">{repo.name}</span>
                    {repo.private && <Badge variant="secondary">Private</Badge>}
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {repo.default_branch}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-create issues from commits</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create tasks from commits with keywords
                </p>
              </div>
              <Switch checked={autoCreateIssues} onCheckedChange={setAutoCreateIssues} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Sync commit activity</Label>
                <p className="text-sm text-muted-foreground">
                  Show recent commits in project timeline
                </p>
              </div>
              <Switch checked={syncCommits} onCheckedChange={setSyncCommits} />
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedRepo && commits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="w-5 h-5" />
              Recent Commits - {selectedRepo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commits.map((commit) => (
                <div key={commit.sha} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{commit.message}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{commit.author}</span>
                      <span>{new Date(commit.date).toLocaleDateString()}</span>
                      <code className="text-xs bg-muted px-1 rounded">{commit.sha.substring(0, 7)}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createTaskFromCommit(commit)}
                    >
                      Create Task
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={commit.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}