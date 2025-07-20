import { useAuth } from '@/hooks/useAuth';

export function useOptionalAuth() {
  try {
    return useAuth();
  } catch (error) {
    // Return safe defaults when auth context is not available
    return {
      user: null,
      session: null,
      loading: false,
      signIn: async () => ({ error: new Error('Auth not available') }),
      signUp: async () => ({ error: new Error('Auth not available') }),
      signOut: async () => {},
    };
  }
}