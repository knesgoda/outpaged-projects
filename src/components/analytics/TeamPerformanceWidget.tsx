import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Trophy, Clock, Target, TrendingUp } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  tasksCompleted: number;
  tasksInProgress: number;
  totalHours: number;
  velocity: number;
  efficiency: number;
  streak: number;
}

interface TeamPerformanceWidgetProps {
  projectId?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

export function TeamPerformanceWidget({ projectId }: TeamPerformanceWidgetProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [timeRange, setTimeRange] = useState('week');
  const [sortBy, setSortBy] = useState('velocity');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamPerformance();
  }, [projectId, timeRange]);

  const loadTeamPerformance = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the database
      // For now, we'll use mock data
      const mockMembers: TeamMember[] = [
        {
          id: '1',
          name: 'Alice Johnson',
          role: 'Frontend Developer',
          tasksCompleted: 12,
          tasksInProgress: 3,
          totalHours: 38,
          velocity: 24,
          efficiency: 92,
          streak: 5
        },
        {
          id: '2',
          name: 'Bob Smith',
          role: 'Backend Developer',
          tasksCompleted: 10,
          tasksInProgress: 2,
          totalHours: 42,
          velocity: 18,
          efficiency: 88,
          streak: 3
        },
        {
          id: '3',
          name: 'Carol Davis',
          role: 'Designer',
          tasksCompleted: 8,
          tasksInProgress: 4,
          totalHours: 35,
          velocity: 16,
          efficiency: 85,
          streak: 7
        },
        {
          id: '4',
          name: 'David Wilson',
          role: 'QA Engineer',
          tasksCompleted: 15,
          tasksInProgress: 1,
          totalHours: 40,
          velocity: 22,
          efficiency: 94,
          streak: 2
        }
      ];
      
      setTeamMembers(mockMembers);
    } catch (error) {
      console.error('Error loading team performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedMembers = [...teamMembers].sort((a, b) => {
    switch (sortBy) {
      case 'velocity': return b.velocity - a.velocity;
      case 'efficiency': return b.efficiency - a.efficiency;
      case 'tasks': return b.tasksCompleted - a.tasksCompleted;
      case 'hours': return b.totalHours - a.totalHours;
      default: return 0;
    }
  });

  const chartData = teamMembers.map(member => ({
    name: member.name.split(' ')[0],
    velocity: member.velocity,
    efficiency: member.efficiency,
    tasks: member.tasksCompleted,
    hours: member.totalHours
  }));

  const workloadData = teamMembers.map(member => ({
    name: member.name.split(' ')[0],
    value: member.tasksCompleted + member.tasksInProgress
  }));

  const totalTasks = teamMembers.reduce((sum, member) => sum + member.tasksCompleted, 0);
  const totalHours = teamMembers.reduce((sum, member) => sum + member.totalHours, 0);
  const avgEfficiency = teamMembers.reduce((sum, member) => sum + member.efficiency, 0) / teamMembers.length;

  if (loading) {
    return <div className="animate-pulse">Loading team performance...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Performance</h3>
          <p className="text-sm text-muted-foreground">
            Analyze individual and team productivity metrics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="velocity">Velocity</SelectItem>
              <SelectItem value="efficiency">Efficiency</SelectItem>
              <SelectItem value="tasks">Tasks</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Efficiency</p>
                <p className="text-2xl font-bold">{avgEfficiency.toFixed(0)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Size</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Team Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance Charts</TabsTrigger>
          <TabsTrigger value="workload">Workload Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4">
            {sortedMembers.map((member, index) => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      {index === 0 && (
                        <Badge variant="default" className="ml-2">
                          <Trophy className="w-3 h-3 mr-1" />
                          Top Performer
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <p className="text-lg font-bold">{member.tasksCompleted}</p>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{member.velocity}</p>
                        <p className="text-xs text-muted-foreground">Velocity</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{member.efficiency}%</p>
                        <p className="text-xs text-muted-foreground">Efficiency</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{member.streak}</p>
                        <p className="text-xs text-muted-foreground">Streak</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Efficiency</span>
                      <span>{member.efficiency}%</span>
                    </div>
                    <Progress value={member.efficiency} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="velocity" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Efficiency Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="efficiency" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workloadData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {workloadData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Hours Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{member.name}</span>
                        <span>{member.totalHours}h</span>
                      </div>
                      <Progress 
                        value={(member.totalHours / Math.max(...teamMembers.map(m => m.totalHours))) * 100} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}