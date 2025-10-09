import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import MilestoneNode from "../components/roadmap/MilestoneNode";
import TimelineNode from "../components/roadmap/TimelineNode";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FolderOpen
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { enableOutpagedBrand } from "@/lib/featureFlags";

const ROADMAP_MONTHS = ['Oct', 'Nov', 'Dec', 'Jan'];

const ROADMAP_LANES = [
  {
    name: 'Software',
    color: 'hsl(var(--primary))',
    bars: [
      { label: 'Sprint 12', start: 0, span: 2 },
      { label: 'Platform hardening', start: 2, span: 2 },
    ],
  },
  {
    name: 'Marketing',
    color: 'hsl(var(--accent))',
    bars: [{ label: 'Holiday campaign', start: 1, span: 2 }],
  },
  {
    name: 'Design',
    color: 'hsl(var(--chip-neutral-foreground))',
    bars: [{ label: 'UI redesign', start: 0.5, span: 2 }],
  },
];

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'at_risk';
  priority: 'low' | 'medium' | 'high' | 'critical';
  start_date?: string;
  end_date?: string;
  progress: number;
  team_assigned?: string;
  position_x: number;
  position_y: number;
}

const nodeTypes = {
  milestone: MilestoneNode,
  timeline: TimelineNode,
};

function LegacyRoadmap() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchMilestones();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      
      // Auto-select first project if available
      if (data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    if (!selectedProject) return;
    
    try {
      const { data, error } = await supabase
        .from('roadmap_milestones')
        .select('*')
        .eq('project_id', selectedProject)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMilestones((data || []) as Milestone[]);
      
      // Convert milestones to nodes
      const milestoneNodes: Node[] = (data || []).map((milestone, index) => ({
        id: milestone.id,
        type: 'milestone',
        position: { 
          x: milestone.position_x || (200 + (index % 4) * 300), 
          y: milestone.position_y || (200 + Math.floor(index / 4) * 200)
        },
        data: {
          title: milestone.title,
          description: milestone.description || '',
          status: milestone.status,
          startDate: milestone.start_date ? new Date(milestone.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          endDate: milestone.end_date ? new Date(milestone.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          progress: milestone.progress,
          team: milestone.team_assigned || 'Unassigned',
          priority: milestone.priority,
        },
      }));

      // Add timeline nodes for quarters
      const timelineNodes: Node[] = [
        {
          id: 'q1-2025',
          type: 'timeline',
          position: { x: 100, y: 50 },
          data: { quarter: 'Q1', year: '2025', milestones: milestoneNodes.length },
          draggable: false,
        },
        {
          id: 'q2-2025',
          type: 'timeline', 
          position: { x: 500, y: 50 },
          data: { quarter: 'Q2', year: '2025', milestones: 0 },
          draggable: false,
        },
        {
          id: 'q3-2025',
          type: 'timeline',
          position: { x: 900, y: 50 },
          data: { quarter: 'Q3', year: '2025', milestones: 0 },
          draggable: false,
        },
        {
          id: 'q4-2025',
          type: 'timeline',
          position: { x: 1300, y: 50 },
          data: { quarter: 'Q4', year: '2025', milestones: 0 },
          draggable: false,
        },
      ];

      setNodes([...timelineNodes, ...milestoneNodes]);
      
      // Create basic connections between consecutive milestones
      const milestoneEdges: Edge[] = [];
      for (let i = 0; i < milestoneNodes.length - 1; i++) {
        milestoneEdges.push({
          id: `e${i}-${i+1}`,
          source: milestoneNodes[i].id,
          target: milestoneNodes[i + 1].id,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6366f1' },
        });
      }
      setEdges(milestoneEdges);
      
    } catch (error) {
      console.error('Error fetching milestones:', error);
      toast({
        title: "Error",
        description: "Failed to load roadmap milestones",
        variant: "destructive",
      });
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Calculate stats
  const milestoneNodes = nodes.filter(node => node.type === 'milestone');
  const inProgressCount = milestoneNodes.filter(node => node.data.status === 'in_progress').length;
  const completedCount = milestoneNodes.filter(node => node.data.status === 'completed').length;
  const atRiskCount = milestoneNodes.filter(node => node.data.status === 'at_risk').length;
  const avgProgress = milestoneNodes.length > 0 
    ? milestoneNodes.reduce((sum, node) => {
        const progress = typeof node.data.progress === 'number' ? node.data.progress : 0;
        return sum + progress;
      }, 0) / milestoneNodes.length 
    : 0;

  const handleExportRoadmap = () => {
    // In a real app, this would generate a PDF or image export
    console.log('Exporting roadmap...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Product Roadmap</h1>
          <p className="text-muted-foreground">Visualize and track your product milestones and timeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportRoadmap}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button className="bg-gradient-primary hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </Button>
        </div>
      </div>

      {/* Project Selector */}
      <div className="flex items-center gap-2">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  {project.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Milestones</p>
                <p className="text-2xl font-bold">{milestoneNodes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Risk</p>
                <p className="text-2xl font-bold">{atRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold">{Math.round(avgProgress)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search milestones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTeam} onValueChange={setFilterTeam}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            <SelectItem value="Security Team">Security Team</SelectItem>
            <SelectItem value="Mobile Team">Mobile Team</SelectItem>
            <SelectItem value="Data Team">Data Team</SelectItem>
            <SelectItem value="Backend Team">Backend Team</SelectItem>
            <SelectItem value="AI Team">AI Team</SelectItem>
            <SelectItem value="Enterprise Team">Enterprise Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Roadmap Visualization */}
      {milestones.length === 0 ? (
        <Card className="h-[400px]">
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Milestones Yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first roadmap milestone
              </p>
              <Button className="bg-gradient-primary hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create First Milestone
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="h-[700px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Product Roadmap Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[600px] p-0">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              className="bg-muted/20"
            >
              <Controls className="!bottom-4 !left-4" />
              <MiniMap 
                className="!bottom-4 !right-4" 
                zoomable 
                pannable
                nodeStrokeWidth={2}
              />
              <Background color="#94a3b8" gap={16} />
            </ReactFlow>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted rounded-full"></div>
              <span className="text-sm">Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full"></div>
              <span className="text-sm">At Risk</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OutpagedRoadmap() {
  const [quarter, setQuarter] = useState('Q4');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">Roadmap</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Quarterly view</h1>
        </div>
        <Select value={quarter} onValueChange={setQuarter}>
          <SelectTrigger className="w-32 rounded-full border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))]">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Q3">Q3</SelectItem>
            <SelectItem value="Q4">Q4</SelectItem>
            <SelectItem value="Q1">Q1</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-3xl border-none shadow-soft">
        <CardContent className="space-y-6 p-6">
          <div className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] gap-4 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
            <span></span>
            {ROADMAP_MONTHS.map((month) => (
              <span key={month} className="text-center">
                {month}
              </span>
            ))}
          </div>

          <div className="space-y-6">
            {ROADMAP_LANES.map((lane) => (
              <div key={lane.name} className="grid grid-cols-[120px_repeat(4,minmax(0,1fr))] items-center gap-4">
                <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{lane.name}</div>
                <div className="relative col-span-4 h-12 rounded-2xl border border-[hsl(var(--chip-neutral))]/60 bg-[hsl(var(--chip-neutral))]/20">
                  {lane.bars.map((bar) => (
                    <div
                      key={bar.label}
                      className="absolute top-1/2 flex h-8 -translate-y-1/2 items-center rounded-full px-4 text-xs font-semibold text-primary-foreground shadow-soft"
                      style={{
                        left: `calc(${bar.start * 25}% + 0.25rem)`,
                        width: `calc(${bar.span * 25}% - 0.5rem)`,
                        background: lane.color,
                      }}
                    >
                      {bar.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Quarter {quarter} plan</p>
            <Button variant="ghost" className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--chip-neutral))] px-4 py-2 text-sm font-semibold text-[hsl(var(--accent))]">
              <Download className="h-4 w-4" />
              Export PNG
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Roadmap() {
  if (enableOutpagedBrand) {
    return <OutpagedRoadmap />;
  }

  return <LegacyRoadmap />;
}