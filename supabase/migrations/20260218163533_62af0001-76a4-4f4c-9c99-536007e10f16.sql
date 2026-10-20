
-- Now that super_admin is committed to the enum, insert the role
INSERT INTO public.user_roles (user_id, role)
SELECT '067f253a-441c-4fca-920b-52036ef97eb9', 'super_admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '067f253a-441c-4fca-920b-52036ef97eb9')
ON CONFLICT (user_id, role) DO NOTHING;
