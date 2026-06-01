Implementar a funcionalidade de análise de progresso dos colaboradores no menu \"Time\". Isso incluirá uma nova visão detalhada para cada colaborador, permitindo ao gestor visualizar atividades, conclusão, pendências, andamentos e tarefas a fazer.

### Alterações Propostas

#### 1. Componentes de UI
- Criar `src/components/areapj/team/TeamMemberStats.tsx`: Componente para exibir KPIs de progresso (Tarefas concluídas, pendentes, etc.).
- Criar `src/components/areapj/team/TeamMemberProgressDetails.tsx`: Componente principal de detalhes que será exibido ao clicar em um colaborador.
- Criar `src/components/areapj/team/CollaboratorTasksList.tsx`: Lista de tarefas filtrada por colaborador com abas de status (Pendente, Em Andamento, Concluído).

#### 2. Atualização no TeamManager
- Modificar `src/components/areapj/TeamManager.tsx` para permitir a seleção de um colaborador e alternar entre a lista geral e a visão de detalhes do progresso.

#### 3. Integração de Dados
- Utilizar o `useAppStore` para acessar `projectTasks` e `projects`.
- Implementar filtragem em tempo real das tarefas vinculadas ao `member_user_id` ou ao ID do membro da equipe (mapeando tarefas atribuídas).

#### 4. Navegação e UX
- Adicionar um botão \"Ver Progresso\" ou clique no card em `TeamMemberCard.tsx` para abrir a visão detalhada.
- Garantir que a transição seja suave e mantenha o contexto do gestor.

### Detalhes Técnicos
- **Filtragem**: As tarefas serão filtradas comparando `task.assigned_to` com `member.id`.
- **Status**: As tarefas serão categorizadas com base no campo `status` (`pending`, `in_progress`, `completed`).
- **Realtime**: Aproveitar a infraestrutura de realtime já existente para atualizar o progresso instantaneamente quando o colaborador mudar o status de uma tarefa no portal dele.
