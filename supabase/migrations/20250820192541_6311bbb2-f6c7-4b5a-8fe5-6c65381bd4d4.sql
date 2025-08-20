-- Add unique constraint and format validation to project codes
ALTER TABLE public.projects 
ADD CONSTRAINT unique_project_code UNIQUE (code);

-- Add check constraint to ensure code format (uppercase letters, numbers, and hyphens only, 2-10 characters)
ALTER TABLE public.projects 
ADD CONSTRAINT valid_project_code_format 
CHECK (code ~ '^[A-Z0-9-]{2,10}$');

-- Create index for better performance on code lookups
CREATE INDEX idx_projects_code ON public.projects (code) WHERE code IS NOT NULL;