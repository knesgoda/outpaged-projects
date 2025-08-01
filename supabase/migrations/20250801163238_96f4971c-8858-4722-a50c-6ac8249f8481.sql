-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username TEXT UNIQUE;

-- Create function to generate username from full name
CREATE OR REPLACE FUNCTION public.generate_username(full_name_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  name_parts TEXT[];
  first_initial TEXT;
  last_name TEXT;
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Handle null or empty names
  IF full_name_param IS NULL OR TRIM(full_name_param) = '' THEN
    RETURN 'user' || EXTRACT(EPOCH FROM NOW())::TEXT;
  END IF;
  
  -- Clean and split the name
  name_parts := string_to_array(TRIM(REGEXP_REPLACE(full_name_param, '[^a-zA-Z\s]', '', 'g')), ' ');
  name_parts := array_remove(name_parts, '');
  
  -- Handle single name case
  IF array_length(name_parts, 1) = 1 THEN
    base_username := LOWER(name_parts[1]);
  ELSE
    -- Get first initial and last name
    first_initial := LOWER(LEFT(name_parts[1], 1));
    last_name := LOWER(name_parts[array_length(name_parts, 1)]);
    base_username := first_initial || last_name;
  END IF;
  
  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || '123';
  END IF;
  
  -- Check for conflicts and resolve
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- Create function to update username when full_name changes
CREATE OR REPLACE FUNCTION public.update_username_on_name_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update username if full_name changed and username is not manually set
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    NEW.username := generate_username(NEW.full_name);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for username generation
CREATE TRIGGER update_username_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_username_on_name_change();

-- Generate usernames for existing profiles
UPDATE public.profiles 
SET username = generate_username(full_name)
WHERE username IS NULL;