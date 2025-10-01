import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'single_select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multi Select' },
  { value: 'user', label: 'User' },
  { value: 'team', label: 'Team' },
  { value: 'date', label: 'Date' },
  { value: 'date_range', label: 'Date Range' },
  { value: 'story_points', label: 'Story Points' },
  { value: 'time_estimate', label: 'Time Estimate' },
  { value: 'effort', label: 'Effort' },
  { value: 'risk', label: 'Risk' },
  { value: 'dependency', label: 'Dependency' },
  { value: 'url', label: 'URL' },
  { value: 'file', label: 'File' }
];

interface CustomFieldDefinitionManagerProps {
  projectId?: string;
  workspaceId?: string;
}

export function CustomFieldDefinitionManager({ projectId, workspaceId }: CustomFieldDefinitionManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    field_type: "text",
    description: "",
    is_required: false,
    is_private: false,
    options: [] as string[]
  });

  const { data: customFields, isLoading } = useQuery({
    queryKey: ['custom-fields', projectId, workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('custom_field_definitions')
        .select('*')
        .order('position');

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(projectId || workspaceId)
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData: any = {
        name: data.name,
        field_type: data.field_type as any,
        description: data.description || null,
        is_required: data.is_required,
        is_private: data.is_private,
        created_by: user?.id
      };

      if (projectId) insertData.project_id = projectId;
      if (workspaceId) insertData.workspace_id = workspaceId;
      if (data.options.length > 0) insertData.options = data.options;

      const { error } = await supabase
        .from('custom_field_definitions')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', projectId, workspaceId] });
      toast.success("Custom field created successfully");
      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        field_type: "text",
        description: "",
        is_required: false,
        is_private: false,
        options: []
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to create custom field: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_field_definitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields', projectId, workspaceId] });
      toast.success("Custom field deleted successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to delete custom field: ${error.message}`);
    }
  });

  const handleCreateSubmit = () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    createMutation.mutate(formData);
  };

  const needsOptions = formData.field_type === 'single_select' || formData.field_type === 'multi_select';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Custom Fields</h3>
          <p className="text-sm text-muted-foreground">
            Manage custom fields for {projectId ? 'this project' : 'the workspace'}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Custom Field</DialogTitle>
              <DialogDescription>
                Add a new custom field definition
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Field Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Priority"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Field Type</Label>
                <Select 
                  value={formData.field_type} 
                  onValueChange={(value) => setFormData({ ...formData, field_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              {needsOptions && (
                <div className="space-y-2">
                  <Label htmlFor="options">Options (comma-separated)</Label>
                  <Input
                    id="options"
                    value={formData.options.join(', ')}
                    onChange={(e) => {
                      const options = e.target.value.split(',').map(o => o.trim()).filter(o => o);
                      setFormData({ ...formData, options });
                    }}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="required">Required Field</Label>
                <Switch
                  id="required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="private">Private Field</Label>
                <Switch
                  id="private"
                  checked={formData.is_private}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : customFields && customFields.length > 0 ? (
        <div className="space-y-2">
          {customFields.map((field: any) => (
            <Card key={field.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings2 className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{field.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {field.field_type} {field.is_required && '• Required'} {field.is_private && '• Private'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this field?')) {
                        deleteMutation.mutate(field.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No custom fields yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create custom fields to capture additional data
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Field
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}