
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Webhook, Plus, Settings, Trash2, TestTube, Activity, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminGuard } from '@/components/security/AdminGuard';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  created_at: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
}

const availableEvents = [
  { id: 'task.created', name: 'Task Created', description: 'Triggered when a new task is created' },
  { id: 'task.updated', name: 'Task Updated', description: 'Triggered when a task is modified' },
  { id: 'task.completed', name: 'Task Completed', description: 'Triggered when a task is marked as complete' },
  { id: 'task.deleted', name: 'Task Deleted', description: 'Triggered when a task is deleted' },
  { id: 'project.created', name: 'Project Created', description: 'Triggered when a new project is created' },
  { id: 'project.updated', name: 'Project Updated', description: 'Triggered when a project is modified' },
  { id: 'user.invited', name: 'User Invited', description: 'Triggered when a user is invited to the team' },
  { id: 'user.joined', name: 'User Joined', description: 'Triggered when a user accepts an invitation' }
];

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load existing webhooks
    const loadWebhooks = async () => {
      try {
        // Mock data for demonstration
        const mockWebhooks: WebhookConfig[] = [
          {
            id: '1',
            name: 'Slack Integration',
            url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
            events: ['task.created', 'task.completed'],
            active: true,
            secret: 'webhook_secret_123',
            created_at: '2024-01-15T10:00:00Z',
            last_triggered: '2024-01-20T14:30:00Z',
            success_count: 42,
            failure_count: 2
          },
          {
            id: '2',
            name: 'Custom Dashboard',
            url: 'https://api.example.com/webhooks/project-updates',
            events: ['project.created', 'project.updated'],
            active: false,
            secret: 'webhook_secret_456',
            created_at: '2024-01-10T15:30:00Z',
            success_count: 15,
            failure_count: 0
          }
        ];
        setWebhooks(mockWebhooks);
      } catch (error) {
        console.error('Failed to load webhooks:', error);
      }
    };

    loadWebhooks();
  }, []);

  const handleCreateWebhook = async () => {
    try {
      if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields and select at least one event.',
          variant: 'destructive'
        });
        return;
      }

      const webhook: WebhookConfig = {
        id: Date.now().toString(),
        ...newWebhook,
        secret: `webhook_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        success_count: 0,
        failure_count: 0
      };

      setWebhooks(prev => [...prev, webhook]);
      setNewWebhook({ name: '', url: '', events: [], active: true });
      setIsCreateDialogOpen(false);

      toast({
        title: 'Webhook Created',
        description: `${webhook.name} has been created successfully.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create webhook. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      toast({
        title: 'Webhook Deleted',
        description: 'The webhook has been deleted successfully.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleWebhook = async (webhookId: string) => {
    try {
      setWebhooks(prev => prev.map(w => 
        w.id === webhookId ? { ...w, active: !w.active } : w
      ));
      
      const webhook = webhooks.find(w => w.id === webhookId);
      toast({
        title: webhook?.active ? 'Webhook Disabled' : 'Webhook Enabled',
        description: `${webhook?.name} has been ${webhook?.active ? 'disabled' : 'enabled'}.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update webhook. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    try {
      // Send test payload
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from OutPaged Project Management'
        }
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        toast({
          title: 'Test Successful',
          description: `Webhook ${webhook.name} responded successfully.`
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: `Failed to send test webhook to ${webhook.name}.`,
        variant: 'destructive'
      });
    }
  };

  const getEventBadgeColor = (eventId: string) => {
    if (eventId.startsWith('task.')) return 'bg-blue-100 text-blue-800';
    if (eventId.startsWith('project.')) return 'bg-green-100 text-green-800';
    if (eventId.startsWith('user.')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhook Management</h1>
            <p className="text-muted-foreground">Configure webhooks to integrate with external services</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Webhook</DialogTitle>
                <DialogDescription>
                  Set up a new webhook to receive notifications about events in your workspace.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Webhook Name</Label>
                  <Input
                    id="name"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Slack Integration"
                  />
                </div>
                <div>
                  <Label htmlFor="url">Webhook URL</Label>
                  <Input
                    id="url"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://your-service.com/webhook"
                  />
                </div>
                <div>
                  <Label>Events to Subscribe</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableEvents.map((event) => (
                      <div key={event.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={event.id}
                          checked={newWebhook.events.includes(event.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhook(prev => ({
                                ...prev,
                                events: [...prev.events, event.id]
                              }));
                            } else {
                              setNewWebhook(prev => ({
                                ...prev,
                                events: prev.events.filter(id => id !== event.id)
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={event.id} className="text-sm">
                          {event.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={newWebhook.active}
                    onCheckedChange={(checked) => setNewWebhook(prev => ({ ...prev, active: checked }))}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWebhook}>
                    Create Webhook
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Webhook className="h-5 w-5" />
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{webhook.name}</span>
                        <Badge variant={webhook.active ? 'default' : 'secondary'}>
                          {webhook.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{webhook.url}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestWebhook(webhook)}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                    <Switch
                      checked={webhook.active}
                      onCheckedChange={() => handleToggleWebhook(webhook.id)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{webhook.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteWebhook(webhook.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details" className="w-full">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Webhook Secret</Label>
                        <code className="block p-2 bg-muted rounded text-sm font-mono">
                          {webhook.secret}
                        </code>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Created</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(webhook.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {webhook.last_triggered && (
                      <div>
                        <Label className="text-sm font-medium">Last Triggered</Label>
                        <p className="text-sm text-muted-foreground">
                          {new Date(webhook.last_triggered).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="events" className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map((eventId) => {
                        const event = availableEvents.find(e => e.id === eventId);
                        return (
                          <Badge key={eventId} variant="outline" className={getEventBadgeColor(eventId)}>
                            {event?.name || eventId}
                          </Badge>
                        );
                      })}
                    </div>
                  </TabsContent>
                  <TabsContent value="stats" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-green-600">{webhook.success_count}</div>
                        <div className="text-sm text-muted-foreground">Successful Deliveries</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold text-red-600">{webhook.failure_count}</div>
                        <div className="text-sm text-muted-foreground">Failed Deliveries</div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>

        {webhooks.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Webhooks Configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first webhook to start receiving notifications about events in your workspace.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Webhook
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminGuard>
  );
}
