import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import TeamMemberProfile from '@/pages/TeamMemberProfile';

export function TeamMemberHandler() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleIdentifier = async () => {
      if (!identifier) return;

      try {
        // Check if identifier is a UUID (old format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidRegex.test(identifier)) {
          // It's a UUID, need to fetch username and redirect
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', identifier)
            .single();

          if (error || !profile?.username) {
            // If profile not found, redirect to team directory
            navigate('/people', { replace: true });
            return;
          }

          // Redirect to new username-based URL
          navigate(`/people/${profile.username}`, { replace: true });
          return;
        }
        
        // It's a username, no redirect needed - component will handle it
      } catch (error) {
        console.error('Error handling team member identifier:', error);
        navigate('/people', { replace: true });
      }
    };

    handleIdentifier();
  }, [identifier, navigate]);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // If it's a UUID, show loading while redirecting
  if (identifier && uuidRegex.test(identifier)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  // Otherwise, render the profile component directly
  return <TeamMemberProfile />;
}
