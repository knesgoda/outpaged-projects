
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Folder, 
  Plus, 
  Code, 
  Bug, 
  Zap, 
  Users, 
  FileText,
  Star
} from "lucide-react";

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  task_type: string;
  priority: string;
  hierarchy_level: string;
  estimated_hours?: number;
  checklist?: string[];
  tags?: string[];
}

interface TaskTemplatesProps {
  projectId: string;
  onTaskCreated: () => void;
}

const predefinedTemplates: TaskTemplate[] = [
  {
    id: "bug-fix",
    name: "Bug Fix",
    description: "Fix a reported bug or issue",
    task_type: "bug",
    priority: "high",
    hierarchy_level: "task",
    estimated_hours: 4,
    checklist: [
      "Reproduce the bug",
      "Identify root cause",
      "Implement fix",
      "Write/update tests",
      "Test fix thoroughly",
      "Update documentation if needed"
    ],
    tags: ["bug", "fix"]
  },
  {
    id: "feature-request",
    name: "New Feature",
    description: "Implement a new feature or enhancement",
    task_type: "feature_request",
    priority: "medium",
    hierarchy_level: "story",
    estimated_hours: 8,
    checklist: [
      "Review requirements",
      "Design solution",
      "Implement feature",
      "Write tests",
      "Update documentation",
      "Get stakeholder approval"
    ],
    tags: ["feature", "enhancement"]
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Review code changes and provide feedback",
    task_type: "task",
    priority: "medium",
    hierarchy_level: "task",
    estimated_hours: 2,
    checklist: [
      "Review code changes",
      "Check for best practices",
      "Verify tests are included",
      "Provide constructive feedback",
      "Approve or request changes"
    ],
    tags: ["review", "code-quality"]
  },
  {
    id: "user-story",
    name: "User Story",
    description: "As a [user type], I want [functionality] so that [benefit]",
    task_type: "story",
    priority: "medium",
    hierarchy_level: "story",
    estimated_hours: 12,
    checklist: [
      "Define acceptance criteria",
      "Create wireframes/mockups",
      "Break down into tasks",
      "Implement functionality",
      "Test with users",
      "Deploy and monitor"
    ],
    tags: ["user-story", "ux"]
  },
  {
    id: "spike",
    name: "Research Spike",
    description: "Research and investigate technical solutions",
    task_type: "task",
    priority: "medium",
    hierarchy_level: "task",
    estimated_hours: 6,
    checklist: [
      "Define research questions",
      "Gather information",
      "Evaluate options",
      "Create proof of concept",
      "Document findings",
      "Present recommendations"
    ],
    tags: ["research", "spike"]
  },
  {
    id: "documentation",
    name: "Documentation",
    description: "Create or update project documentation",
    task_type: "task",
    priority: "low",
    hierarchy_level: "task",
    estimated_hours: 3,
    checklist: [
      "Identify documentation needs",
      "Write clear content",
      "Include examples",
      "Review for accuracy",
      "Publish and share",
      "Get feedback"
    ],
    tags: ["documentation", "knowledge"]
  }
];

const templateIcons = {
  "bug-fix": Bug,
  "feature-request": Zap,
  "code-review": Code,
  "user-story": Users,
  "spike": Star,
  "documentation": FileText
};

export function TaskTemplates({ projectId, onTaskCreated }: TaskTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const createTaskFromTemplate = async (template: TaskTemplate) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: template.name,
          description: `${template.description}\n\n**Checklist:**\n${template.checklist?.map(item => `- [ ] ${item}`).join('\n') || ''}`,
          priority: template.priority as any,
          status: 'todo',
          hierarchy_level: template.hierarchy_level as any,
          task_type: template.task_type as any,
          project_id: projectId,
          reporter_id: user.id,
          story_points: Math.ceil((template.estimated_hours || 4) / 4), // Convert hours to story points
          blocked: false,
          blocking_reason: null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Created "${template.name}" task from template`,
      });

      setOpen(false);
      onTaskCreated();
    } catch (error) {
      console.error('Error creating task from template:', error);
      toast({
        title: "Error",
        description: "Failed to create task from template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Folder className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Templates</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {predefinedTemplates.map((template) => {
            const IconComponent = templateIcons[template.id as keyof typeof templateIcons] || Folder;
            
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <IconComponent className="w-5 h-5" />
                    {template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{template.task_type.replace('_', ' ')}</Badge>
                    <Badge variant="outline">{template.priority}</Badge>
                    <Badge variant="outline">{template.hierarchy_level}</Badge>
                    {template.estimated_hours && (
                      <Badge variant="outline">{template.estimated_hours}h</Badge>
                    )}
                  </div>
                  
                  {template.checklist && template.checklist.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Includes checklist:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {template.checklist.slice(0, 3).map((item, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                            {item}
                          </li>
                        ))}
                        {template.checklist.length > 3 && (
                          <li className="text-xs">...and {template.checklist.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full" 
                    onClick={() => createTaskFromTemplate(template)}
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Use Template"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
