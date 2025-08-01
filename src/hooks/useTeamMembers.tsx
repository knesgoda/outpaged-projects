
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtime } from './useRealtime';
import { TeamMember } from '@/pages/TeamDirectory';

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          role,
          avatar_url,
          username,
          created_at
        `);

      if (profilesError) throw profilesError;

      // Get stats for each team member using the new database function
      const membersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const { data: stats } = await supabase.rpc('get_team_member_stats', {
            member_user_id: profile.user_id
          });

          const memberStats = stats?.[0] || { 
            projects_count: 0, 
            tasks_completed: 0, 
            total_time_minutes: 0 
          };

          return {
            id: profile.user_id,
            username: profile.username || 'user',
            name: profile.full_name || 'Unknown',
            email: '', // We'll need to get this from auth if needed
            role: profile.role || 'developer',
            department: getDepartmentFromRole(profile.role || 'developer'),
            initials: getInitials(profile.full_name || 'Unknown'),
            status: 'active' as const,
            avatar: profile.avatar_url,
            joinDate: new Date(profile.created_at).toLocaleDateString(),
            lastActive: 'Today', // This would need real tracking
            projectsCount: memberStats.projects_count || 0,
            tasksCompleted: memberStats.tasks_completed || 0,
            skills: [], // Would need a separate skills table
            bio: undefined
          };
        })
      );

      setMembers(membersWithStats);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  // Set up real-time updates
  useRealtime({
    table: 'profiles',
    onInsert: () => fetchTeamMembers(),
    onUpdate: () => fetchTeamMembers(),
    onDelete: () => fetchTeamMembers(),
  });

  const updateMemberStatus = async (memberId: string, status: 'active' | 'inactive') => {
    // Update local state immediately for better UX
    setMembers(prev => prev.map(member => 
      member.id === memberId ? { ...member, status } : member
    ));

    // In a real implementation, you might want to store status in the database
    // For now, we'll just update the local state
  };

  return {
    members,
    loading,
    error,
    refetch: fetchTeamMembers,
    updateMemberStatus
  };
}

function getDepartmentFromRole(role: string): string {
  const roleToDepartment: Record<string, string> = {
    'developer': 'Engineering',
    'designer': 'Design',
    'project_manager': 'Management',
    'qa': 'Quality Assurance',
    'admin': 'Administration',
    'super_admin': 'Administration'
  };
  return roleToDepartment[role] || 'General';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}
