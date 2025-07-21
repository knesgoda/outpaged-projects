import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useOptionalAuth } from '@/hooks/useOptionalAuth';
import { Loader2 } from 'lucide-react';

export function AuthRedirect() {
  const { user, loading } = useOptionalAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not authenticated, redirect to auth page
  return <Navigate to="/auth" replace />;
}