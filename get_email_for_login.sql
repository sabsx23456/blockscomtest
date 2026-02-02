-- Create the get_email_for_login function
-- This function allows logging in with username or phone number by resolving the email address

CREATE OR REPLACE FUNCTION public.get_email_for_login(identity_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  found_email text;
BEGIN
  -- Search for the user in profiles and return the associated email from auth.users
  SELECT u.email INTO found_email
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE p.username = identity_input 
     OR p.phone_number = identity_input
  LIMIT 1;

  RETURN found_email;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_email_for_login(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_for_login(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_email_for_login(text) TO service_role;
