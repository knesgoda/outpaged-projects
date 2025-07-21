-- Create user notification preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email_mentions BOOLEAN NOT NULL DEFAULT true,
  email_task_updates BOOLEAN NOT NULL DEFAULT false,
  email_project_updates BOOLEAN NOT NULL DEFAULT true,
  push_mentions BOOLEAN NOT NULL DEFAULT true,
  push_task_updates BOOLEAN NOT NULL DEFAULT false,
  push_project_updates BOOLEAN NOT NULL DEFAULT false,
  in_app_mentions BOOLEAN NOT NULL DEFAULT true,
  in_app_task_updates BOOLEAN NOT NULL DEFAULT true,
  in_app_project_updates BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user notification preferences
CREATE POLICY "Users can view their own notification preferences" 
ON public.user_notification_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences" 
ON public.user_notification_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
ON public.user_notification_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notification preferences" 
ON public.user_notification_preferences 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();