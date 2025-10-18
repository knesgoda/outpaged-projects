import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Target } from 'lucide-react';

interface RoadmapItem {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  quarter: string;
  year: number;
  status: 'planned' | 'in_progress' | 'completed' | 'at_risk';
  linked_tasks?: string[];
  created_at: string;
}

interface Milestone {
  id: string;
  roadmap_item_id: string;
  title: string;
  target_date: string;
  status: 'pending' | 'achieved' | 'missed';
  created_at: string;
}

export function QuarterlyRoadmap({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});

  useEffect(() => {
    fetchRoadmap();
  }, [projectId]);

  const fetchRoadmap = async () => {
    const { data: itemsData } = await supabase
      .from('roadmap_items' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('year', { ascending: true })
      .order('quarter', { ascending: true });

    if (itemsData) {
      setItems(itemsData as any);

      const { data: milestonesData } = await supabase
        .from('roadmap_milestones' as any)
        .select('*')
        .in('roadmap_item_id', (itemsData as any).map((i: any) => i.id))
        .order('target_date', { ascending: true });

      if (milestonesData) {
        const grouped = (milestonesData as any).reduce((acc: any, m: any) => {
          if (!acc[m.roadmap_item_id]) acc[m.roadmap_item_id] = [];
          acc[m.roadmap_item_id].push(m);
          return acc;
        }, {} as Record<string, Milestone[]>);
        setMilestones(grouped);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'in_progress':
        return 'bg-primary';
      case 'at_risk':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const quarters = Array.from(new Set(items.map(i => `${i.year} ${i.quarter}`)));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="w-6 h-6" />
        Quarterly Roadmap
      </h2>

      {quarters.map((quarter) => {
        const quarterItems = items.filter(i => `${i.year} ${i.quarter}` === quarter);
        
        return (
          <div key={quarter}>
            <h3 className="text-xl font-semibold mb-4">{quarter}</h3>
            <div className="space-y-4">
              {quarterItems.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                    )}

                    {milestones[item.id] && milestones[item.id].length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Milestones
                        </h4>
                        {milestones[item.id].map((milestone) => (
                          <div key={milestone.id} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{milestone.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(milestone.target_date).toLocaleDateString()}
                              </span>
                              <Badge variant={milestone.status === 'achieved' ? 'default' : 'outline'}>
                                {milestone.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
