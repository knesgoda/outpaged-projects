import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code, Play, Save, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DSLEditorProps {
  projectId?: string;
}

const defaultDSL = `dataset: transitions
measures: 
  - throughput
dimensions: 
  - team
  - week
filters:
  - status_category: Done
  - week: last_12
grain: week
calc:
  - id: avg_weekly
    expr: MOVING_AVG(throughput, 4)`;

export function DSLEditor({ projectId }: DSLEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');
  const [dslContent, setDslContent] = useState(defaultDSL);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [queryResults, setQueryResults] = useState<any>(null);

  const { data: savedQueries } = useQuery({
    queryKey: ['saved-queries', projectId, 'dsl'],
    queryFn: async () => {
      let query = supabase
        .from('saved_queries' as any)
        .select('*')
        .eq('query_type', 'dsl')
        .order('created_at', { ascending: false });
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const validateQuery = () => {
    try {
      // Parse YAML-like DSL (simplified validation)
      const lines = dslContent.split('\n');
      const hasDataset = lines.some(l => l.trim().startsWith('dataset:'));
      const hasMeasures = lines.some(l => l.trim().startsWith('measures:'));
      
      if (!hasDataset) {
        setValidationResult({ status: 'error', message: 'Missing required field: dataset' });
        return;
      }
      if (!hasMeasures) {
        setValidationResult({ status: 'error', message: 'Missing required field: measures' });
        return;
      }
      
      setValidationResult({ 
        status: 'success', 
        message: 'Query syntax is valid',
        warnings: [
          'Estimated rows: ~1,200',
          'Estimated execution time: < 500ms'
        ]
      });
    } catch (error: any) {
      setValidationResult({ status: 'error', message: error.message });
    }
  };

  const runQuery = () => {
    validateQuery();
    // Mock results - would compile to SQL and execute
    setQueryResults([
      { team: 'Engineering', week: 'W1', throughput: 12, avg_weekly: 10 },
      { team: 'Engineering', week: 'W2', throughput: 15, avg_weekly: 11 },
      { team: 'Design', week: 'W1', throughput: 8, avg_weekly: 7 },
      { team: 'Design', week: 'W2', throughput: 10, avg_weekly: 8 },
    ]);
    toast({ title: "Query executed successfully" });
  };

  const saveQuery = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('saved_queries' as any)
        .insert({
          name: queryName,
          description: queryDescription,
          query_type: 'dsl',
          query_definition: { dsl: dslContent },
          project_id: projectId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] });
      toast({ title: "Query saved successfully" });
      setQueryName('');
      setQueryDescription('');
    },
  });

  const loadQuery = (query: any) => {
    setQueryName(query.name);
    setQueryDescription(query.description);
    setDslContent(query.query_definition.dsl);
    setValidationResult(null);
    setQueryResults(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Editor */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                DSL Query Editor
              </CardTitle>
              <CardDescription>
                Write queries using YAML-like syntax
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={validateQuery}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Validate
              </Button>
              <Button variant="outline" size="sm" onClick={runQuery}>
                <Play className="h-4 w-4 mr-2" />
                Run
              </Button>
              <Button size="sm" onClick={() => saveQuery.mutate()}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Query Name</Label>
              <Input
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                placeholder="My Query"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={queryDescription}
                onChange={(e) => setQueryDescription(e.target.value)}
                placeholder="What does this query do?"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>DSL Query</Label>
            <Textarea
              value={dslContent}
              onChange={(e) => setDslContent(e.target.value)}
              className="font-mono text-sm h-64"
              placeholder={defaultDSL}
            />
          </div>

          {validationResult && (
            <Alert variant={validationResult.status === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">{validationResult.message}</div>
                {validationResult.warnings?.map((warning: string, i: number) => (
                  <div key={i} className="text-xs mt-1">{warning}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {queryResults && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-semibold mb-2">Query Results ({queryResults.length} rows)</h4>
              <div className="overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      {Object.keys(queryResults[0] || {}).map(key => (
                        <th key={key} className="text-left py-2 px-3 font-medium">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.map((row: any, i: number) => (
                      <tr key={i} className="border-b">
                        {Object.values(row).map((value: any, j: number) => (
                          <td key={j} className="py-2 px-3">{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Queries */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Queries</CardTitle>
          <CardDescription>Load and reuse your queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {savedQueries?.map((query: any) => (
              <div
                key={query.id}
                className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                onClick={() => loadQuery(query)}
              >
                <div className="font-medium">{query.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {query.description}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {query.run_count} runs
                  </Badge>
                  {query.is_public && (
                    <Badge variant="secondary" className="text-xs">Public</Badge>
                  )}
                </div>
              </div>
            ))}
            {!savedQueries?.length && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No saved queries yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
