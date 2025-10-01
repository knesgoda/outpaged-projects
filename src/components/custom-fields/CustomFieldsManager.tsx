import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustomField {
  id?: string;
  name: string;
  field_type: 'text' | 'number' | 'select' | 'multi_select' | 'user' | 'team' | 'date' | 'date_range' | 'time_estimate' | 'story_points' | 'file' | 'url' | 'formula' | 'rollup';
  options: string[];
  formula?: string;
  rollup_config?: any;
  is_required: boolean;
  is_private: boolean;
  applies_to: string[];
  position: number;
}

interface CustomFieldsManagerProps {
  projectId: string;
}

export function CustomFieldsManager({ projectId }: CustomFieldsManagerProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newField, setNewField] = useState<CustomField>({
    name: "",
    field_type: "text",
    options: [],
    is_required: false,
    is_private: false,
    applies_to: ["task"],
    position: 0,
  });

  const [newOption, setNewOption] = useState("");

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("project_custom_fields")
        .select("*")
        .eq("project_id", projectId)
        .order("position");

      if (error) throw error;
      setFields((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching custom fields:", error);
      toast({
        title: "Error",
        description: "Failed to fetch custom fields",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCustomField = async () => {
    if (!newField.name) return;

    try {
      const { error } = await supabase.from("project_custom_fields").insert({
        project_id: projectId,
        ...newField,
        position: fields.length,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom field created successfully",
      });

      setNewField({
        name: "",
        field_type: "text",
        options: [],
        is_required: false,
        is_private: false,
        applies_to: ["task"],
        position: 0,
      });

      await fetchCustomFields();
    } catch (error: any) {
      console.error("Error creating custom field:", error);
      toast({
        title: "Error",
        description: "Failed to create custom field",
        variant: "destructive",
      });
    }
  };

  const deleteCustomField = async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from("project_custom_fields")
        .delete()
        .eq("id", fieldId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom field deleted",
      });

      await fetchCustomFields();
    } catch (error: any) {
      console.error("Error deleting custom field:", error);
      toast({
        title: "Error",
        description: "Failed to delete custom field",
        variant: "destructive",
      });
    }
  };

  const addOption = () => {
    if (newOption && !newField.options.includes(newOption)) {
      setNewField({
        ...newField,
        options: [...newField.options, newOption],
      });
      setNewOption("");
    }
  };

  const removeOption = (option: string) => {
    setNewField({
      ...newField,
      options: newField.options.filter((o) => o !== option),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>Add custom fields to track additional information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 border p-4 rounded-lg">
          <h3 className="font-semibold">Add New Field</h3>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="field-name">Field Name</Label>
              <Input
                id="field-name"
                placeholder="e.g., Customer Impact"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="field-type">Field Type</Label>
              <Select
                value={newField.field_type}
                onValueChange={(value: any) => setNewField({ ...newField, field_type: value })}
              >
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select">Select (Single)</SelectItem>
                  <SelectItem value="multi_select">Multi-Select</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="date_range">Date Range</SelectItem>
                  <SelectItem value="time_estimate">Time Estimate</SelectItem>
                  <SelectItem value="story_points">Story Points</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                  <SelectItem value="rollup">Rollup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newField.field_type === 'select' || newField.field_type === 'multi_select') && (
              <div>
                <Label>Options</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add option"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addOption()}
                  />
                  <Button onClick={addOption} type="button" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newField.options.map((option) => (
                    <Badge key={option} variant="outline">
                      {option}
                      <button onClick={() => removeOption(option)} className="ml-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {newField.field_type === 'formula' && (
              <div>
                <Label htmlFor="formula">Formula</Label>
                <Textarea
                  id="formula"
                  placeholder="e.g., story_points * 2"
                  value={newField.formula || ""}
                  onChange={(e) => setNewField({ ...newField, formula: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="is-required"
                checked={newField.is_required}
                onCheckedChange={(checked) => setNewField({ ...newField, is_required: checked })}
              />
              <Label htmlFor="is-required">Required Field</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-private"
                checked={newField.is_private}
                onCheckedChange={(checked) => setNewField({ ...newField, is_private: checked })}
              />
              <Label htmlFor="is-private">Private (Leadership/HR only)</Label>
            </div>

            <Button onClick={createCustomField} disabled={!newField.name}>
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Field
            </Button>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Existing Fields</h3>
            <div className="space-y-2">
              {fields.map((field) => (
                <Card key={field.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.name}</span>
                            <Badge variant="secondary">{field.field_type}</Badge>
                            {field.is_required && <Badge variant="destructive">Required</Badge>}
                            {field.is_private && <Badge variant="outline">Private</Badge>}
                          </div>
                          {field.options && field.options.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {field.options.map((opt) => (
                                <Badge key={opt} variant="outline" className="text-xs">
                                  {opt}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => field.id && deleteCustomField(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
