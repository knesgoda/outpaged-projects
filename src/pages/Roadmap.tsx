import { useState, useCallback } from 'react';
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
  Clock
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const nodeTypes = {
  milestone: MilestoneNode,
  timeline: TimelineNode,
};

const initialNodes: Node[] = [
  // Timeline nodes (quarters)
  {
    id: 'q1-2025',
    type: 'timeline',
    position: { x: 100, y: 50 },
    data: { quarter: 'Q1', year: '2025', milestones: 3 },
    draggable: false,
  },
  {
    id: 'q2-2025',
    type: 'timeline', 
    position: { x: 500, y: 50 },
    data: { quarter: 'Q2', year: '2025', milestones: 4 },
    draggable: false,
  },
  {
    id: 'q3-2025',
    type: 'timeline',
    position: { x: 900, y: 50 },
    data: { quarter: 'Q3', year: '2025', milestones: 2 },
    draggable: false,
  },
  {
    id: 'q4-2025',
    type: 'timeline',
    position: { x: 1300, y: 50 },
    data: { quarter: 'Q4', year: '2025', milestones: 3 },
    draggable: false,
  },

  // Milestone nodes
  {
    id: 'milestone-1',
    type: 'milestone',
    position: { x: 50, y: 200 },
    data: {
      title: 'User Authentication System',
      description: 'Complete OAuth integration and security improvements for user login and registration flows',
      status: 'in_progress',
      startDate: 'Jan 15',
      endDate: 'Feb 28',
      progress: 65,
      team: 'Security Team',
      priority: 'high',
    },
  },
  {
    id: 'milestone-2',
    type: 'milestone',
    position: { x: 200, y: 350 },
    data: {
      title: 'Mobile App Launch',
      description: 'Release native mobile applications for iOS and Android platforms with core functionality',
      status: 'planned',
      startDate: 'Feb 1',
      endDate: 'Mar 31',
      progress: 15,
      team: 'Mobile Team',
      priority: 'critical',
    },
  },
  {
    id: 'milestone-3',
    type: 'milestone',
    position: { x: 450, y: 200 },
    data: {
      title: 'Analytics Dashboard',
      description: 'Advanced analytics and reporting dashboard with real-time data visualization',
      status: 'planned',
      startDate: 'Apr 1',
      endDate: 'May 15',
      progress: 0,
      team: 'Data Team',
      priority: 'medium',
    },
  },
  {
    id: 'milestone-4',
    type: 'milestone',
    position: { x: 600, y: 350 },
    data: {
      title: 'API v2.0 Release',
      description: 'Major API overhaul with improved performance, GraphQL support, and better documentation',
      status: 'planned',
      startDate: 'May 1',
      endDate: 'Jun 30',
      progress: 0,
      team: 'Backend Team',
      priority: 'high',
    },
  },
  {
    id: 'milestone-5',
    type: 'milestone',
    position: { x: 850, y: 200 },
    data: {
      title: 'AI/ML Integration',
      description: 'Integrate machine learning models for intelligent recommendations and automation',
      status: 'planned',
      startDate: 'Jul 1',
      endDate: 'Sep 15',
      progress: 0,
      team: 'AI Team',
      priority: 'medium',
    },
  },
  {
    id: 'milestone-6',
    type: 'milestone',
    position: { x: 1250, y: 200 },
    data: {
      title: 'Enterprise Features',
      description: 'Advanced enterprise features including SSO, audit logs, and compliance tools',
      status: 'planned',
      startDate: 'Oct 1',
      endDate: 'Dec 15',
      progress: 0,
      team: 'Enterprise Team',
      priority: 'low',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'milestone-1',
    target: 'milestone-2',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#6366f1' },
  },
  {
    id: 'e2-3',
    source: 'milestone-2',
    target: 'milestone-3',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#6366f1' },
  },
  {
    id: 'e3-4',
    source: 'milestone-3',
    target: 'milestone-4',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#6366f1' },
  },
  {
    id: 'e4-5',
    source: 'milestone-4',
    target: 'milestone-5',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#6366f1' },
  },
  {
    id: 'e5-6',
    source: 'milestone-5',
    target: 'milestone-6',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#6366f1' },
  },
];

export default function Roadmap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Calculate stats
  const milestoneNodes = nodes.filter(node => node.type === 'milestone');
  const inProgressCount = milestoneNodes.filter(node => node.data.status === 'in_progress').length;
  const completedCount = milestoneNodes.filter(node => node.data.status === 'completed').length;
  const atRiskCount = milestoneNodes.filter(node => node.data.status === 'at_risk').length;
  const avgProgress = milestoneNodes.reduce((sum, node) => {
    const progress = typeof node.data.progress === 'number' ? node.data.progress : 0;
    return sum + progress;
  }, 0) / milestoneNodes.length;

  const handleExportRoadmap = () => {
    // In a real app, this would generate a PDF or image export
    console.log('Exporting roadmap...');
  };

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