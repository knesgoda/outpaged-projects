import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseRealtimeProps {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

export function useRealtime({ table, onInsert, onUpdate, onDelete, filter }: UseRealtimeProps) {
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          console.log('Real-time INSERT:', payload);
          onInsert?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          console.log('Real-time UPDATE:', payload);
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          console.log('Real-time DELETE:', payload);
          onDelete?.(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onInsert, onUpdate, onDelete, filter]);
}