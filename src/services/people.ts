import { supabase } from '@/integrations/supabase/client';
import type { ProfileLite } from '@/types';

type SearchParams = {
  q: string;
  projectId?: string;
};

const MAX_RESULTS = 20;

export async function searchTeammates({ q, projectId }: SearchParams): Promise<ProfileLite[]> {
  const query = q.trim();
  if (!query) {
    return [];
  }

  if (projectId) {
    const dedupe = new Map<string, ProfileLite>();

    const [{ data: project, error: projectError }, { data: members, error: memberError }] = await Promise.all([
      supabase
        .from('projects')
        .select('id, owner_id')
        .eq('id', projectId)
        .maybeSingle(),
      supabase
        .from('project_members')
        .select(`
          user_id,
          profiles!inner (
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('project_id', projectId)
    ]);

    if (projectError) {
      throw projectError;
    }

    if (memberError) {
      throw memberError;
    }

    if (project?.owner_id) {
      const { data: ownerProfile, error: ownerError } = await (supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('user_id', project.owner_id)
        .maybeSingle() as any);

      if (ownerError) {
        throw ownerError;
      }

      if (ownerProfile) {
        dedupe.set(ownerProfile.user_id, {
          id: ownerProfile.user_id,
          full_name: ownerProfile.full_name,
          avatar_url: ownerProfile.avatar_url,
          email: null,
        });
      }
    }

    (members ?? []).forEach((member: any) => {
      const profile = member.profiles;
      if (!profile) return;
      dedupe.set(member.user_id, {
        id: member.user_id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: profile.email ?? null,
      });
    });

    const filtered = Array.from(dedupe.values()).filter(person => {
      const haystacks = [person.full_name, person.email].filter(Boolean).map(v => v!.toLowerCase());
      const needle = query.toLowerCase();
      return haystacks.some(value => value?.includes(needle));
    });

    return filtered.slice(0, MAX_RESULTS);
  }

  const { data, error } = await (supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .ilike('full_name', `%${query}%`)
    .order('full_name', { ascending: true })
    .limit(MAX_RESULTS) as any);

  if (error) {
    throw error;
  }

  return (data ?? []).map(person => ({
    id: person.user_id,
    full_name: person.full_name,
    avatar_url: person.avatar_url,
    email: null,
  }));
}
