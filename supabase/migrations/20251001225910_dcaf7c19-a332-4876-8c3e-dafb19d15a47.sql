-- Phase 0: Foundation - Part 1: Update Role Enum
-- Add all new role values to the team_role enum
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'org_admin';
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'space_admin';
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'project_lead';
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'contributor';
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'requester';
ALTER TYPE team_role ADD VALUE IF NOT EXISTS 'guest';