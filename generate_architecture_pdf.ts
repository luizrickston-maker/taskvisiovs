import { jsPDF } from "jspdf";

const doc = new jsPDF();
const margin = 15;
const pageWidth = doc.internal.pageSize.getWidth();
const contentWidth = pageWidth - (margin * 2);
let currentY = 20;

function addTitle(text: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(text, margin, currentY);
  currentY += 15;
}

function addSubtitle(text: string) {
  if (currentY > 260) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(text, margin, currentY);
  currentY += 10;
}

function addText(text: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, contentWidth);
  
  for (const line of lines) {
    if (currentY > 280) {
      doc.addPage();
      currentY = 20;
    }
    doc.text(line, margin, currentY);
    currentY += 6;
  }
  currentY += 4;
}

function addList(items: string[]) {
  for (const item of items) {
    addText("• " + item);
  }
}

// Content Gathering
addTitle("Arquitetura Detalhada do Aplicativo");
addText("Este documento descreve minuciosamente a arquitetura do aplicativo, abrangendo frontend, backend, lógica de acesso e conexões.");

addSubtitle("1. Tecnologias e Linguagens");
addList([
  "Frontend: React 18 com TypeScript (TSX).",
  "Build Tool: Vite para carregamento rápido e HMR.",
  "Estilização: Tailwind CSS para design responsivo e moderno.",
  "Backend: Supabase (PostgreSQL) como BaaS (Backend as a Service).",
  "Gerenciamento de Estado: Zustand para estado global e React Context para autenticação.",
  "Comunicação de Dados: TanStack Query (React Query) para sincronização e cache de dados.",
  "Ícones: Lucide React.",
  "Animações: Framer Motion e Tailwind Animate."
]);

addSubtitle("2. Arquitetura Frontend");
addText("O frontend é organizado de forma modular para facilitar a manutenção e escalabilidade.");
addList([
  "src/components: Contém componentes reutilizáveis, organizados por domínio (caixa, clientes, comercial, etc.).",
  "src/pages: Define as rotas do aplicativo, separando contextos Pessoal, PJ (Comercial) e Portais.",
  "src/hooks: Hooks customizados para lógica compartilhada e abstração de chamadas ao Supabase.",
  "src/contexts: Contextos React como AuthContext para gerenciar a sessão do usuário.",
  "src/stores: Zustand stores como useAppStore para estado volátil da aplicação."
]);

addSubtitle("3. Lógica de Login e Acesso");
addText("O sistema de autenticação é robusto e baseado em Supabase Auth.");
addList([
  "Auth.tsx: Gerencia o login via email/senha e solicitações de recuperação de senha. Possui redirecionamentos específicos por email para fluxos comerciais.",
  "ProtectedRoute.tsx: Intercepta rotas protegidas, verifica o JWT e redireciona usuários não autenticados. Usuários identificados como 'Client Portal' são forçados para a rota /portal.",
  "Context Switcher: Permite ao usuário alternar entre o modo 'Pessoal' e 'Empresarial' (PJ). Isso altera o 'mode' global que filtra o menu lateral e os dashboards.",
  "Níveis de Acesso (Roles):",
  "  - Admin: Acesso total ao workspace e configurações.",
  "  - Colaborador: Acesso restrito ao Painel do Colaborador, focando em tarefas próprias.",
  "  - Cliente: Acesso exclusivo via Portal do Cliente (links externos).",
  "  - Super Admin: Gerenciamento global de workspaces via /super-admin."
]);

addSubtitle("4. Arquitetura Backend (Supabase)");
addText("O banco de dados PostgreSQL é o coração do sistema, com segurança aplicada via Row Level Security (RLS).");
addList([
  "Tabelas Principais: projects, briefings, clients, tasks, finances (incomes/expenses), ai_agents.",
  "Row Level Security (RLS): Garante que usuários vejam apenas dados de seu próprio workspace ou atribuídos a eles.",
  "Edge Functions (Deno): Processamento server-side para tarefas pesadas como IA (ai-360-agent), convites de usuários e geração de links mágicos.",
  "Triggers e RPCs: Automações no banco de dados para manter a integridade e facilitar chamadas complexas do frontend."
]);

addSubtitle("5. Módulos e Funcionalidades (Botões e Ações)");
addText("Cada módulo possui botões de ação consistentes.");
addList([
  "Módulo Comercial: Botão 'Novo Cliente' (abre formulário de cadastro), 'Gerar Link' (cria token de acesso externo).",
  "Módulo de Projetos: Botão 'Criar Projeto', 'Adicionar Tarefa', 'Anexar Arquivo'.",
  "Módulo Financeiro: Botão 'Nova Receita/Despesa', 'Filtros de Data', 'Exportar Relatório'.",
  "Módulo IA: Botões de 'Chat', 'Gerar Resumo', 'Configurar Agente'."
]);

addSubtitle("6. Conexões e Sincronização");
addText("O aplicativo utiliza Realtime do Supabase para manter os dados sincronizados em múltiplos dispositivos.");
addList([
  "Sincronização em Tempo Real: Alterações em tarefas ou chats são refletidas instantaneamente via broadcasts e postgres_changes.",
  "Cache: TanStack Query mantém o estado local atualizado sem necessidade de refresh constante.",
  "Integrações de IA: Conexão direta com APIs da OpenAI/Anthropic via Edge Functions para assistentes inteligentes."
]);

addSubtitle("8. Esquema de Banco de Dados (Tabelas Principais)");
addText("O sistema utiliza as seguintes tabelas no esquema public:");
addList([
  "projects: Gestão de projetos de clientes e internos.",
  "briefings: Armazenamento de informações coletadas via formulários.",
  "clients: Cadastro de clientes e informações comerciais.",
  "project_tasks: Tarefas vinculadas a projetos específicos.",
  "incomes / expenses: Lançamentos financeiros para fluxo de caixa.",
  "user_roles: Definição de permissões por usuário.",
  "workspaces: Separação lógica de ambientes multi-tenant.",
  "ai_agents: Configurações de agentes de inteligência artificial customizados.",
  "portal_short_links: Redirecionamento de links curtos para acesso externo.",
  "corporate_team: Gestão de colaboradores e equipe."
]);

addSubtitle("9. Detalhamento de Botões e Funções");
addText("Abaixo, listamos botões críticos e sua lógica subjacente:");
addList([
  "Botão 'Alternar Contexto' (ContextSwitcher.tsx): Altera o estado 'mode' (personal/business) no store useAppStore, filtrando a visibilidade de menus e dados.",
  "Botão 'Salvar Briefing' (BriefingEditorPage.tsx): Executa uma mutação via React Query que envia os dados para a tabela 'briefings' e 'briefing_responses'.",
  "Botão 'Configurações' (Sidebar.tsx): Redireciona para /config, onde o usuário pode alterar preferências armazenadas na tabela 'user_preferences'.",
  "Botão 'Chat IA' (AI360DashboardPage.tsx): Abre uma conversa com o Edge Function 'ai-360-agent', enviando o histórico para processamento de linguagem natural."
]);

doc.save("Arquitetura_App.pdf");
console.log("PDF gerado com sucesso: Arquitetura_App.pdf");
