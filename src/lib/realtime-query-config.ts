/**
 * Mapeamento declarativo: tabela do Postgres -> chaves de React Query a
 * invalidar quando a tabela muda (INSERT/UPDATE/DELETE) via Supabase Realtime.
 *
 * A invalidação do React Query usa correspondência por PREFIXO de array, então
 * basta a primeira parte da queryKey: invalidar ['caixa-pj-transacoes'] cobre
 * ['caixa-pj-transacoes', userId, filters]. Chaves com prefixos diferentes
 * (ex.: 'clients' vs 'clients-portal-counts') precisam ser listadas separadamente.
 *
 * Observação: tabelas que alimentam o store global (Zustand) já são tratadas em
 * useRealtimeSync. Aqui cobrimos as áreas baseadas em React Query. Algumas
 * tabelas aparecem nos dois mundos (ex.: time_blocks, project_tasks,
 * editorial_*) — invalidar a query além de atualizar o store é inofensivo e
 * garante que todas as telas reflitam a mudança.
 */
export type RealtimeQueryBinding = {
  table: string;
  queryKeys: string[];
};

export const REALTIME_QUERY_BINDINGS: RealtimeQueryBinding[] = [
  // Caixa PJ
  { table: "pj_caixa_transacoes", queryKeys: ["caixa-pj-transacoes"] },
  { table: "pj_caixa_categorias", queryKeys: ["caixa-pj-categorias"] },
  { table: "pj_contas_pagar", queryKeys: ["caixa-pj-contas-pagar"] },

  // Briefings
  { table: "briefings", queryKeys: ["briefings", "briefing"] },
  {
    table: "video_editing_briefings",
    queryKeys: ["video-editing-briefings", "video-editing-briefing"],
  },

  // Calendário editorial (telas internas + portal do cliente)
  {
    table: "editorial_calendar_items",
    queryKeys: ["editorial-calendar-items", "portal-calendar", "portal-timeline"],
  },
  { table: "editorial_comments", queryKeys: ["editorial-comments"] },

  // Processos / canvas
  { table: "business_processes", queryKeys: ["business-processes", "process"] },
  { table: "process_instances", queryKeys: ["process-instances"] },
  { table: "process_steps", queryKeys: ["process"] },
  { table: "process_connections", queryKeys: ["process"] },

  // Agenda PJ (time_blocks também alimenta o store da agenda PF)
  { table: "time_blocks", queryKeys: ["agenda-pj-timeblocks"] },

  // Tarefas de projeto (vinculadas aos briefings de edição)
  { table: "project_tasks", queryKeys: ["project-tasks"] },

  // Clientes e portal
  {
    table: "clients",
    queryKeys: ["clients", "client", "clients-portal-counts"],
  },
  {
    table: "client_users",
    queryKeys: ["client-portal-info", "is-client-portal-user", "clients-portal-counts"],
  },
  { table: "client_contents", queryKeys: ["portal-contents"] },
  { table: "client_video_settings", queryKeys: ["client-video-settings"] },
];
