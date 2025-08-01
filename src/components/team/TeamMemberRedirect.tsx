import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function TeamMemberRedirect() {
  const { memberId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const redirectToUsername = async () => {
      if (!memberId) return;

      try {
        // Check if memberId is a UUID (old format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (uuidRegex.test(memberId)) {
          // It's a UUID, need to fetch username
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', memberId)
            .single();

          if (error || !profile?.username) {
            // If profile not found, redirect to team directory
            navigate('/dashboard/team', { replace: true });
            return;
          }

          // Redirect to new username-based URL
          navigate(`/dashboard/team/${profile.username}`, { replace: true });
        } else {
          // It's already a username, redirect back to handle properly
          navigate(`/dashboard/team/${memberId}`, { replace: true });
        }
      } catch (error) {
        console.error('Error redirecting team member:', error);
        navigate('/dashboard/team', { replace: true });
      }
    };

    redirectToUsername();
  }, [memberId, navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}