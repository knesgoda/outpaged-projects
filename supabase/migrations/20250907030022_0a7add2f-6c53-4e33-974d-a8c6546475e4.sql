-- Fix security definer views by updating their definitions
-- This addresses the security linter warnings about SECURITY DEFINER views

-- Drop and recreate the task_assignees_with_profiles view with proper security
DROP VIEW IF EXISTS public.task_assignees_with_profiles;

CREATE VIEW public.task_assignees_with_profiles AS
SELECT 
  ta.id,
  ta.task_id,
  ta.user_id,
  ta.assigned_at,
  ta.assigned_by,
  p.full_name,
  p.avatar_url
FROM public.task_assignees ta
JOIN public.profiles p ON ta.user_id = p.user_id;

-- Enable RLS on the view (this will use the underlying table policies)
ALTER VIEW public.task_assignees_with_profiles SET ROW LEVEL SECURITY ON;

-- Create proper RLS policies for tickets table to protect customer data
CREATE POLICY "Tickets: authenticated users can view own tickets or admin access"
  ON public.tickets
  FOR SELECT
  USING (
    (auth.uid() = created_by) OR 
    (auth.uid() = assigned_to) OR 
    is_admin(auth.uid())
  );

-- Create proper RLS policies for ticket_responses to protect staff data  
CREATE POLICY "Ticket responses: limit access to ticket participants and admins"
  ON public.ticket_responses
  FOR SELECT
  USING (
    is_admin(auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_responses.ticket_id 
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
    ))
  );

-- Add policy for team_invitations to restrict email exposure
CREATE POLICY "Team invitations: sender and admin access only"
  ON public.team_invitations
  FOR SELECT
  USING (
    (auth.uid() = invited_by) OR 
    is_admin(auth.uid())
  );

-- Update profiles table policy to be more restrictive for privacy
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

CREATE POLICY "Users can view limited profile info for project members"
  ON public.profiles
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR 
    is_admin(auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.user_id
    ))
  );