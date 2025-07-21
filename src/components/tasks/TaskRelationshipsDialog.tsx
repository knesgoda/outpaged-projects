import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useTaskRelationships,
  CreateTaskRelationshipData,
  TaskRelationship,
} from '@/hooks/useTaskRelationships';
import {
  Link,
  GitBranch,
  Copy,
  Trash2,
  Plus,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
} from 'lucide-react';

interface TaskRelationshipsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
  projectId: string;
}

const relationshipTypeConfig = {
  blocks: {
    icon: ArrowRight,
    label: 'Blocks',
    description: 'This task blocks the target task',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  depends_on: {
    icon: ArrowLeft,
    label: 'Depends on',
    description: 'This task depends on the target task',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  duplicates: {
    icon: Copy,
    label: 'Duplicates',
    description: 'This task is a duplicate of the target task',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  relates_to: {
    icon: Link,
    label: 'Relates to',
    description: 'This task relates to the target task',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

export function TaskRelationshipsDialog({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  projectId,
}: TaskRelationshipsDialogProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteRelationshipId, setDeleteRelationshipId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CreateTaskRelationshipData>>({
    relationship_type: 'relates_to',
    notes: '',
  });

  const {
    relationships,
    loading,
    tasks,
    fetchAvailableTasks,
    createRelationship,
    deleteRelationship,
  } = useTaskRelationships(taskId);

  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    fetchAvailableTasks(projectId, taskId);
  };

  const handleCreateRelationship = async () => {
    if (!formData.target_task_id || !formData.relationship_type) return;

    const relationshipData: CreateTaskRelationshipData = {
      source_task_id: taskId,
      target_task_id: formData.target_task_id,
      relationship_type: formData.relationship_type,
      notes: formData.notes,
    };

    const result = await createRelationship(relationshipData);
    if (result) {
      setShowCreateForm(false);
      setFormData({
        relationship_type: 'relates_to',
        notes: '',
      });
    }
  };

  const handleDeleteRelationship = async () => {
    if (!deleteRelationshipId) return;
    await deleteRelationship(deleteRelationshipId);
    setDeleteRelationshipId(null);
  };

  const getRelationshipDisplay = (relationship: TaskRelationship) => {
    const isSource = relationship.source_task_id === taskId;
    const type = relationship.relationship_type;
    const config = relationshipTypeConfig[type];
    const Icon = config.icon;

    return {
      title: isSource ? relationship.target_task_title : relationship.source_task_title,
      status: isSource ? relationship.target_task_status : relationship.source_task_status,
      direction: isSource ? 'outgoing' : 'incoming',
      icon: Icon,
      config,
    };
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Task Relationships</DialogTitle>
            <DialogDescription>
              Manage relationships for task: <strong>{taskTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create New Relationship */}
            {!showCreateForm ? (
              <Button onClick={handleShowCreateForm} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Relationship
              </Button>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">Create New Relationship</h3>
                
                <div className="space-y-2">
                  <Label>Relationship Type</Label>
                  <Select
                    value={formData.relationship_type}
                    onValueChange={(value) =>
                      setFormData(prev => ({ 
                        ...prev, 
                        relationship_type: value as CreateTaskRelationshipData['relationship_type']
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(relationshipTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.relationship_type && (
                    <p className="text-sm text-muted-foreground">
                      {relationshipTypeConfig[formData.relationship_type].description}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Target Task</Label>
                  <Select
                    value={formData.target_task_id || ''}
                    onValueChange={(value) =>
                      setFormData(prev => ({ ...prev, target_task_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{task.title}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {task.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add any additional context..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateRelationship}
                    disabled={!formData.target_task_id || !formData.relationship_type}
                  >
                    Create Relationship
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ relationship_type: 'relates_to', notes: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <Separator />

            {/* Existing Relationships */}
            <div className="space-y-4">
              <h3 className="font-semibold">Existing Relationships</h3>
              
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading relationships...
                </div>
              ) : relationships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No relationships found for this task.
                </div>
              ) : (
                <div className="space-y-3">
                  {relationships.map((relationship) => {
                    const display = getRelationshipDisplay(relationship);
                    const Icon = display.icon;
                    
                    return (
                      <div
                        key={relationship.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-md ${display.config.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {display.config.label}
                              </span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{display.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {display.status}
                              </Badge>
                            </div>
                            
                            {relationship.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {relationship.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteRelationshipId(relationship.id)}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteRelationshipId !== null} 
        onOpenChange={() => setDeleteRelationshipId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task relationship? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRelationship}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
