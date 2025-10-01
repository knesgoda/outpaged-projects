import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Link2, GitPullRequest, GitBranch, CheckCircle2 } from "lucide-react";

export function GitHubIntegration({ projectId }: { projectId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Github className="h-6 w-6" />
          GitHub Integration
        </h2>
        <p className="text-muted-foreground">
          Link branches, sync PR status, and auto-update tasks on merge
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch Naming Convention</CardTitle>
          <CardDescription>
            Use task keys in branch names for automatic linking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Examples:</p>
            <code className="text-sm block">feature/OP-123-add-user-auth</code>
            <code className="text-sm block">bugfix/OP-456-fix-login-error</code>
            <code className="text-sm block">hotfix/OP-789-patch-security</code>
          </div>
          <p className="text-xs text-muted-foreground">
            When you create a PR from a branch with a task key, it will automatically link to that task
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Automation Rules
          </CardTitle>
          <CardDescription>
            Configure how GitHub events update task status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">PR Opened</p>
                <p className="text-xs text-muted-foreground">Move task to "In Review"</p>
              </div>
              <Badge variant="secondary">Available</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">PR Merged</p>
                <p className="text-xs text-muted-foreground">Move task to "Done"</p>
              </div>
              <Badge variant="secondary">Available</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Commit Pushed</p>
                <p className="text-xs text-muted-foreground">Add commit message to task comments</p>
              </div>
              <Badge variant="secondary">Available</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
