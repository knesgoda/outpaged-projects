import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScopeChange {
  id: string;
  sprint_id: string;
  change_type: 'added' | 'removed' | 'modified';
  task_id: string;
  story_points_delta: number;
  reason?: string;
  changed_by: string;
  changed_at: string;
}

export function SprintScopeTracker({ sprintId }: { sprintId: string }) {
  const [scopeChanges, setScopeChanges] = useState<ScopeChange[]>([]);
  const [totalDelta, setTotalDelta] = useState(0);

  useEffect(() => {
    fetchScopeChanges();
  }, [sprintId]);

  const fetchScopeChanges = async () => {
    const { data, error } = await supabase
      .from('sprint_scope_changes')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('changed_at', { ascending: false });

    if (data) {
      setScopeChanges(data);
      const delta = data.reduce((sum, change) => sum + change.story_points_delta, 0);
      setTotalDelta(delta);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'removed':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sprint Scope Changes</CardTitle>
          <Badge variant={totalDelta > 0 ? 'destructive' : totalDelta < 0 ? 'default' : 'secondary'}>
            {totalDelta > 0 ? '+' : ''}{totalDelta} SP
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {scopeChanges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scope changes</p>
        ) : (
          <div className="space-y-2">
            {scopeChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getChangeIcon(change.change_type)}
                  <div>
                    <p className="text-sm font-medium capitalize">{change.change_type}</p>
                    {change.reason && (
                      <p className="text-xs text-muted-foreground">{change.reason}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline">
                  {change.story_points_delta > 0 ? '+' : ''}{change.story_points_delta} SP
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
