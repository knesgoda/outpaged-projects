import { supabase } from '@/integrations/supabase/client';
import type { Notification } from '@/types';

export async function listMyNotifications(): Promise<Notification[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, entity_type, entity_id, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    read_at: row.read_at,
    created_at: row.created_at,
  }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw error;
  }
}
