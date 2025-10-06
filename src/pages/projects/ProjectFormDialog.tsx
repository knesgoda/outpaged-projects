import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ProjectSummary, useCreateProject, useUpdateProject } from "@/hooks/useProjects";

interface ProjectFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  project?: ProjectSummary | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (projectId: string) => void;
}

export function ProjectFormDialog({
  open,
  mode,
  project,
  onOpenChange,
  onSuccess,
}: ProjectFormDialogProps) {
  const isEdit = mode === "edit" && project;
  const { mutateAsync: createProject, isPending: isCreating } = useCreateProject();
  const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProject();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
    }
  }, [open, project?.name, project?.description]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast({
        title: "Name required",
        description: "Enter a project name to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEdit && project) {
        const result = await updateProject({
          id: project.id,
          patch: {
            name: trimmedName,
            description: description.trim() ? description.trim() : null,
          },
        });
        toast({ title: "Project updated" });
        onSuccess?.(result.id);
      } else {
        const result = await createProject({
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
        });
        toast({ title: "Project created" });
        onSuccess?.(result.id);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = isEdit ? isUpdating : isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the project name or description." : "Create a project to get started."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Website redesign"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Share a quick summary"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
