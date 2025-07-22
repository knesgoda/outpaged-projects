import { ReactNode } from 'react';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireConfirmedEmail?: boolean;
}

export function AdminGuard({ 
  children, 
  fallback,
  requireConfirmedEmail = true 
}: AdminGuardProps) {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return fallback || (
      <Alert className="m-4">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Access denied. Administrator privileges required.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}