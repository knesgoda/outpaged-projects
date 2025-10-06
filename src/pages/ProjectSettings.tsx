import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useProjectNavigation } from "@/hooks/useProjectNavigation";
import { validateUniqueProjectCode } from "@/lib/validation";
import { useProjectId } from "@/hooks/useProjectId";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useProjectId } from "@/hooks/useProjectId";

export default function ProjectSettings({ overrideProjectId }: { overrideProjectId?: string }) {
  const paramsProjectId = useProjectId();
  const projectId = overrideProjectId || paramsProjectId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { navigateToProject } = useProjectNavigation();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{ isValid: boolean; message: string }>({ isValid: true, message: "" });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    status: "planning" as "planning" | "active" | "completed" | "on_hold" | "cancelled",
  });

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      
      setProject(data);
      setFormData({
        name: data.name || "",
        description: data.description || "",
        code: data.code || "",
        status: data.status || "planning",
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Error",
        description: "Failed to load project settings",
        variant: "destructive",
      });
      navigate('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  const validateCode = async (code: string) => {
    if (!code.trim()) {
      setCodeValidation({ isValid: true, message: "" });
      return;
    }

    if (!/^[A-Z0-9-]{2,10}$/.test(code)) {
      setCodeValidation({ isValid: false, message: "Code must be 2-10 uppercase letters, numbers, or hyphens" });
      return;
    }

    const isUnique = await validateUniqueProjectCode(code, projectId);
    if (!isUnique) {
      setCodeValidation({ isValid: false, message: "This code is already in use" });
    } else {
      setCodeValidation({ isValid: true, message: "Code is available" });
    }
  };

  const handleSave = async () => {
    if (!project || !user) return;

    // Validate code before saving
    if (formData.code && !codeValidation.isValid) {
      toast({
        title: "Invalid Code",
        description: "Please fix the project code before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: formData.name,
          description: formData.description || null,
          code: formData.code || null,
          status: formData.status,
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Project settings have been updated successfully.",
      });

      // Update local state
      setProject(prev => ({ ...prev, ...formData }));
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Error",
        description: "Failed to save project settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Project Deleted",
        description: "The project has been deleted successfully.",
      });

      navigate('/dashboard/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => project && navigateToProject(project)}
        >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Project Settings</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateToProject(project)}
          >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Project Settings</h1>
          <p className="text-muted-foreground">Manage your project configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Update your project's basic information and status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter project name..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the project..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Project Code/Abbreviation</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => {
                    const newCode = e.target.value.toUpperCase();
                    setFormData(prev => ({ ...prev, code: newCode }));
                    validateCode(newCode);
                  }}
                  placeholder="IRP, PROJ, DEV..."
                  maxLength={10}
                  className={!codeValidation.isValid ? "border-destructive" : ""}
                />
                <p className="text-sm text-muted-foreground">
                  2-10 uppercase letters/numbers. Used for task numbering ({formData.code || 'CODE'}-1, {formData.code || 'CODE'}-2) and URLs.
                </p>
                {codeValidation.message && (
                  <p className={`text-sm ${codeValidation.isValid ? 'text-green-600' : 'text-destructive'}`}>
                    {codeValidation.message}
                  </p>
                )}
                {formData.code && codeValidation.isValid && (
                  <p className="text-sm text-blue-600">
                    URL will be: /projects/{formData.code.toLowerCase()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Project Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={saving || !formData.name.trim()}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <div className="space-y-6">
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the project
                      "{project?.name}" and remove all associated data including tasks, 
                      time entries, and team members.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Deleting..." : "Delete Project"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}