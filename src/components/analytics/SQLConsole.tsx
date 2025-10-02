import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Database, Play, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface SQLConsoleProps {
  projectId?: string;
}

export function SQLConsole({ projectId }: SQLConsoleProps) {
  const { toast } = useToast();
  const [sqlQuery, setSqlQuery] = useState(`-- Read-only SQL console
-- Query the analytics schema directly

SELECT 
  project_id,
  week_start,
  deployment_count,
  change_failure_rate_pct
FROM mv_dora_metrics
WHERE week_start >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY week_start DESC
LIMIT 10;`);
  const [results, setResults] = useState<any>(null);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeQuery = async () => {
    setIsExecuting(true);
    const startTime = Date.now();

    try {
      // Validate read-only
      const normalizedQuery = sqlQuery.trim().toUpperCase();
      if (
        normalizedQuery.includes('INSERT') ||
        normalizedQuery.includes('UPDATE') ||
        normalizedQuery.includes('DELETE') ||
        normalizedQuery.includes('DROP') ||
        normalizedQuery.includes('CREATE') ||
        normalizedQuery.includes('ALTER')
      ) {
        toast({
          title: "Error",
          description: "Only SELECT queries are allowed in SQL Console",
          variant: "destructive",
        });
        setIsExecuting(false);
        return;
      }

      // Mock execution - in real implementation, would use supabase.rpc() or a secure query endpoint
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockResults = [
        { 
          project_id: '123e4567-e89b-12d3-a456-426614174000',
          week_start: '2025-01-06',
          deployment_count: 42,
          change_failure_rate_pct: 12.5
        },
        { 
          project_id: '123e4567-e89b-12d3-a456-426614174000',
          week_start: '2024-12-30',
          deployment_count: 38,
          change_failure_rate_pct: 15.2
        },
        { 
          project_id: '123e4567-e89b-12d3-a456-426614174000',
          week_start: '2024-12-23',
          deployment_count: 35,
          change_failure_rate_pct: 11.1
        },
      ];

      setResults(mockResults);
      setExecutionTime(Date.now() - startTime);
      toast({ title: "Query executed successfully" });
    } catch (error: any) {
      toast({
        title: "Query Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Read-Only Mode:</strong> This console only allows SELECT queries. 
          Write operations are not permitted for security.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                SQL Console
              </CardTitle>
              <CardDescription>
                Execute read-only SQL queries against analytics tables
              </CardDescription>
            </div>
            <Button onClick={executeQuery} disabled={isExecuting}>
              <Play className="h-4 w-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute Query'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="font-mono text-sm h-64"
            placeholder="Enter your SQL query..."
          />

          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Available: mv_dora_metrics</Badge>
            <Badge variant="outline">mv_throughput_daily</Badge>
            <Badge variant="outline">mv_velocity_weekly</Badge>
            <Badge variant="outline">fact_transitions</Badge>
            <Badge variant="outline">fact_sprints</Badge>
          </div>

          {results && (
            <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  Query Results ({results.length} rows)
                </h4>
                <Badge variant="secondary">
                  {executionTime}ms
                </Badge>
              </div>
              
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted">
                    <tr>
                      {Object.keys(results[0] || {}).map(key => (
                        <th key={key} className="text-left py-2 px-3 font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row: any, i: number) => (
                      <tr key={i} className="border-b hover:bg-muted/30">
                        {Object.values(row).map((value: any, j: number) => (
                          <td key={j} className="py-2 px-3">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                Export to CSV
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Query Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div 
            className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setSqlQuery(`SELECT * FROM mv_throughput_daily
WHERE date_key >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date_key DESC;`)}
          >
            <div className="font-medium text-sm">Daily Throughput (Last 30 Days)</div>
            <div className="text-xs text-muted-foreground mt-1">View completed items per day</div>
          </div>

          <div 
            className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setSqlQuery(`SELECT 
  project_id,
  AVG(lead_time_hours_p50) as avg_lead_time,
  AVG(change_failure_rate_pct) as avg_failure_rate
FROM mv_dora_metrics
GROUP BY project_id;`)}
          >
            <div className="font-medium text-sm">DORA Metrics Summary by Project</div>
            <div className="text-xs text-muted-foreground mt-1">Average lead time and failure rates</div>
          </div>

          <div 
            className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setSqlQuery(`SELECT 
  to_state,
  COUNT(*) as transition_count,
  AVG(duration_in_from_seconds / 86400.0) as avg_days_in_state
FROM fact_transitions
WHERE occurred_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY to_state
ORDER BY transition_count DESC;`)}
          >
            <div className="font-medium text-sm">State Transition Analysis</div>
            <div className="text-xs text-muted-foreground mt-1">Most common transitions and time spent</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
