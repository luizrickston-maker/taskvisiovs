

## Plano: Automacao "Fechado" -> Criar Projeto + Atualizar Financeiro

### Resumo da Funcionalidade

Quando o usuario mudar o status de uma prospecao para **"Fechado"**, o sistema ira:

1. **Exibir modal de confirmacao** com opcoes de:
   - Selecionar/confirmar o **Plano vendido** (obrigatorio)
   - Escolher criar um novo projeto automaticamente
   - Definir prazo inicial do projeto

2. **Criar projeto automaticamente** (opcional) com:
   - Nome do projeto = Nome do cliente + Empresa
   - Cliente/Empresa preenchidos
   - Vinculado a prospecao (prospect_id)
   - Status = "Em Progresso"

3. **Atualizar dados financeiros** via triggers existentes:
   - Meta de faturamento mensal atualizada
   - Contador de vendas fechadas incrementado

---

### Fluxo Visual Proposto

```text
Usuario clica em "Fechado" no status
          |
          v
+------------------------------------------+
|   Confirmar Fechamento de Venda          |
+------------------------------------------+
| Cliente: Joao Silva                      |
| Empresa: XYZ Ltda                        |
+------------------------------------------+
|                                          |
| Plano Vendido *                          |
| [Dropdown: Selecione o plano]            |
|                                          |
| Valor da Venda: R$ 5.000,00 (auto)       |
| Tipo: Recorrente - 12 meses (auto)       |
+------------------------------------------+
|                                          |
| [x] Criar projeto automaticamente        |
|                                          |
| Nome do Projeto                          |
| [Website - XYZ Ltda]  (auto-preenchido)  |
|                                          |
| Prazo Inicial                            |
| [Calendario: 30 dias a frente]           |
|                                          |
+------------------------------------------+
| [Cancelar]           [Confirmar Venda]   |
+------------------------------------------+
          |
          v
    Sistema executa:
    1. Atualiza status para "fechado"
    2. Atualiza plan_id e estimated_value
    3. Trigger atualiza metas de vendas
    4. Cria projeto (se selecionado)
    5. Vincula projeto a prospecao
```

---

### Componentes a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/comercial/CloseProspectModal.tsx` | CRIAR | Modal de confirmacao com opcoes |
| `src/components/comercial/ProspectList.tsx` | MODIFICAR | Interceptar mudanca para "fechado" |
| `src/components/comercial/ProspectForm.tsx` | MODIFICAR | Mesmo comportamento no form |
| `src/pages/ComercialDashboard.tsx` | MODIFICAR | Gerenciar estado do modal |

---

### Detalhes Tecnicos

#### 1. Novo Componente: CloseProspectModal

```typescript
interface CloseProspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect;
  onConfirm: (data: {
    plan_id: string;
    estimated_value: number;
    payment_type: PaymentType;
    createProject: boolean;
    projectName?: string;
    projectDeadline?: string;
  }) => void;
}
```

**Campos do Modal:**
- Plano Vendido (obrigatorio) - Select dos planos ativos
- Valor da Venda (auto-preenchido do plano, editavel)
- Tipo de Pagamento (auto do plano)
- Duracao/Parcelas (condicional)
- Checkbox: Criar projeto automaticamente
- Nome do Projeto (se checkbox ativo)
- Prazo do Projeto (se checkbox ativo)

#### 2. Logica de Criacao de Projeto

```typescript
const handleConfirmClose = async (data) => {
  // 1. Atualizar prospect para "fechado"
  await supabase.from('prospects').update({
    status: 'fechado',
    plan_id: data.plan_id,
    estimated_value: data.estimated_value,
    payment_type: data.payment_type,
    // ... outros campos
  }).eq('id', prospect.id);
  
  // 2. Criar projeto se solicitado
  if (data.createProject) {
    const projectData = await supabase.from('projects').insert({
      user_id: user.id,
      project: data.projectName,
      task: data.projectName,
      client_name: prospect.client_name,
      company_name: prospect.company_name,
      deadline: data.projectDeadline,
      priority: 2, // Alta prioridade para vendas fechadas
      status: 'progress',
      is_corporate: true,
      prospect_id: prospect.id,
    }).select().single();
    
    // 3. Vincular projeto a prospecao
    await supabase.from('prospects').update({
      project_id: projectData.id
    }).eq('id', prospect.id);
  }
  
  // 4. Triggers do banco atualizam metas automaticamente
};
```

#### 3. Integracao Financeira (Ja Existente)

Os triggers PostgreSQL ja implementados fazem:

```sql
-- Quando status muda para 'fechado':
UPDATE sales_goals SET 
  current_amount = current_amount + NEW.estimated_value
WHERE goal_type = 'faturamento_mensal'
  AND start_date <= NEW.prospection_date
  AND end_date >= NEW.prospection_date;

UPDATE sales_goals SET 
  current_amount = current_amount + 1
WHERE goal_type = 'vendas_fechadas'
  -- mesmas condicoes
```

---

### Validacoes e Regras de Negocio

1. **Plano e obrigatorio** para fechar venda
   - Impede fechamento sem rastreabilidade
   
2. **Valor e auto-preenchido** do plano selecionado
   - Usuario pode editar se negociou diferente
   
3. **Projeto e opcional** mas recomendado
   - Nome sugerido: "{Tipo do Projeto} - {Empresa}"
   - Se nao tiver tipo: "{Cliente} - {Empresa}"
   
4. **Prazo padrao**: 30 dias a partir de hoje
   - Usuario pode alterar

5. **Prevencao de duplicatas**:
   - Se ja existe projeto vinculado, nao mostrar opcao de criar

---

### Experiencia do Usuario

**Cenario 1: Nova venda sem projeto**
1. Usuario edita prospecao ou clica no badge de status
2. Seleciona "Fechado"
3. Modal abre pedindo plano
4. Seleciona plano, valor preenche automaticamente
5. Marca "Criar projeto automaticamente"
6. Ajusta nome/prazo se necessario
7. Confirma
8. Projeto aparece em Projetos, metas atualizadas

**Cenario 2: Venda com projeto ja vinculado**
1. Usuario ja tinha criado projeto antes
2. Muda status para "Fechado"
3. Modal abre sem opcao de criar projeto
4. Apenas confirma plano e valor
5. Metas atualizadas

**Cenario 3: Reversao**
1. Usuario muda de "Fechado" para outro status
2. Nenhum modal (ja existe logica de reversao)
3. Triggers revertem valores das metas

---

### Integracao com Pipeline (Projeto Vinculado)

Na lista de prospecoes, se houver projeto vinculado:
- Mostrar badge com link para o projeto
- Clicar abre detalhes do projeto no modulo Projetos

```text
| Cliente | Empresa | Status  | Projeto              |
|---------|---------|---------|----------------------|
| Joao    | XYZ     | Fechado | [Website XYZ] ->     |
```

---

### Ordem de Implementacao

1. **Criar CloseProspectModal.tsx**
   - Formulario com plano, valor, checkbox projeto
   - Campos condicionais para nome/prazo do projeto

2. **Atualizar ProspectList.tsx**
   - Interceptar mudanca de status para "fechado"
   - Abrir modal em vez de mudar direto

3. **Atualizar ComercialDashboard.tsx**
   - Gerenciar estado do modal de fechamento
   - Callback para criacao de projeto

4. **Testar fluxo completo**
   - Criar prospecao
   - Mudar para fechado
   - Verificar projeto criado
   - Verificar metas atualizadas

---

### Resultado Esperado

1. **Fluxo unificado**: Fechar venda + criar projeto em uma acao
2. **Rastreabilidade**: Toda venda fechada tem plano vinculado
3. **Dados financeiros**: Metas atualizadas automaticamente
4. **Produtividade**: Usuario so precisa completar detalhes do projeto
5. **Integridade**: Impossivel fechar venda sem plano

