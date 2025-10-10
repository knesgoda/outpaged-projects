import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCreateProject } from "@/hooks/useProjects";
import type { ProjectStatus } from "@/services/projects";
import { PROJECT_STATUS_FILTER_OPTIONS } from "@/utils/project-status";

const creatableStatusOptions = PROJECT_STATUS_FILTER_OPTIONS.filter(
  option => option.value !== "archived",
);

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: any) => void;
}

export function ProjectDialog({ open, onOpenChange, onSuccess }: ProjectDialogProps) {
  const { toast } = useToast();
  const createProject = useCreateProject();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    status: "planning" as Exclude<ProjectStatus, "archived">,
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const project = await createProject.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        code: formData.code || undefined,
        status: formData.status,
        start_date: formData.startDate ? formData.startDate.toISOString().split('T')[0] : undefined,
        end_date: formData.endDate ? formData.endDate.toISOString().split('T')[0] : undefined,
      });

      toast({
        title: "Project Created",
        description: `${formData.name} has been created successfully.`,
      });

      onSuccess?.(project);
      handleClose();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      code: "",
      status: "planning",
      startDate: undefined,
      endDate: undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your team's work and track progress.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name..."
              required
            />
          </div>

          {/* Description */}
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

          {/* Project Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Project Code/Abbreviation (Optional)</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => {
                const newCode = e.target.value.toUpperCase();
                setFormData(prev => ({ ...prev, code: newCode }));
              }}
              placeholder="IRP, PROJ, DEV..."
              maxLength={10}
            />
            <p className="text-sm text-muted-foreground">
              For task numbering ({formData.code || 'CODE'}-1) and custom URLs
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Project Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: Exclude<ProjectStatus, "archived">) =>
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {creatableStatusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, startDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, endDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name.trim() || createProject.isPending}>
              {createProject.isPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}