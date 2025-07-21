-- Add foreign key constraints for proper joins

-- Add foreign key constraint for comments.author_id -> profiles.user_id
ALTER TABLE public.comments 
ADD CONSTRAINT fk_comments_author_id 
FOREIGN KEY (author_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key constraint for tasks.assignee_id -> profiles.user_id  
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_assignee_id 
FOREIGN KEY (assignee_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add foreign key constraint for tasks.reporter_id -> profiles.user_id
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_reporter_id 
FOREIGN KEY (reporter_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;