import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Settings, BarChart3, TrendingUp, Users, Target } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Widget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: any;
}

interface CustomDashboardProps {
  projectId?: string;
}

const WIDGET_TYPES = [
  { value: 'metric', label: 'Key Metric', icon: Target },
  { value: 'chart', label: 'Chart', icon: BarChart3 },
  { value: 'table', label: 'Data Table', icon: Users },
  { value: 'gauge', label: 'Progress Gauge', icon: TrendingUp }
];

export function CustomDashboard({ projectId }: CustomDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Load saved dashboard configuration
    loadDashboard();
  }, [projectId]);

  const loadDashboard = async () => {
    // In a real implementation, this would load from the database
    // For now, we'll use mock data
    const mockWidgets: Widget[] = [
      {
        id: '1',
        type: 'metric',
        title: 'Tasks Completed This Week',
        size: 'small',
        position: { x: 0, y: 0 },
        config: { value: 42, target: 50, unit: 'tasks' }
      },
      {
        id: '2',
        type: 'chart',
        title: 'Sprint Velocity Trend',
        size: 'medium',
        position: { x: 1, y: 0 },
        config: { chartType: 'line', data: [] }
      },
      {
        id: '3',
        type: 'gauge',
        title: 'Project Progress',
        size: 'small',
        position: { x: 0, y: 1 },
        config: { value: 75, max: 100, unit: '%' }
      },
      {
        id: '4',
        type: 'table',
        title: 'Top Contributors',
        size: 'medium',
        position: { x: 1, y: 1 },
        config: { columns: ['Name', 'Tasks', 'Points'], data: [] }
      }
    ];
    
    setWidgets(mockWidgets);
  };

  const addWidget = (type: string) => {
    const newWidget: Widget = {
      id: Date.now().toString(),
      type: type as any,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      size: 'medium',
      position: { x: 0, y: widgets.length },
      config: {}
    };
    
    setWidgets(prev => [...prev, newWidget]);
  };

  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWidgets(items);
  };

  const renderWidget = (widget: Widget) => {
    const sizeClasses = {
      small: 'col-span-1 row-span-1',
      medium: 'col-span-2 row-span-1',
      large: 'col-span-3 row-span-2'
    };

    return (
      <Card key={widget.id} className={`relative ${sizeClasses[widget.size]}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{widget.title}</CardTitle>
            {isEditing && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeWidget(widget.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {widget.type === 'metric' && (
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                {widget.config.value || 0}{widget.config.unit || ''}
              </div>
              <div className="text-sm text-muted-foreground">
                Target: {widget.config.target || 0}{widget.config.unit || ''}
              </div>
            </div>
          )}
          
          {widget.type === 'gauge' && (
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-full h-full rounded-full border-8 border-gray-200">
                  <div 
                    className="absolute inset-0 rounded-full border-8 border-primary border-t-transparent"
                    style={{ 
                      transform: `rotate(${(widget.config.value || 0) * 3.6}deg)` 
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {widget.config.value || 0}{widget.config.unit || ''}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {widget.type === 'chart' && (
            <div className="h-32 flex items-center justify-center bg-muted rounded">
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Chart Placeholder</span>
            </div>
          )}
          
          {widget.type === 'table' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm font-medium">
                {(widget.config.columns || ['Col 1', 'Col 2', 'Col 3']).map((col: string, i: number) => (
                  <div key={i}>{col}</div>
                ))}
              </div>
              <div className="text-sm text-muted-foreground text-center py-4">
                No data available
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Custom Dashboard</h2>
          <p className="text-muted-foreground">
            Create and customize your analytics dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isEditing ? 'Done Editing' : 'Edit Dashboard'}
          </Button>
          
          {isEditing && (
            <Select onValueChange={addWidget}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Add Widget" />
              </SelectTrigger>
              <SelectContent>
                {WIDGET_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {widgets.length > 0 ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dashboard">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-3 gap-6 auto-rows-fr"
              >
                {widgets.map((widget, index) => (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={!isEditing}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {renderWidget(widget)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Widgets Added</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start building your custom dashboard by adding widgets.
            </p>
            <Button onClick={() => setIsEditing(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Start Editing
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}