import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OptimizationCheck {
  id: string;
  category: 'index' | 'query' | 'rls' | 'connection';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  status: 'passed' | 'warning' | 'failed';
}

export function DatabaseOptimizer() {
  const { toast } = useToast();
  const [checks, setChecks] = useState<OptimizationCheck[]>([
    {
      id: '1',
      category: 'index',
      severity: 'high',
      title: 'Missing Index on tasks.project_id',
      description: 'Queries filtering by project_id are slow without an index',
      recommendation: 'CREATE INDEX idx_tasks_project_id ON tasks(project_id);',
      status: 'passed'
    },
    {
      id: '2',
      category: 'index',
      severity: 'medium',
      title: 'Missing Composite Index on tasks',
      description: 'Queries filtering by status and assignee_id could benefit from a composite index',
      recommendation: 'CREATE INDEX idx_tasks_status_assignee ON tasks(status, assignee_id);',
      status: 'warning'
    },
    {
      id: '3',
      category: 'query',
      severity: 'high',
      title: 'N+1 Query Pattern Detected',
      description: 'Loading tasks with individual queries for each assignee',
      recommendation: 'Use JOIN or IN clause to fetch all assignees in a single query',
      status: 'warning'
    },
    {
      id: '4',
      category: 'rls',
      severity: 'low',
      title: 'RLS Policy Performance',
      description: 'Complex RLS policies may impact query performance',
      recommendation: 'Review and optimize RLS policy logic, consider adding indexes on columns used in policies',
      status: 'passed'
    },
    {
      id: '5',
      category: 'connection',
      severity: 'medium',
      title: 'Connection Pool Usage',
      description: 'Connection pool at 65% capacity during peak hours',
      recommendation: 'Monitor and consider increasing pool size if usage consistently exceeds 70%',
      status: 'passed'
    }
  ]);

  const runOptimizationCheck = () => {
    toast({
      title: "Running optimization checks...",
      description: "Analyzing database performance",
    });

    // Simulate check completion
    setTimeout(() => {
      toast({
        title: "Optimization check complete",
        description: "Found 2 optimization opportunities",
      });
    }, 2000);
  };

  const getCategoryIcon = (category: string) => {
    return <Database className="h-4 w-4" />;
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    };
    return <Badge variant={colors[severity] as any}>{severity}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const passedCount = checks.filter(c => c.status === 'passed').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const failedCount = checks.filter(c => c.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Database Optimizer</h2>
          <p className="text-muted-foreground">
            Performance analysis and optimization recommendations
          </p>
        </div>
        <Button onClick={runOptimizationCheck}>
          <Database className="h-4 w-4 mr-2" />
          Run Check
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passedCount}</div>
            <p className="text-xs text-muted-foreground">Optimization checks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningCount}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Critical issues</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Optimization Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(check.category)}
                        <h3 className="font-medium">{check.title}</h3>
                        {getSeverityBadge(check.severity)}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {check.description}
                      </p>
                      
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-xs font-medium mb-1">Recommendation:</p>
                        <code className="text-xs">{check.recommendation}</code>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Use indexes on foreign keys and frequently filtered columns</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Implement cursor-based pagination for large datasets</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Use SELECT specific columns instead of SELECT *</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Avoid N+1 queries by using JOINs or batch loading</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Monitor and optimize slow queries using EXPLAIN ANALYZE</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
