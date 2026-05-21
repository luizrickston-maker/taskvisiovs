-- Add search_path to the notification function to prevent search_path attacks
ALTER FUNCTION public.handle_video_briefing_notification() SET search_path = public;

-- Revoke public execution of the trigger function as it's meant to be used by the system
REVOKE EXECUTE ON FUNCTION public.handle_video_briefing_notification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_video_briefing_notification() TO postgres, service_role;
