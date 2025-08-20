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
        setLoading(true);
        
        // Add timeout to prevent hanging requests
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Admin check timeout')), 10000)
        );

        const queryPromise = supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          // Silently fail for non-critical admin checks to prevent UI disruption
          if (error.message !== 'Admin check timeout') {
            console.warn('Admin status check failed (non-critical):', error.message);
          }
          setIsAdmin(false);
        } else {
          // Additional validation to prevent privilege escalation
          const isAdminUser = Boolean(data?.is_admin) && user.email_confirmed_at !== null;
          setIsAdmin(isAdminUser);
        }
      } catch (error) {
        // Graceful fallback - don't break the UI
        console.warn('Admin check failed (non-critical):', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}