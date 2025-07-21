-- Fix infinite recursion in projects RLS policies
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;

-- Create a corrected policy that doesn't cause recursion
CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
USING (
  auth.uid() = owner_id 
  OR 
  auth.uid() IN (
    SELECT pm.user_id 
    FROM public.project_members pm 
    WHERE pm.project_id = projects.id
  )
);