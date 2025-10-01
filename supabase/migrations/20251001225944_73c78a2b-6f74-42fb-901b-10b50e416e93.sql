-- Phase 0: Foundation - Part 3: Enhanced Item Types and Custom Fields

-- Add new item types to task_type enum
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'idea';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'request';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'incident';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'change';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'test';
ALTER TYPE task_type ADD VALUE IF NOT EXISTS 'risk';