
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { createAuditClient } from './auditClient';

interface SecurityContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  securityLevel: 'basic' | 'enhanced' | 'enterprise';
  isSecureEnvironment: boolean;
  auditLog: (action: string, resource: string) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [securityLevel] = useState<'basic' | 'enhanced' | 'enterprise'>('enterprise');
  const auditClient = useMemo(() => createAuditClient(), []);

  useEffect(() => {
    if (user) {
      // Load user permissions based on role and security context
      const userPermissions = [
        'read:projects',
        'write:projects',
        'read:tasks',
        'write:tasks',
        'read:reports',
        'write:reports'
      ];
      
      // Add admin permissions for admin users
      if (user.email?.endsWith('@outpaged.com')) {
        userPermissions.push(
          'admin:users',
          'admin:system',
          'admin:audit',
          'admin:security'
        );
      }
      
      setPermissions(userPermissions);
    }
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const isSecureEnvironment = location.protocol === 'https:';

  const auditLog = (action: string, resource: string) => {
    if (!user) {
      return;
    }

    const entry = {
      userId: user.id,
      action,
      resource,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ip: 'client-ip'
    };

    console.log(
      `[AUDIT] User: ${entry.userId}, Action: ${entry.action}, Resource: ${entry.resource}, Timestamp: ${entry.timestamp}`
    );

    if (!auditClient) {
      return;
    }

    void auditClient.log(entry).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unable to reach the audit service.';
      console.error('Failed to send audit log entry', error);
      toast({
        variant: 'destructive',
        title: 'Audit logging failed',
        description: message
      });
    });
  };

  return (
    <SecurityContext.Provider value={{
      permissions,
      hasPermission,
      securityLevel,
      isSecureEnvironment,
      auditLog
    }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }
  return context;
}
