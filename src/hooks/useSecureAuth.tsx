import { useAuth } from './useAuth';
import { useIsAdmin } from './useIsAdmin';

interface SecurityContext {
  user: any;
  isAdmin: boolean;
  loading: boolean;
  requireAuth: () => boolean;
  requireAdmin: () => boolean;
  canAccess: (resource: string) => boolean;
}

export function useSecureAuth(): SecurityContext {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const requireAuth = () => {
    if (!user) {
      throw new Error('Authentication required');
    }
    return true;
  };

  const requireAdmin = () => {
    requireAuth();
    if (!isAdmin) {
      throw new Error('Administrator privileges required');
    }
    return true;
  };

  const canAccess = (resource: string) => {
    if (!user) return false;
    
    // Define resource access rules
    const adminOnlyResources = [
      'admin_dashboard',
      'user_management', 
      'system_settings',
      'audit_logs'
    ];

    if (adminOnlyResources.includes(resource)) {
      return isAdmin;
    }

    return true; // Default: authenticated users can access
  };

  return {
    user,
    isAdmin,
    loading: authLoading || adminLoading,
    requireAuth,
    requireAdmin,
    canAccess
  };
}