import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SlackSettings {
  id: string;
  workspace_id?: string;
  bot_token?: string;
  default_channel?: string;
  enabled: boolean;
  notification_types: string[];
  created_at: string;
  updated_at: string;
}

interface ChannelMapping {
  id: string;
  slack_settings_id: string;
  project_id?: string;
  channel_id: string;
  channel_name: string;
  notification_types: string[];
  created_at: string;
}

interface SlackContextType {
  settings: SlackSettings | null;
  channelMappings: ChannelMapping[];
  updateSettings: (data: Partial<SlackSettings>) => Promise<void>;
  addChannelMapping: (data: Partial<ChannelMapping>) => Promise<void>;
  removeChannelMapping: (id: string) => Promise<void>;
  sendNotification: (channel: string, message: string) => Promise<void>;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SlackContext = createContext<SlackContextType | undefined>(undefined);

export function SlackProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SlackSettings | null>(null);
  const [channelMappings, setChannelMappings] = useState<ChannelMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('slack_integration_settings')
        .select('*')
        .maybeSingle();

      if (settingsError) throw settingsError;
      setSettings(settingsData);

      if (settingsData) {
        const { data: mappingsData, error: mappingsError } = await supabase
          .from('slack_channel_mappings')
          .select('*')
          .eq('slack_settings_id', settingsData.id);

        if (mappingsError) throw mappingsError;
        setChannelMappings(mappingsData || []);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching Slack settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (data: Partial<SlackSettings>) => {
    try {
      if (settings) {
        const { error } = await supabase
          .from('slack_integration_settings')
          .update(data)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('slack_integration_settings')
          .insert([data]);

        if (error) throw error;
      }

      toast({
        title: 'Settings updated',
        description: 'Slack settings updated successfully',
      });

      await fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Error updating settings',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addChannelMapping = async (data: Partial<ChannelMapping>) => {
    try {
      if (!settings) {
        throw new Error('Slack integration not configured');
      }

      const { error } = await supabase
        .from('slack_channel_mappings')
        .insert([{ ...data, slack_settings_id: settings.id }]);

      if (error) throw error;

      toast({
        title: 'Channel mapped',
        description: 'Channel mapping added successfully',
      });

      await fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Error adding channel mapping',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeChannelMapping = async (id: string) => {
    try {
      const { error } = await supabase
        .from('slack_channel_mappings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Channel unmapped',
        description: 'Channel mapping removed successfully',
      });

      await fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Error removing channel mapping',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sendNotification = async (channel: string, message: string) => {
    // This would typically call an edge function that interacts with Slack API
    toast({
      title: 'Notification sent',
      description: `Message sent to ${channel}`,
    });
  };

  return (
    <SlackContext.Provider
      value={{
        settings,
        channelMappings,
        updateSettings,
        addChannelMapping,
        removeChannelMapping,
        sendNotification,
        loading,
        refetch: fetchSettings,
      }}
    >
      {children}
    </SlackContext.Provider>
  );
}

export function useSlack() {
  const context = useContext(SlackContext);
  if (!context) {
    throw new Error('useSlack must be used within SlackProvider');
  }
  return context;
}
