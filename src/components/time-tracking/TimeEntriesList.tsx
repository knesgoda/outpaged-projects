import { useState } from 'react';
import { Clock, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTimeTracking, TimeEntry } from '@/hooks/useTimeTracking';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface TimeEntriesListProps {
  taskId?: string;
  showTaskInfo?: boolean;
}

export function TimeEntriesList({ taskId, showTaskInfo = false }: TimeEntriesListProps) {
  const { user } = useAuth();
  const {
    timeEntries,
    deleteTimeEntry,
    updateTimeEntry,
    formatDuration,
  } = useTimeTracking(taskId);

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editDescription, setEditDescription] = useState('');

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  const filteredEntries = taskId 
    ? timeEntries.filter(entry => entry.task_id === taskId)
    : timeEntries;

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditDescription(entry.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    await updateTimeEntry(editingEntry.id, {
      description: editDescription || null,
    });
    
    setEditingEntry(null);
    setEditDescription('');
  };

  const handleDelete = async (entryId: string) => {
    await deleteTimeEntry(entryId);
  };

  const totalTime = filteredEntries
    .filter(entry => entry.duration_minutes)
    .reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);

  if (filteredEntries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No time entries yet. Start tracking time to see entries here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Entries
          {totalTime > 0 && (
            <Badge variant="secondary" className="ml-auto">
              Total: {formatDuration(totalTime)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(entry.started_at), 'MMM d, h:mm a')}
                  {entry.ended_at && ` - ${format(new Date(entry.ended_at), 'h:mm a')}`}
                </span>
                {entry.is_running && (
                  <Badge variant="secondary" className="text-xs">
                    Running
                  </Badge>
                )}
              </div>
              
              {entry.description && (
                <p className="text-sm">{entry.description}</p>
              )}
              
              <div className="flex items-center gap-2">
                {entry.duration_minutes ? (
                  <Badge variant="outline" className="text-xs">
                    {formatDuration(entry.duration_minutes)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    In progress
                  </Badge>
                )}
              </div>
            </div>

            {!entry.is_running && (
              <div className="flex items-center gap-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(entry)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Time Entry</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="What were you working on?"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setEditingEntry(null)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Time Entry</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this time entry? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(entry.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}