import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Settings, Trash2, GripVertical, BarChart3, LineChart, PieChart, Table2, Activity, Gauge } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AdvancedChartLibrary } from "./AdvancedChartLibrary";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Widget {
  id: string;
  type: 'kpi' | 'line' | 'bar' | 'table' | 'pie' | 'gauge' | 'heatmap' | 'flow';
  title: string;
  queryConfig: any;
  vizConfig: any;
  position: { x: number; y: number; w: number; h: number };
}

interface Dashboard {
  id?: string;
  name: string;
  description?: string;
  widgets: Widget[];
}

const WIDGET_TYPES = [
  { value: 'kpi', label: 'KPI Card', icon: Activity },
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'table', label: 'Data Table', icon: Table2 },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'gauge', label: 'Gauge', icon: Gauge },
];

function SortableWidget({ widget, onRemove, onEdit }: { widget: Widget; onRemove: () => void; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: widget.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-move">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            {widget.title}
          </CardTitle>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AdvancedChartLibrary
            type={widget.type}
            data={widget.queryConfig.data || []}
            config={widget.vizConfig}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function AdvancedDashboardBuilder({ projectId }: { projectId?: string }) {
  const { toast } = useToast();
  const [dashboard, setDashboard] = useState<Dashboard>({
    name: "New Dashboard",
    widgets: [],
  });
  const [isEditingWidget, setIsEditingWidget] = useState<string | null>(null);
  const [newWidgetType, setNewWidgetType] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setDashboard(prev => {
        const oldIndex = prev.widgets.findIndex(w => w.id === active.id);
        const newIndex = prev.widgets.findIndex(w => w.id === over.id);
        return {
          ...prev,
          widgets: arrayMove(prev.widgets, oldIndex, newIndex),
        };
      });
    }
  };

  const addWidget = (type: string) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: type as Widget['type'],
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Widget`,
      queryConfig: { data: [] },
      vizConfig: {},
      position: { x: 0, y: 0, w: 6, h: 4 },
    };

    setDashboard(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));

    setNewWidgetType("");
  };

  const removeWidget = (widgetId: string) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
    }));
  };

  const saveDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('dashboards' as any).insert({
        name: dashboard.name,
        description: dashboard.description,
        config: { widgets: dashboard.widgets },
        owner_id: user.id,
        project_id: projectId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Dashboard saved successfully",
      });
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to save dashboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Input
            value={dashboard.name}
            onChange={(e) => setDashboard(prev => ({ ...prev, name: e.target.value }))}
            className="text-2xl font-bold border-none p-0 h-auto"
            placeholder="Dashboard Name"
          />
          <Input
            value={dashboard.description || ""}
            onChange={(e) => setDashboard(prev => ({ ...prev, description: e.target.value }))}
            className="text-muted-foreground border-none p-0 h-auto"
            placeholder="Description (optional)"
          />
        </div>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Add Widget</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Widget Type</Label>
                  <Select value={newWidgetType} onValueChange={setNewWidgetType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select widget type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WIDGET_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => newWidgetType && addWidget(newWidgetType)}
                  disabled={!newWidgetType}
                  className="w-full"
                >
                  Add Widget
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Button onClick={saveDashboard}>Save Dashboard</Button>
        </div>
      </div>

      {dashboard.widgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first widget to start building your dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={dashboard.widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboard.widgets.map(widget => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  onRemove={() => removeWidget(widget.id)}
                  onEdit={() => setIsEditingWidget(widget.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
