import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { securityHeaders } from '@/lib/security';

interface SecurityEvent {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  success: boolean;
  error_message?: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface SecurityMetrics {
  totalEvents: number;
  failedAttempts: number;
  successfulActions: number;
  recentEvents: SecurityEvent[];
  suspiciousActivity: number;
}

interface RateLimitStatus {
  isLimited: boolean;
  remainingAttempts: number;
  resetTime?: Date;
}

export function useSecurityMonitoring() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    failedAttempts: 0,
    successfulActions: 0,
    recentEvents: [],
    suspiciousActivity: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log security events
  const logSecurityEvent = useCallback(async (
    action: string,
    resourceType: string,
    success: boolean = true,
    metadata: Record<string, any> = {},
    errorMessage?: string
  ) => {
    try {
      // In a real implementation, this would be sent to a secure logging service
      // For now, we'll log locally and attempt to send to our audit system
      const event = {
        user_id: user?.id,
        action,
        resource_type: resourceType,
        success,
        error_message: errorMessage,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href,
        },
      };

      // Log to console for development
      console.log('[Security Event]', event);

      // In production, send to audit service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/security/audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...securityHeaders,
          },
          body: JSON.stringify(event),
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [user]);

  // Check rate limiting
  const checkRateLimit = useCallback(async (
    action: string,
    identifier: string = user?.id || 'anonymous'
  ): Promise<RateLimitStatus> => {
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('identifier', identifier)
        .eq('action_type', action)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        return { isLimited: false, remainingAttempts: 100 };
      }

      const windowStart = new Date(data.window_start);
      const now = new Date();
      const windowDuration = 15 * 60 * 1000; // 15 minutes

      // Check if window has expired
      if (now.getTime() - windowStart.getTime() > windowDuration) {
        return { isLimited: false, remainingAttempts: 100 };
      }

      const remainingAttempts = Math.max(0, 100 - data.attempts);
      const isLimited = remainingAttempts === 0;
      const resetTime = new Date(windowStart.getTime() + windowDuration);

      return { isLimited, remainingAttempts, resetTime };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { isLimited: false, remainingAttempts: 100 };
    }
  }, [user]);

  // Monitor suspicious activity patterns
  const detectSuspiciousActivity = useCallback((events: SecurityEvent[]): number => {
    if (events.length === 0) return 0;

    let suspiciousScore = 0;

    // Check for multiple failed attempts
    const failedAttempts = events.filter(e => !e.success).length;
    if (failedAttempts > 5) suspiciousScore += 3;

    // Check for rapid-fire requests
    const recentEvents = events.filter(e => {
      const eventTime = new Date(e.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return eventTime > fiveMinutesAgo;
    });
    if (recentEvents.length > 20) suspiciousScore += 2;

    // Check for admin privilege escalation attempts
    const adminAttempts = events.filter(e => 
      e.action.includes('admin') && !e.success
    ).length;
    if (adminAttempts > 0) suspiciousScore += 5;

    // Check for SQL injection patterns in metadata
    const sqlPatterns = events.filter(e => {
      const metadata = JSON.stringify(e.metadata).toLowerCase();
      return metadata.includes('select') || 
             metadata.includes('drop') || 
             metadata.includes('union') ||
             metadata.includes('script');
    }).length;
    if (sqlPatterns > 0) suspiciousScore += 4;

    return Math.min(suspiciousScore, 10); // Cap at 10
  }, []);

  // Load security metrics
  const loadMetrics = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: events, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const totalEvents = events?.length || 0;
      const failedAttempts = events?.filter(e => !e.success).length || 0;
      const successfulActions = events?.filter(e => e.success).length || 0;
      const recentEvents = (events?.slice(0, 10) || []).map(event => ({
        ...event,
        metadata: typeof event.metadata === 'object' ? event.metadata as Record<string, any> : {},
        ip_address: event.ip_address as string | null,
        user_agent: event.user_agent as string | null,
        error_message: event.error_message as string | null,
      }));
      const suspiciousActivity = detectSuspiciousActivity(recentEvents);

      setMetrics({
        totalEvents,
        failedAttempts,
        successfulActions,
        recentEvents,
        suspiciousActivity,
      });
    } catch (error) {
      console.error('Failed to load security metrics:', error);
      setError('Failed to load security metrics');
    } finally {
      setIsLoading(false);
    }
  }, [user, detectSuspiciousActivity]);

  // Session monitoring
  const monitorSession = useCallback(() => {
    if (!user) return;

    // Log session activity
    logSecurityEvent('session_activity', 'user_session', true, {
      last_activity: new Date().toISOString(),
      page: window.location.pathname,
    });

    // Check for session timeout (in a real app, this would be more sophisticated)
    const lastActivity = localStorage.getItem('lastActivity');
    const now = Date.now();
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes

    if (lastActivity && (now - parseInt(lastActivity)) > sessionTimeout) {
      logSecurityEvent('session_timeout', 'user_session', true);
      // In a real app, this would trigger automatic logout
    }

    localStorage.setItem('lastActivity', now.toString());
  }, [user, logSecurityEvent]);

  // Initialize monitoring
  useEffect(() => {
    if (user) {
      loadMetrics();
      
      // Set up periodic monitoring
      const interval = setInterval(monitorSession, 60000); // Every minute
      
      return () => clearInterval(interval);
    }
  }, [user, loadMetrics, monitorSession]);

  // Set up activity listeners
  useEffect(() => {
    const handleActivity = () => monitorSession();
    
    document.addEventListener('click', handleActivity);
    document.addEventListener('keypress', handleActivity);
    document.addEventListener('scroll', handleActivity);

    return () => {
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keypress', handleActivity);
      document.removeEventListener('scroll', handleActivity);
    };
  }, [monitorSession]);

  return {
    metrics,
    isLoading,
    error,
    logSecurityEvent,
    checkRateLimit,
    loadMetrics,
    detectSuspiciousActivity,
  };
}

// Security alert hook
export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>>([]);

  const addAlert = useCallback((
    type: 'warning' | 'error' | 'info',
    title: string,
    message: string
  ) => {
    const alert = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };

    setAlerts(prev => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
  }, []);

  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    addAlert,
    acknowledgeAlert,
    clearAllAlerts,
    unacknowledgedCount: alerts.filter(a => !a.acknowledged).length,
  };
}