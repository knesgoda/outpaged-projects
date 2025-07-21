
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Smartphone, MessageSquare } from "lucide-react";

interface NotificationPreferences {
  email_mentions: boolean;
  email_task_updates: boolean;
  email_project_updates: boolean;
  push_mentions: boolean;
  push_task_updates: boolean;
  push_project_updates: boolean;
  in_app_mentions: boolean;
  in_app_task_updates: boolean;
  in_app_project_updates: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_mentions: true,
  email_task_updates: false,
  email_project_updates: true,
  push_mentions: true,
  push_task_updates: false,
  push_project_updates: false,
  in_app_mentions: true,
  in_app_task_updates: true,
  in_app_project_updates: true,
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          email_mentions: data.email_mentions ?? defaultPreferences.email_mentions,
          email_task_updates: data.email_task_updates ?? defaultPreferences.email_task_updates,
          email_project_updates: data.email_project_updates ?? defaultPreferences.email_project_updates,
          push_mentions: data.push_mentions ?? defaultPreferences.push_mentions,
          push_task_updates: data.push_task_updates ?? defaultPreferences.push_task_updates,
          push_project_updates: data.push_project_updates ?? defaultPreferences.push_project_updates,
          in_app_mentions: data.in_app_mentions ?? defaultPreferences.in_app_mentions,
          in_app_task_updates: data.in_app_task_updates ?? defaultPreferences.in_app_task_updates,
          in_app_project_updates: data.in_app_project_updates ?? defaultPreferences.in_app_project_updates,
        });
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification preferences saved successfully",
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const PreferenceSection = ({ 
    title, 
    icon, 
    items 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    items: Array<{ key: keyof NotificationPreferences; label: string; description: string }>;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-medium">{title}</h3>
      </div>
      <div className="space-y-3 ml-6">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={item.key} className="text-sm font-medium">
                {item.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {item.description}
              </p>
            </div>
            <Switch
              id={item.key}
              checked={preferences[item.key]}
              onCheckedChange={(value) => updatePreference(item.key, value)}
              disabled={loading}
            />
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="flex justify-between items-center">
                      <div className="space-y-2">
                        <div className="h-3 bg-muted animate-pulse rounded w-32" />
                        <div className="h-2 bg-muted animate-pulse rounded w-48" />
                      </div>
                      <div className="w-10 h-6 bg-muted animate-pulse rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <PreferenceSection
          title="Email Notifications"
          icon={<Mail className="w-4 h-4" />}
          items={[
            {
              key: 'email_mentions',
              label: 'Mentions',
              description: 'When someone mentions you in comments or descriptions'
            },
            {
              key: 'email_task_updates',
              label: 'Task Updates',
              description: 'When tasks you\'re assigned to are updated'
            },
            {
              key: 'email_project_updates',
              label: 'Project Updates',
              description: 'Important updates about projects you\'re involved in'
            }
          ]}
        />

        <Separator />

        <PreferenceSection
          title="Push Notifications"
          icon={<Smartphone className="w-4 h-4" />}
          items={[
            {
              key: 'push_mentions',
              label: 'Mentions',
              description: 'Instant notifications when you\'re mentioned'
            },
            {
              key: 'push_task_updates',
              label: 'Task Updates',
              description: 'Updates on your assigned tasks'
            },
            {
              key: 'push_project_updates',
              label: 'Project Updates',
              description: 'Important project notifications'
            }
          ]}
        />

        <Separator />

        <PreferenceSection
          title="In-App Notifications"
          icon={<MessageSquare className="w-4 h-4" />}
          items={[
            {
              key: 'in_app_mentions',
              label: 'Mentions',
              description: 'Show notifications when you\'re mentioned'
            },
            {
              key: 'in_app_task_updates',
              label: 'Task Updates',
              description: 'Show notifications for task changes'
            },
            {
              key: 'in_app_project_updates',
              label: 'Project Updates',
              description: 'Show notifications for project changes'
            }
          ]}
        />

        <div className="flex justify-end pt-4">
          <Button 
            onClick={savePreferences} 
            disabled={saving}
            className="bg-gradient-primary hover:opacity-90"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
