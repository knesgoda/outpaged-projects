import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Link, Trash2, GitBranch } from "lucide-react";
import { useTaskRelationships, TaskRelationshipType } from "@/hooks/useTaskRelationships";
import { Card } from "@/components/ui/card";

interface TaskRelationshipsDialogProps {
  taskId: string;
  taskTitle: string;
  children: React.ReactNode;
}

export const TaskRelationshipsDialog = ({ taskId, taskTitle, children }: TaskRelationshipsDialogProps) => {
  const { relationships, createRelationship, deleteRelationship, loading } = useTaskRelationships(taskId);
  const [isAddingRelationship, setIsAddingRelationship] = useState(false);
  const [newRelationship, setNewRelationship] = useState({
    target_task_id: "",
    relationship_type: "relates_to" as TaskRelationshipType,
    notes: "",
  });

  const handleCreateRelationship = async () => {
    if (!newRelationship.target_task_id) return;

    await createRelationship({
      source_task_id: taskId,
      target_task_id: newRelationship.target_task_id,
      relationship_type: newRelationship.relationship_type,
      notes: newRelationship.notes || undefined,
    });

    setNewRelationship({
      target_task_id: "",
      relationship_type: "relates_to",
      notes: "",
    });
    setIsAddingRelationship(false);
  };

  const getRelationshipLabel = (type: TaskRelationshipType) => {
    switch (type) {
      case "blocks":
        return "Blocks";
      case "depends_on":
        return "Depends On";
      case "relates_to":
        return "Relates To";
      case "duplicates":
        return "Duplicates";
      default:
        return type;
    }
  };

  const getRelationshipColor = (type: TaskRelationshipType) => {
    switch (type) {
      case "blocks":
        return "destructive";
      case "depends_on":
        return "default";
      case "relates_to":
        return "secondary";
      case "duplicates":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Task Dependencies - {taskTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Relationships */}
          <div>
            <h3 className="text-sm font-medium mb-3">Current Relationships</h3>
            {relationships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No relationships defined</p>
            ) : (
              <div className="space-y-2">
                {relationships.map((relationship) => (
                  <Card key={relationship.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={getRelationshipColor(relationship.relationship_type)}>
                          {getRelationshipLabel(relationship.relationship_type)}
                        </Badge>
                        <div className="text-sm">
                          <span className="font-medium">
                            {relationship.source_task_id === taskId 
                              ? relationship.target_task_title 
                              : relationship.source_task_title}
                          </span>
                          {relationship.notes && (
                            <p className="text-muted-foreground">{relationship.notes}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRelationship(relationship.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add New Relationship */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Add Relationship</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingRelationship(!isAddingRelationship)}
              >
                <Link className="h-4 w-4 mr-2" />
                Add Relationship
              </Button>
            </div>

            {isAddingRelationship && (
              <Card className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="target-task">Target Task ID</Label>
                    <Input
                      id="target-task"
                      placeholder="Enter task ID to link to"
                      value={newRelationship.target_task_id}
                      onChange={(e) =>
                        setNewRelationship({ ...newRelationship, target_task_id: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="relationship-type">Relationship Type</Label>
                    <Select
                      value={newRelationship.relationship_type}
                      onValueChange={(value: TaskRelationshipType) =>
                        setNewRelationship({ ...newRelationship, relationship_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blocks">Blocks</SelectItem>
                        <SelectItem value="depends_on">Depends On</SelectItem>
                        <SelectItem value="relates_to">Relates To</SelectItem>
                        <SelectItem value="duplicates">Duplicates</SelectItem>
                        
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about this relationship"
                      value={newRelationship.notes}
                      onChange={(e) =>
                        setNewRelationship({ ...newRelationship, notes: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateRelationship} disabled={!newRelationship.target_task_id}>
                      Create Relationship
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingRelationship(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
