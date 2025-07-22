import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useIsAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        // Add timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Admin check timeout')), 5000)
        );

        const queryPromise = supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          // Additional validation to prevent privilege escalation
          setIsAdmin(Boolean(data?.is_admin) && user.email_confirmed_at !== null);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}