-- Fixtures for the database tests.
--
-- Two independent workspaces, each with its own manager, plus the two
-- collaborator shapes the feature cares about: one holding a full account
-- (member_user_id set) and one without (member_user_id NULL, filtered out of
-- the feature entirely).
--
-- Every id is fixed so tests can assert against exact values.

-- Identities. Inserting into auth.users fires the signup triggers created by
-- the migrations (user_roles, user_preferences, default categories).
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-4111-8111-111111111101', 'manager.a@fixture.test'),
  ('11111111-1111-4111-8111-111111111102', 'manager.b@fixture.test'),
  ('11111111-1111-4111-8111-111111111103', 'collaborator.a@fixture.test')
ON CONFLICT (id) DO NOTHING;

-- Workspaces. The on_workspace_created trigger adds the owner membership row.
INSERT INTO public.workspaces (id, owner_user_id, name) VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111101', 'Workspace A'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111102', 'Workspace B')
ON CONFLICT (id) DO NOTHING;

-- Collaborator of workspace A with a full account, and one without an account.
INSERT INTO public.corporate_team (id, user_id, name, role, workspace_id, member_user_id, whatsapp, is_active) VALUES
  ('33333333-3333-4333-8333-333333333301',
   '11111111-1111-4111-8111-111111111101', 'Colaborador A', 'colaborador',
   '22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111103',
   '5511999990001', true),
  ('33333333-3333-4333-8333-333333333302',
   '11111111-1111-4111-8111-111111111101', 'Colaborador Sem Conta', 'colaborador',
   '22222222-2222-4222-8222-222222222201', NULL,
   NULL, true)
ON CONFLICT (id) DO NOTHING;
