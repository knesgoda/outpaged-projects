import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Users, 
  CheckSquare, 
  Plus,
  Save,
  Sparkles,
  User
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Attendee {
  id: string;
  name: string;
  present: boolean;
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate?: string;
  completed: boolean;
}

interface MeetingNotes {
  id: string;
  title: string;
  date: string;
  duration: string;
  attendees: Attendee[];
  agenda: string;
  notes: string;
  decisions: string[];
  actionItems: ActionItem[];
}

export function MeetingNotesEditor() {
  const [meeting, setMeeting] = useState<MeetingNotes>({
    id: '1',
    title: 'Sprint Planning Meeting',
    date: new Date().toISOString().split('T')[0],
    duration: '60 minutes',
    attendees: [
      { id: '1', name: 'Alice Johnson', present: true },
      { id: '2', name: 'Bob Smith', present: true },
      { id: '3', name: 'Carol Davis', present: false },
    ],
    agenda: '1. Review last sprint\n2. Plan current sprint\n3. Discuss blockers',
    notes: '',
    decisions: [],
    actionItems: []
  });

  const [newDecision, setNewDecision] = useState('');
  const [newActionItem, setNewActionItem] = useState({ description: '', assignee: '' });

  const handleAddDecision = () => {
    if (newDecision.trim()) {
      setMeeting(prev => ({
        ...prev,
        decisions: [...prev.decisions, newDecision]
      }));
      setNewDecision('');
    }
  };

  const handleAddActionItem = () => {
    if (newActionItem.description.trim() && newActionItem.assignee.trim()) {
      setMeeting(prev => ({
        ...prev,
        actionItems: [...prev.actionItems, {
          id: Date.now().toString(),
          ...newActionItem,
          completed: false
        }]
      }));
      setNewActionItem({ description: '', assignee: '' });
      toast({
        title: "Action Item Added",
        description: "This can be converted to a task",
      });
    }
  };

  const handleExtractActionItems = () => {
    // Simple regex to find action items in notes
    const actionItemPattern = /(?:TODO|ACTION|TASK):\s*(.+?)(?:\n|$)/gi;
    const matches = [...meeting.notes.matchAll(actionItemPattern)];
    
    if (matches.length > 0) {
      const extracted: ActionItem[] = matches.map((match, idx) => ({
        id: `extracted-${Date.now()}-${idx}`,
        description: match[1].trim(),
        assignee: 'Unassigned',
        completed: false
      }));

      setMeeting(prev => ({
        ...prev,
        actionItems: [...prev.actionItems, ...extracted]
      }));

      toast({
        title: "Action Items Extracted",
        description: `Found ${extracted.length} action items in notes`,
      });
    } else {
      toast({
        title: "No Action Items Found",
        description: "Try adding TODO:, ACTION:, or TASK: in your notes",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    toast({
      title: "Meeting Notes Saved",
      description: "Notes have been saved successfully",
    });
  };

  return (
    <div className="space-y-6">
      {/* Meeting Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Input
                value={meeting.title}
                onChange={(e) => setMeeting(prev => ({ ...prev, title: e.target.value }))}
                className="text-2xl font-bold mb-2"
              />
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <Input
                    type="date"
                    value={meeting.date}
                    onChange={(e) => setMeeting(prev => ({ ...prev, date: e.target.value }))}
                    className="w-auto"
                  />
                </div>
                <div>Duration: {meeting.duration}</div>
              </div>
            </div>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Notes
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Attendees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {meeting.attendees.map(attendee => (
              <div key={attendee.id} className="flex items-center gap-3">
                <Checkbox
                  checked={attendee.present}
                  onCheckedChange={(checked) => {
                    setMeeting(prev => ({
                      ...prev,
                      attendees: prev.attendees.map(a =>
                        a.id === attendee.id ? { ...a, present: !!checked } : a
                      )
                    }));
                  }}
                />
                <User className="h-4 w-4 text-muted-foreground" />
                <span className={attendee.present ? '' : 'text-muted-foreground line-through'}>
                  {attendee.name}
                </span>
                {attendee.present && <Badge variant="outline">Present</Badge>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agenda */}
      <Card>
        <CardHeader>
          <CardTitle>Agenda</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={meeting.agenda}
            onChange={(e) => setMeeting(prev => ({ ...prev, agenda: e.target.value }))}
            placeholder="Meeting agenda items..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Discussion Notes</CardTitle>
            <Button onClick={handleExtractActionItems} variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Extract Action Items
            </Button>
          </div>
          <CardDescription>
            Use TODO:, ACTION:, or TASK: to mark action items in your notes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={meeting.notes}
            onChange={(e) => setMeeting(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Meeting discussion notes..."
            className="min-h-[200px]"
          />
        </CardContent>
      </Card>

      {/* Decisions */}
      <Card>
        <CardHeader>
          <CardTitle>Key Decisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newDecision}
              onChange={(e) => setNewDecision(e.target.value)}
              placeholder="Add a decision made..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddDecision()}
            />
            <Button onClick={handleAddDecision} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {meeting.decisions.map((decision, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>{decision}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Action Items
          </CardTitle>
          <CardDescription>
            Action items can be converted to tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={newActionItem.description}
              onChange={(e) => setNewActionItem(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What needs to be done?"
            />
            <div className="flex gap-2">
              <Input
                value={newActionItem.assignee}
                onChange={(e) => setNewActionItem(prev => ({ ...prev, assignee: e.target.value }))}
                placeholder="Assignee"
              />
              <Button onClick={handleAddActionItem} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {meeting.actionItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) => {
                    setMeeting(prev => ({
                      ...prev,
                      actionItems: prev.actionItems.map(a =>
                        a.id === item.id ? { ...a, completed: !!checked } : a
                      )
                    }));
                  }}
                />
                <div className="flex-1">
                  <p className={item.completed ? 'line-through text-muted-foreground' : ''}>
                    {item.description}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assigned to: {item.assignee}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Create Task
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
