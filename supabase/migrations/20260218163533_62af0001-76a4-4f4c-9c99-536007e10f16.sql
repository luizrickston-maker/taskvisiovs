
-- Now that super_admin is committed to the enum, insert the role
INSERT INTO public.user_roles (user_id, role)
VALUES ('067f253a-441c-4fca-920b-52036ef97eb9', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
