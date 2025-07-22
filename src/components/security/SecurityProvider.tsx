
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
    if (user) {
      console.log(`[AUDIT] User: ${user.id}, Action: ${action}, Resource: ${resource}, Timestamp: ${new Date().toISOString()}`);
      
      // In production, this would send to your audit service
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          action,
          resource,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ip: 'client-ip' // Would be set by server
        })
      }).catch(console.error);
    }
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
