-- Update the trigger to also handle INSERT operations for new profiles
DROP TRIGGER IF EXISTS update_username_trigger ON public.profiles;

CREATE TRIGGER update_username_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_username_on_name_change();

-- Also add a trigger to set username on INSERT when it's NULL
CREATE OR REPLACE FUNCTION public.set_username_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Set username if not provided during insert
  IF NEW.username IS NULL THEN
    NEW.username := generate_username(NEW.full_name);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_username_on_insert_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_username_on_insert();