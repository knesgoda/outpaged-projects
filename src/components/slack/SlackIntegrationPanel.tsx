import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSlack } from '@/contexts/SlackContext';
import { useState } from 'react';
import { Slack, Plus, Trash2 } from 'lucide-react';

export function SlackIntegrationPanel() {
  const { settings, channelMappings, updateSettings, addChannelMapping, removeChannelMapping } = useSlack();
  const [newChannel, setNewChannel] = useState({ channel_id: '', channel_name: '' });

  const handleToggleIntegration = async (enabled: boolean) => {
    await updateSettings({ enabled });
  };

  const handleAddChannel = async () => {
    if (newChannel.channel_id && newChannel.channel_name) {
      await addChannelMapping({
        ...newChannel,
        notification_types: ['task_update', 'mention', 'deployment'],
      });
      setNewChannel({ channel_id: '', channel_name: '' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Slack className="w-5 h-5" />
            <CardTitle>Slack Integration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Integration</Label>
              <p className="text-sm text-muted-foreground">
                Connect OutPaged with your Slack workspace
              </p>
            </div>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={handleToggleIntegration}
            />
          </div>

          {settings?.enabled && (
            <>
              <div className="space-y-2">
                <Label>Workspace ID</Label>
                <Input
                  value={settings.workspace_id || ''}
                  onChange={(e) => updateSettings({ workspace_id: e.target.value })}
                  placeholder="T0123456789"
                />
              </div>

              <div className="space-y-2">
                <Label>Default Channel</Label>
                <Input
                  value={settings.default_channel || ''}
                  onChange={(e) => updateSettings({ default_channel: e.target.value })}
                  placeholder="#general"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {settings?.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Channel Mappings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Add New Channel</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Channel ID"
                  value={newChannel.channel_id}
                  onChange={(e) => setNewChannel({ ...newChannel, channel_id: e.target.value })}
                />
                <Input
                  placeholder="Channel Name"
                  value={newChannel.channel_name}
                  onChange={(e) => setNewChannel({ ...newChannel, channel_name: e.target.value })}
                />
                <Button onClick={handleAddChannel}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {channelMappings.map((mapping) => (
                <div key={mapping.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{mapping.channel_name}</p>
                    <p className="text-sm text-muted-foreground">{mapping.channel_id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeChannelMapping(mapping.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
