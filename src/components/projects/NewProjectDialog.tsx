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
import { useCreateProject } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (projectId: string) => void;
}

export function NewProjectDialog({ open, onOpenChange, onSuccess }: NewProjectDialogProps) {
  const { mutateAsync, isPending } = useCreateProject();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    try {
      const project = await mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
      });

      toast({
        title: "Project created",
        description: `"${trimmedName}" is ready.`,
      });

      onSuccess(project.id);
      onOpenChange(false);
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Could not create project",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Give your project a clear name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="project-name">
              Name
            </label>
            <Input
              id="project-name"
              value={name}
              onChange={event => {
                setName(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder="Launch plan"
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="project-description">
              Description
            </label>
            <Textarea
              id="project-description"
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="What should teammates know?"
              rows={4}
            />
          </div>
          <DialogFooter className="justify-end gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
