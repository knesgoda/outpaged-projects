import { useState, useEffect } from 'react';
import { ReactFlow, Node, Edge, Controls, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, AlertTriangle } from 'lucide-react';

interface DependencyGraphProps {
  projectId?: string;
}

export function DependencyGraph({ projectId }: DependencyGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockedTasks, setBlockedTasks] = useState(0);

  useEffect(() => {
    fetchDependencies();
  }, [projectId]);

  const fetchDependencies = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('task_relationships')
        .select(`
          id,
          source_task_id,
          target_task_id,
          relationship_type,
          source_task:source_task_id (
            id,
            title,
            status,
            priority
          ),
          target_task:target_task_id (
            id,
            title,
            status,
            priority
          )
        `)
        .in('relationship_type', ['blocks', 'depends_on']);

      const { data, error } = await query;

      if (error) throw error;

      // Create nodes from tasks
      const taskMap = new Map<string, any>();
      const flowNodes: Node[] = [];
      const flowEdges: Edge[] = [];

      data?.forEach((rel: any) => {
        if (rel.source_task && !taskMap.has(rel.source_task.id)) {
          taskMap.set(rel.source_task.id, rel.source_task);
        }
        if (rel.target_task && !taskMap.has(rel.target_task.id)) {
          taskMap.set(rel.target_task.id, rel.target_task);
        }
      });

      // Create nodes
      let x = 0;
      let y = 0;
      taskMap.forEach((task, taskId) => {
        const isBlocked = task.status !== 'done' && data?.some(
          (rel: any) => rel.target_task_id === taskId && rel.relationship_type === 'blocks' && rel.source_task?.status !== 'done'
        );

        flowNodes.push({
          id: taskId,
          type: 'default',
          position: { x, y },
          data: {
            label: (
              <div className="text-center">
                <div className="font-medium text-xs">{task.title}</div>
                <Badge variant={task.status === 'done' ? 'default' : 'secondary'} className="mt-1 text-xs">
                  {task.status}
                </Badge>
              </div>
            ),
          },
          style: {
            background: isBlocked ? '#fee2e2' : task.status === 'done' ? '#dcfce7' : '#fff',
            border: isBlocked ? '2px solid #ef4444' : '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '10px',
            minWidth: '150px',
          },
        });

        x += 200;
        if (x > 800) {
          x = 0;
          y += 120;
        }
      });

      // Create edges
      data?.forEach((rel: any) => {
        flowEdges.push({
          id: rel.id,
          source: rel.source_task_id,
          target: rel.target_task_id,
          type: 'smoothstep',
          animated: rel.source_task?.status !== 'done',
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          label: rel.relationship_type === 'blocks' ? 'blocks' : 'depends on',
          style: {
            stroke: rel.relationship_type === 'blocks' ? '#ef4444' : '#6b7280',
          },
        });
      });

      setNodes(flowNodes);
      setEdges(flowEdges);
      
      // Count blocked tasks
      const blocked = flowNodes.filter(n => 
        n.style?.background === '#fee2e2'
      ).length;
      setBlockedTasks(blocked);

    } catch (error: any) {
      console.error('Error fetching dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading dependency graph...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Dependency Graph
          </h2>
          <p className="text-muted-foreground">
            Visualize task dependencies and identify critical path
          </p>
        </div>
        {blockedTasks > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {blockedTasks} blocked tasks
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Dependencies</CardTitle>
          <CardDescription>
            Red borders indicate blocked tasks • Animated edges show active dependencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No dependencies found. Create task relationships to visualize dependencies.
            </div>
          ) : (
            <div className="h-[600px] border rounded-lg bg-muted/20">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                attributionPosition="bottom-left"
              >
                <Controls />
                <Background />
              </ReactFlow>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
