-- Criar a view editorial_calendar_summary caso ela não exista ou tenha sido removida
CREATE OR REPLACE VIEW public.editorial_calendar_summary AS
SELECT 
    b.id,
    b.created_by_user_id AS user_id,
    b.title,
    b.status,
    'blog'::text AS platform, -- Briefings são mapeados como blog/conteúdo por padrão
    b.created_at AS publish_date,
    CASE 
        WHEN b.status != 'approved' AND b.created_at < NOW() - INTERVAL '7 days' THEN true 
        ELSE false 
    END AS is_overdue,
    CASE 
        WHEN b.created_at::date = CURRENT_DATE THEN 'today'
        WHEN b.created_at::date > CURRENT_DATE THEN 'upcoming'
        ELSE 'past'
    END AS deadline_status
FROM public.briefings b;

-- Garantir que as permissões de RLS se apliquem à view (se necessário através das tabelas base)
-- A tabela briefings já deve ter RLS habilitado.
