import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { GitBranch, GitPullRequest, GitCommit, CheckCircle2, XCircle, Link2, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GitHubConfig {
  enabled: boolean;
  repoUrl: string;
  autoLinkBranches: boolean;
  autoLinkPRs: boolean;
  syncStatus: boolean;
  branchPrefix: string;
}

export function GitHubIntegrationEnhanced() {
  const { toast } = useToast();
  const [config, setConfig] = useState<GitHubConfig>({
    enabled: false,
    repoUrl: "",
    autoLinkBranches: true,
    autoLinkPRs: true,
    syncStatus: true,
    branchPrefix: "feature/OP-",
  });

  const [showSettings, setShowSettings] = useState(false);

  const handleSaveConfig = () => {
    // In a real implementation, this would save to Supabase
    toast({
      title: "GitHub Integration Configured",
      description: "Your GitHub settings have been saved",
    });
    setShowSettings(false);
  };

  const generateBranchName = (taskId: string, taskTitle: string) => {
    const sanitized = taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    return `${config.branchPrefix}${taskId}-${sanitized}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                GitHub Integration
              </CardTitle>
              <CardDescription>
                Connect tasks to GitHub branches, PRs, and commits
              </CardDescription>
            </div>
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>GitHub Configuration</DialogTitle>
                  <DialogDescription>
                    Set up GitHub integration for your project
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled">Enable GitHub Integration</Label>
                    <Switch
                      id="enabled"
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enabled: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repoUrl">Repository URL</Label>
                    <Input
                      id="repoUrl"
                      placeholder="https://github.com/outpaged/project"
                      value={config.repoUrl}
                      onChange={(e) =>
                        setConfig({ ...config, repoUrl: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchPrefix">Branch Name Prefix</Label>
                    <Input
                      id="branchPrefix"
                      placeholder="feature/OP-"
                      value={config.branchPrefix}
                      onChange={(e) =>
                        setConfig({ ...config, branchPrefix: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Example: {generateBranchName("123", "Add user authentication")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoLinkBranches">Auto-link Branches</Label>
                    <Switch
                      id="autoLinkBranches"
                      checked={config.autoLinkBranches}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, autoLinkBranches: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoLinkPRs">Auto-link Pull Requests</Label>
                    <Switch
                      id="autoLinkPRs"
                      checked={config.autoLinkPRs}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, autoLinkPRs: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="syncStatus">Sync PR Status to Task</Label>
                    <Switch
                      id="syncStatus"
                      checked={config.syncStatus}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, syncStatus: checked })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSettings(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfig}>Save Configuration</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {config.enabled ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Branch Linking</p>
                        <p className="text-xs text-muted-foreground">
                          {config.autoLinkBranches ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <GitPullRequest className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">PR Integration</p>
                        <p className="text-xs text-muted-foreground">
                          {config.autoLinkPRs ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <GitCommit className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Status Sync</p>
                        <p className="text-xs text-muted-foreground">
                          {config.syncStatus ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="text-sm font-medium mb-2">How to use GitHub Integration</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Create branches using the format: <code className="text-xs bg-background px-1 py-0.5 rounded">{config.branchPrefix}TASK-ID-description</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Reference task IDs in PR titles or descriptions to auto-link</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Merging a PR will automatically update the task status to "In Review"</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                GitHub integration is not configured
              </p>
              <Button onClick={() => setShowSettings(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {config.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Branch Name Generator</CardTitle>
            <CardDescription>Generate standardized branch names for tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Task ID (e.g., 123)" className="max-w-[200px]" />
              <Input placeholder="Task title" className="flex-1" />
              <Button>
                <Link2 className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
