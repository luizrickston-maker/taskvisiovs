-- =====================================================
-- FIX: import_project_plan() — v_stage_order e v_task_order
-- não eram inicializados, gerando NULL na primeira iteração.
--
-- Em PL/pgSQL, inteiros sem valor inicial são NULL. NULL + 1 = NULL,
-- e a coluna order_index (NOT NULL) rejeita.
--
-- Correção: inicializar v_stage_order := 0 e v_task_order := 0
-- na DECLARE.
-- =====================================================

CREATE OR REPLACE FUNCTION public.import_project_plan(p_plan jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_project_record jsonb;
  v_stage_record jsonb;
  v_task_record jsonb;
  v_category_id uuid;
  v_project_id uuid;
  v_stage_id uuid;
  v_stage_order int := 0;   -- FIX: inicializado pra evitar NULL
  v_task_order int := 0;    -- FIX: inicializado pra evitar NULL
  v_assigned_user_id uuid;
  v_created_project jsonb;
  v_created_stages jsonb := '[]'::jsonb;
  v_created_tasks jsonb := '[]'::jsonb;
  v_stage_names text[] := ARRAY[]::text[];
  v_unmapped_collaborators jsonb := '[]'::jsonb;
  v_stage_tasks jsonb;
BEGIN
  -- 1. Identifica usuário e workspace
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT get_my_workspace_id() INTO v_workspace_id;
  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Workspace não encontrado para o usuário';
  END IF;

  -- 2. Validações básicas do schema v1.0
  IF p_plan->>'version' IS DISTINCT FROM '1.0' THEN
    RAISE EXCEPTION 'Versão do plano inválida (esperado: 1.0, recebido: %)', p_plan->>'version';
  END IF;

  IF jsonb_typeof(p_plan->'stages') <> 'array' OR jsonb_array_length(p_plan->'stages') < 1 THEN
    RAISE EXCEPTION 'Plano deve ter ao menos 1 etapa (stages.length >= 1)';
  END IF;

  IF p_plan->'project'->>'name' IS NULL OR btrim(p_plan->'project'->>'name') = '' THEN
    RAISE EXCEPTION 'project.name é obrigatório';
  END IF;

  IF p_plan->'work_calendar' IS NULL THEN
    RAISE EXCEPTION 'work_calendar é obrigatório no schema v1.0';
  END IF;

  -- 3. Resolve categoria (se existir com mesmo nome)
  v_project_record := p_plan->'project';
  IF v_project_record->>'category_name' IS NOT NULL THEN
    SELECT id INTO v_category_id
    FROM project_categories
    WHERE user_id = v_user_id
      AND lower(name) = lower(v_project_record->>'category_name')
      AND workspace_id = v_workspace_id
    LIMIT 1;
  END IF;

  -- 4. Cria o projeto
  INSERT INTO projects (
    user_id,
    workspace_id,
    task,
    project,
    project_category_id,
    priority,
    status,
    estimated_time,
    client_name,
    company_name,
    deadline,
    is_corporate
  ) VALUES (
    v_user_id,
    v_workspace_id,
    COALESCE(v_project_record->>'description', ''),
    v_project_record->>'name',
    v_category_id,
    COALESCE((v_project_record->>'priority')::int, 3),
    'todo',
    v_project_record->>'estimated_time',
    v_project_record->>'client_name',
    v_project_record->>'company_name',
    CASE
      WHEN v_project_record->>'deadline' ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (v_project_record->>'deadline')::date
      ELSE NULL
    END,
    true
  )
  RETURNING to_jsonb(projects.*) INTO v_created_project;

  v_project_id := (v_created_project->>'id')::uuid;

  -- 5. Cria as etapas
  FOR v_stage_record IN SELECT * FROM jsonb_array_elements(p_plan->'stages')
  LOOP
    v_stage_order := v_stage_order + 1;

    -- guarda tasks ANTES do INSERT em project_stages (que sobrescreve v_stage_record)
    v_stage_tasks := v_stage_record->'tasks';

    INSERT INTO project_stages (
      user_id,
      workspace_id,
      project_id,
      name,
      description,
      status,
      order_index,
      icon,
      sla_days,
      deadline,
      template_id,
      notes
    ) VALUES (
      v_user_id,
      v_workspace_id,
      v_project_id,
      v_stage_record->>'name',
      v_stage_record->>'notes',
      'todo',
      v_stage_order,
      v_stage_record->>'icon',
      CASE
        WHEN v_stage_record->>'sla_days' ~ '^\d+$'
        THEN (v_stage_record->>'sla_days')::int
        ELSE NULL
      END,
      CASE
        WHEN v_stage_record->>'deadline' ~ '^\d{4}-\d{2}-\d{2}$'
        THEN (v_stage_record->>'deadline')::date
        ELSE NULL
      END,
      v_stage_record->>'template_id',
      v_stage_record->>'notes'
    )
    RETURNING id, to_jsonb(project_stages.*) INTO v_stage_id, v_stage_record;

    v_created_stages := v_created_stages || jsonb_build_array(v_stage_record);
    v_stage_names := array_append(v_stage_names, v_stage_record->>'name');

    -- 6. Cria tarefas da etapa
    v_task_order := 0;   -- FIX: reseta numeração por stage
    FOR v_task_record IN SELECT * FROM jsonb_array_elements(v_stage_tasks)
    LOOP
      v_task_order := v_task_order + 1;

      -- Resolve colaborador por nome (case-insensitive, na workspace)
      v_assigned_user_id := NULL;
      IF v_task_record->>'assigned_to_name' IS NOT NULL
         AND btrim(v_task_record->>'assigned_to_name') <> '' THEN
        SELECT member_user_id INTO v_assigned_user_id
        FROM corporate_team
        WHERE user_id = v_user_id
          AND workspace_id = v_workspace_id
          AND is_active = true
          AND lower(name) = lower(v_task_record->>'assigned_to_name')
        LIMIT 1;

        IF v_assigned_user_id IS NULL THEN
          SELECT member_user_id INTO v_assigned_user_id
          FROM corporate_team
          WHERE user_id = v_user_id
            AND workspace_id = v_workspace_id
            AND is_active = true
            AND lower(name) LIKE '%' || lower(v_task_record->>'assigned_to_name') || '%'
          LIMIT 1;
        END IF;

        IF v_assigned_user_id IS NULL THEN
          IF NOT (v_unmapped_collaborators ? v_task_record->>'assigned_to_name') THEN
            v_unmapped_collaborators := v_unmapped_collaborators || jsonb_build_array(v_task_record->>'assigned_to_name');
          END IF;
        END IF;
      END IF;

      INSERT INTO project_tasks (
        user_id,
        workspace_id,
        project_id,
        stage_id,
        title,
        description,
        priority,
        status,
        deadline,
        estimated_hours,
        actual_hours,
        assigned_to,
        sort_order
      ) VALUES (
        v_user_id,
        v_workspace_id,
        v_project_id,
        v_stage_id,
        v_task_record->>'title',
        v_task_record->>'description',
        COALESCE((v_task_record->>'priority')::int, 3),
        'todo',
        CASE
          WHEN v_task_record->>'deadline' ~ '^\d{4}-\d{2}-\d{2}$'
          THEN (v_task_record->>'deadline')::date
          ELSE NULL
        END,
        COALESCE((v_task_record->>'estimated_hours')::numeric, 0),
        COALESCE((v_task_record->>'actual_hours')::numeric, 0),
        v_assigned_user_id,
        v_task_order
      )
      RETURNING to_jsonb(project_tasks.*) INTO v_task_record;

      v_created_tasks := v_created_tasks || jsonb_build_array(v_task_record);
    END LOOP;
  END LOOP;

  -- 7. Atualiza current_stage_id do projeto (primeira etapa)
  UPDATE projects
  SET current_stage_id = (v_created_stages->0->>'id')::uuid
  WHERE id = v_project_id;

  RETURN jsonb_build_object(
    'success', true,
    'project', v_created_project,
    'stages', v_created_stages,
    'tasks', v_created_tasks,
    'warnings', jsonb_build_object(
      'unmapped_collaborators', v_unmapped_collaborators
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_project_plan(jsonb) TO authenticated;
