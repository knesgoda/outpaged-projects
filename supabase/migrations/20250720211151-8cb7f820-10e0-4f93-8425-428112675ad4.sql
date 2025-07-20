-- Enable realtime for all tables
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.sprints REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false);

-- Create storage policies for task attachments
CREATE POLICY "Users can view attachments for accessible tasks" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'task-attachments' 
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE (
      (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
      AND storage.foldername((storage.objects.name))[1] = t.id::text
    )
  )
);

CREATE POLICY "Users can upload attachments for accessible tasks" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE (
      (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
      AND storage.foldername((storage.objects.name))[1] = t.id::text
    )
  )
);

CREATE POLICY "Users can delete attachments for accessible tasks" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'task-attachments' 
  AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE (
      (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
      AND storage.foldername((storage.objects.name))[1] = t.id::text
    )
  )
);

-- Admins can manage all attachments
CREATE POLICY "Admins can manage all task attachments" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'task-attachments' AND is_admin(auth.uid()));

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  related_task_id UUID,
  related_project_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" 
ON public.notifications 
FOR ALL 
USING (is_admin(auth.uid()));

-- Add trigger for notifications timestamps
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;