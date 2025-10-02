import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Target,
  GitBranch,
  TestTube,
  FileText,
  Users
} from "lucide-react";

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  status: "complete" | "in_progress" | "blocked" | "not_started";
  assignee?: string;
  dueDate?: string;
}

export function ReleaseReadinessDashboard() {
  const releaseInfo = {
    version: "v2.5.0",
    targetDate: "2025-02-15",
    daysRemaining: 8,
    status: "in_progress" as const,
  };

  const checklist: ChecklistItem[] = [
    // Code Complete
    { id: "1", category: "Code", item: "All features implemented", status: "complete" },
    { id: "2", category: "Code", item: "Code review completed", status: "complete" },
    { id: "3", category: "Code", item: "Technical debt items resolved", status: "in_progress", assignee: "Alice" },
    
    // Testing
    { id: "4", category: "Testing", item: "Unit tests passing", status: "complete" },
    { id: "5", category: "Testing", item: "Integration tests passing", status: "complete" },
    { id: "6", category: "Testing", item: "E2E tests passing", status: "in_progress", assignee: "Bob" },
    { id: "7", category: "Testing", item: "Performance testing completed", status: "not_started" },
    { id: "8", category: "Testing", item: "Security scan completed", status: "blocked" },
    
    // Documentation
    { id: "9", category: "Documentation", item: "API documentation updated", status: "complete" },
    { id: "10", category: "Documentation", item: "User guide updated", status: "in_progress", assignee: "Carol" },
    { id: "11", category: "Documentation", item: "Release notes drafted", status: "complete" },
    { id: "12", category: "Documentation", item: "Migration guide prepared", status: "not_started" },
    
    // Deployment
    { id: "13", category: "Deployment", item: "Staging deployment successful", status: "complete" },
    { id: "14", category: "Deployment", item: "Database migrations tested", status: "complete" },
    { id: "15", category: "Deployment", item: "Rollback plan documented", status: "in_progress", assignee: "David" },
    { id: "16", category: "Deployment", item: "Monitoring alerts configured", status: "not_started" },
  ];

  const calculateProgress = () => {
    const completed = checklist.filter(item => item.status === "complete").length;
    return (completed / checklist.length) * 100;
  };

  const getStatusCounts = () => {
    return {
      complete: checklist.filter(i => i.status === "complete").length,
      in_progress: checklist.filter(i => i.status === "in_progress").length,
      blocked: checklist.filter(i => i.status === "blocked").length,
      not_started: checklist.filter(i => i.status === "not_started").length,
    };
  };

  const getStatusIcon = (status: ChecklistItem["status"]) => {
    switch (status) {
      case "complete": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in_progress": return <Clock className="h-4 w-4 text-blue-600" />;
      case "blocked": return <XCircle className="h-4 w-4 text-destructive" />;
      case "not_started": return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Code": return <GitBranch className="h-4 w-4" />;
      case "Testing": return <TestTube className="h-4 w-4" />;
      case "Documentation": return <FileText className="h-4 w-4" />;
      case "Deployment": return <Target className="h-4 w-4" />;
      default: return null;
    }
  };

  const progress = calculateProgress();
  const statusCounts = getStatusCounts();
  const isReadyForRelease = progress === 100 && statusCounts.blocked === 0;

  return (
    <div className="space-y-6">
      {/* Release Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{releaseInfo.version}</CardTitle>
              <CardDescription>
                Target Date: {releaseInfo.targetDate} ({releaseInfo.daysRemaining} days remaining)
              </CardDescription>
            </div>
            <Badge 
              variant={isReadyForRelease ? "default" : "secondary"}
              className="text-lg px-4 py-2"
            >
              {isReadyForRelease ? "Ready to Ship" : "In Progress"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Readiness</span>
                <span className="text-sm text-muted-foreground">{progress.toFixed(0)}% Complete</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-green-50 dark:bg-green-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Complete</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{statusCounts.complete}</div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">In Progress</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{statusCounts.in_progress}</div>
                </CardContent>
              </Card>

              <Card className="bg-destructive/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-muted-foreground">Blocked</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{statusCounts.blocked}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Not Started</span>
                  </div>
                  <div className="text-2xl font-bold mt-2">{statusCounts.not_started}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist by Category */}
      {["Code", "Testing", "Documentation", "Deployment"].map((category) => {
        const categoryItems = checklist.filter(item => item.category === category);
        const categoryProgress = (categoryItems.filter(i => i.status === "complete").length / categoryItems.length) * 100;
        
        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {category}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {categoryItems.filter(i => i.status === "complete").length}/{categoryItems.length}
                  </span>
                  <Progress value={categoryProgress} className="w-20 h-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {getStatusIcon(item.status)}
                    <span className="flex-1">{item.item}</span>
                    {item.assignee && (
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {item.assignee}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Blockers Alert */}
      {statusCounts.blocked > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Release Blockers Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              There are {statusCounts.blocked} blocked item(s) that must be resolved before release:
            </p>
            <div className="space-y-2">
              {checklist
                .filter(item => item.status === "blocked")
                .map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">{item.category}: {item.item}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready to Ship */}
      {isReadyForRelease && (
        <Card className="border-primary bg-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/20 p-3">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Release is Ready to Ship! 🎉</h3>
                <p className="text-sm text-muted-foreground">
                  All checklist items are complete. You can proceed with the release.
                </p>
              </div>
              <Button size="lg">
                Deploy to Production
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
