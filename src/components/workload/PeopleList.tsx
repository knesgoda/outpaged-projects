import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, TrendingUp, TrendingDown } from "lucide-react";

interface PersonData {
  user_id: string;
  full_name: string;
  total_tasks: number;
  in_progress_tasks: number;
  total_story_points: number;
  avg_utilization: number;
}

export function PeopleList() {
  const [people, setPeople] = useState<PersonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeopleData();
  }, []);

  const fetchPeopleData = async () => {
    try {
      const { data, error } = await supabase
        .from('task_assignees')
        .select(`
          user_id,
          profiles:user_id (
            full_name
          ),
          tasks (
            id,
            status,
            story_points
          )
        `);

      if (error) throw error;

      // Aggregate by user
      const peopleMap = new Map<string, PersonData>();

      data?.forEach((assignment: any) => {
        const userId = assignment.user_id;
        const task = assignment.tasks;
        const profile = assignment.profiles;

        if (!peopleMap.has(userId)) {
          peopleMap.set(userId, {
            user_id: userId,
            full_name: profile?.full_name || 'Unknown',
            total_tasks: 0,
            in_progress_tasks: 0,
            total_story_points: 0,
            avg_utilization: 0
          });
        }

        const person = peopleMap.get(userId)!;
        person.total_tasks++;
        
        if (task?.status === 'in_progress') {
          person.in_progress_tasks++;
        }
        
        if (task?.story_points) {
          person.total_story_points += task.story_points;
        }

        // Calculate simple utilization (story points / 40 capacity * 100)
        person.avg_utilization = (person.total_story_points / 40) * 100;
      });

      setPeople(Array.from(peopleMap.values()));
    } catch (error) {
      console.error('Error fetching people:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationStatus = (utilization: number) => {
    if (utilization >= 110) return { color: 'destructive', label: 'Overloaded' };
    if (utilization >= 95) return { color: 'default', label: 'At Capacity' };
    if (utilization >= 85) return { color: 'secondary', label: 'Healthy' };
    return { color: 'outline', label: 'Available' };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading team members...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Individual capacity, assignments, and utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {people.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No team members found
              </div>
            ) : (
              people.map(person => {
                const status = getUtilizationStatus(person.avg_utilization);
                const initials = person.full_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={person.user_id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{person.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {person.total_tasks} tasks • {person.in_progress_tasks} in progress
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {person.total_story_points} points
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {person.avg_utilization.toFixed(0)}% utilization
                        </div>
                      </div>
                      <Badge variant={status.color as any}>
                        {status.label}
                      </Badge>
                      {person.avg_utilization >= 110 ? (
                        <TrendingUp className="h-4 w-4 text-destructive" />
                      ) : person.avg_utilization < 85 ? (
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
