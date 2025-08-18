import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus,
  ExternalLink,
  Settings,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  attendees: string[];
  location?: string;
  description?: string;
  type: 'meeting' | 'deadline' | 'sprint' | 'review';
}

interface CalendarAccount {
  id: string;
  email: string;
  provider: 'google' | 'outlook';
  connected: boolean;
}

export function CalendarIntegration() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<CalendarAccount[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [createTasksFromEvents, setCreateTasksFromEvents] = useState(false);
  const [defaultCalendar, setDefaultCalendar] = useState<string>('');

  const connectAccount = async (provider: 'google' | 'outlook') => {
    setLoading(true);
    try {
      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newAccount: CalendarAccount = {
        id: Math.random().toString(),
        email: provider === 'google' ? 'user@gmail.com' : 'user@outlook.com',
        provider,
        connected: true
      };
      
      setAccounts(prev => [...prev, newAccount]);
      
      // Load sample events
      setEvents([
        {
          id: '1',
          title: 'Sprint Planning Meeting',
          start: '2024-01-15T09:00:00Z',
          end: '2024-01-15T10:30:00Z',
          attendees: ['john@company.com', 'jane@company.com'],
          type: 'sprint'
        },
        {
          id: '2',
          title: 'Product Demo',
          start: '2024-01-16T14:00:00Z',
          end: '2024-01-16T15:00:00Z',
          attendees: ['product@company.com'],
          type: 'review'
        },
        {
          id: '3',
          title: 'Project Deadline',
          start: '2024-01-20T17:00:00Z',
          end: '2024-01-20T17:00:00Z',
          attendees: [],
          type: 'deadline'
        }
      ]);
      
      toast({
        title: "Calendar Connected",
        description: `Successfully connected ${provider} calendar`,
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect ${provider} calendar`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTaskFromEvent = (event: CalendarEvent) => {
    toast({
      title: "Task Created",
      description: `Created task from event: ${event.title}`,
    });
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500/20 text-blue-700';
      case 'deadline': return 'bg-red-500/20 text-red-700';
      case 'sprint': return 'bg-green-500/20 text-green-700';
      case 'review': return 'bg-purple-500/20 text-purple-700';
      default: return 'bg-gray-500/20 text-gray-700';
    }
  };

  const formatEventTime = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const today = new Date();
    
    const isToday = startDate.toDateString() === today.toDateString();
    const isSameDay = startDate.toDateString() === endDate.toDateString();
    
    if (isToday) {
      if (isSameDay) {
        return `Today ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return `Today ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${startDate.toLocaleDateString()} ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Integration</h2>
          <p className="text-muted-foreground">Sync with Google Calendar and Outlook to manage deadlines and meetings</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connect Calendar Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">{account.email}</p>
                    <p className="text-sm text-muted-foreground capitalize">{account.provider}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <Badge variant="secondary">Connected</Badge>
                </div>
              </div>
            ))}
            
            {accounts.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No calendar accounts connected</p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => connectAccount('google')}
                disabled={loading}
                className="flex-1"
                variant="outline"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Google Calendar
              </Button>
              <Button
                onClick={() => connectAccount('outlook')}
                disabled={loading}
                className="flex-1"
                variant="outline"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Outlook
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable calendar sync</Label>
                <p className="text-sm text-muted-foreground">
                  Sync events and deadlines with your calendar
                </p>
              </div>
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-create tasks from events</Label>
                <p className="text-sm text-muted-foreground">
                  Create tasks from calendar events with specific keywords
                </p>
              </div>
              <Switch checked={createTasksFromEvents} onCheckedChange={setCreateTasksFromEvents} />
            </div>
            
            {accounts.length > 0 && (
              <div>
                <Label>Default calendar</Label>
                <Select value={defaultCalendar} onValueChange={setDefaultCalendar}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.email} ({account.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge className={getEventTypeColor(event.type)} variant="secondary">
                        {event.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatEventTime(event.start, event.end)}
                      </div>
                      {event.attendees.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.attendees.length} attendees
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createTaskFromEvent(event)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Task
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}