
## Auditoria de Segurança Completa - Resultados e Correcoes

### Resumo Executivo

Realizei uma analise extensiva de seguranca do aplicativo verificando:
- Exposicao de chaves e secrets no frontend
- Politicas RLS (Row Level Security) do banco de dados
- Validacao de inputs em formularios
- Vulnerabilidades XSS
- Fluxo de autenticacao
- Armazenamento de dados sensiveis

---

### 1. PROBLEMAS IDENTIFICADOS

#### 1.1 Chaves no Frontend (RISCO BAIXO - Aceitavel)

**Arquivo:** `.env` e `src/integrations/supabase/client.ts`

```
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_URL="https://kxuwzhnkragzsqafszpo.supabase.co"
```

**Avaliacao:** SEGURO - Estas sao chaves **publicaveis** (anon key) destinadas ao uso no frontend. O Supabase foi projetado para isso. A seguranca real vem das politicas RLS no banco de dados.

---

#### 1.2 Tabela `api_keys` (RISCO ALTO)

**Problema:** Existe uma tabela `api_keys` no banco que armazena chaves de API em texto plano:

| Coluna | Tipo |
|--------|------|
| id | uuid |
| user_id | uuid |
| **api_key** | text (TEXTO PLANO!) |
| name | text |
| is_active | boolean |

**Riscos:**
- Chaves de API armazenadas sem criptografia
- Se um usuario tiver acesso ao banco, pode ver todas as chaves
- Vazamento de dados expoe credenciais de terceiros

**Correcao Recomendada:**
1. Criptografar o campo `api_key` antes de armazenar
2. Usar a funcionalidade de Secrets do Supabase Vault para dados sensiveis
3. Ou migrar para armazenamento de secrets via Lovable Cloud

---

#### 1.3 Validacao de Inputs (RISCO MEDIO)

**Arquivos afetados:** Formularios em `src/components/`

**Problemas encontrados:**

| Formulario | Validacao Atual | Falta |
|------------|-----------------|-------|
| QuickExpenseForm | Apenas validacao de numero | Limite de caracteres, sanitizacao |
| QuickIncomeForm | Apenas validacao de numero | Limite de caracteres, sanitizacao |
| ProspectForm | Basica com `.trim()` | Schema Zod completo |
| DebtForm | Basica | Limite de caracteres |
| ProjectForm | Basica | Schema Zod, limites |

**Correcao Recomendada:**
Implementar validacao com Zod em todos os formularios:

```typescript
import { z } from 'zod';

const expenseSchema = z.object({
  description: z.string()
    .trim()
    .min(1, 'Descricao obrigatoria')
    .max(200, 'Descricao muito longa'),
  amount: z.number()
    .positive('Valor deve ser positivo')
    .max(999999999, 'Valor muito alto'),
});
```

---

#### 1.4 Console Logs em Producao (RISCO BAIXO)

**Arquivos afetados:**
- `src/contexts/AuthContext.tsx` - Logs de debug para reset password
- `src/pages/Auth.tsx` - Logs de erro
- `src/hooks/useUserPreferences.ts` - Logs de erro

**Correcao Recomendada:**
Condicionar logs apenas para ambiente de desenvolvimento:

```typescript
if (import.meta.env.DEV) {
  console.log('[Auth] Requesting password reset for:', email);
}
```

---

#### 1.5 dangerouslySetInnerHTML (RISCO BAIXO - OK)

**Arquivo:** `src/components/ui/chart.tsx`

**Avaliacao:** SEGURO - O uso de `dangerouslySetInnerHTML` neste arquivo e apenas para injecao de estilos CSS dinamicos com valores controlados internamente (cores de tema). Nao ha input de usuario envolvido.

---

### 2. PONTOS POSITIVOS (BEM IMPLEMENTADOS)

#### 2.1 Row Level Security (RLS)

**Todas as 23 tabelas tem RLS habilitado com politicas corretas:**

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| categories | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id |
| incomes | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id |
| expenses | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id |
| debts | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id | auth.uid() = user_id |
| ... | ... | ... | ... | ... |

**Avaliacao:** EXCELENTE - Cada usuario so pode acessar seus proprios dados. Nao ha politicas permissivas como `true` ou `public`.

#### 2.2 Tabela user_roles (Seguranca de Roles)

A tabela `user_roles` esta corretamente implementada:
- Separada da tabela de usuarios (evita privilege escalation)
- Apenas politica de SELECT (usuarios nao podem modificar suas proprias roles)
- Funcao `has_role()` com `SECURITY DEFINER` para verificacoes seguras

#### 2.3 Autenticacao

- Uso correto de `onAuthStateChange` e `getSession`
- Validacao de email e senha com Zod na pagina de login
- Nenhum armazenamento de roles ou permissoes em localStorage
- Reset de store ao fazer logout

#### 2.4 Sem SQL Injection

Todas as queries usam o cliente Supabase SDK que automaticamente sanitiza parametros. Nao ha queries SQL raw no codigo.

#### 2.5 Sem Secrets Sensiveis Expostas

- Nenhuma API key secreta no frontend
- Apenas anon key (publicavel) esta exposta
- Service Role Key esta apenas nos secrets do backend

---

### 3. PLANO DE CORRECOES

#### Fase 1: Correcoes Criticas

**1.1 Remover/Criptografar tabela api_keys**

```sql
-- Opcao 1: Se nao estiver em uso, remover
DROP TABLE IF EXISTS public.api_keys;

-- Opcao 2: Mover para Supabase Vault (requer migracao manual)
```

#### Fase 2: Melhorias de Validacao

**2.1 Criar schema de validacao centralizado**

Criar arquivo `src/lib/validation.ts`:

```typescript
import { z } from 'zod';

export const textFieldSchema = (maxLength = 200) => 
  z.string().trim().min(1).max(maxLength);

export const moneySchema = z.number()
  .positive()
  .max(999999999);

export const expenseSchema = z.object({
  description: textFieldSchema(200),
  amount: moneySchema,
  category_id: z.string().uuid().optional(),
});

export const incomeSchema = z.object({
  source: textFieldSchema(200),
  amount: moneySchema,
  category_id: z.string().uuid().optional(),
});

// ... outros schemas
```

**2.2 Atualizar formularios para usar validacao**

Arquivos a modificar:
- `src/components/caixa/QuickExpenseForm.tsx`
- `src/components/caixa/QuickIncomeForm.tsx`
- `src/components/financas/DebtForm.tsx`
- `src/components/projetos/ProjectForm.tsx`
- `src/components/comercial/ProspectForm.tsx`

#### Fase 3: Limpeza de Logs

**3.1 Remover/Condicionar console logs**

Modificar:
- `src/contexts/AuthContext.tsx`
- `src/pages/Auth.tsx`
- `src/hooks/useUserPreferences.ts`
- `src/pages/ResetPassword.tsx`

---

### 4. RESUMO DE RISCOS

| Categoria | Nivel | Status | Acao |
|-----------|-------|--------|------|
| RLS (Row Level Security) | - | OK | Nenhuma |
| Autenticacao | - | OK | Nenhuma |
| Chaves Publicaveis | Baixo | OK | Nenhuma (design intencional) |
| Tabela api_keys | Alto | CORRIGIR | Remover ou criptografar |
| Validacao de Inputs | Medio | MELHORAR | Adicionar schemas Zod |
| Console Logs | Baixo | MELHORAR | Condicionar para DEV |
| XSS (dangerouslySetInnerHTML) | - | OK | Nenhuma (uso seguro) |
| SQL Injection | - | OK | Nenhuma (SDK sanitiza) |

---

### 5. ARQUIVOS A MODIFICAR

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/validation.ts` | CRIAR - Schemas de validacao centralizados |
| `src/components/caixa/QuickExpenseForm.tsx` | Adicionar validacao Zod |
| `src/components/caixa/QuickIncomeForm.tsx` | Adicionar validacao Zod |
| `src/components/financas/DebtForm.tsx` | Adicionar validacao Zod |
| `src/components/projetos/ProjectForm.tsx` | Adicionar validacao Zod |
| `src/contexts/AuthContext.tsx` | Condicionar logs para DEV |
| `src/pages/Auth.tsx` | Condicionar logs para DEV |
| `src/pages/ResetPassword.tsx` | Condicionar logs para DEV |
| Migration SQL | Avaliar remocao/migracao da tabela api_keys |

---

### Conclusao

O aplicativo possui uma base de seguranca **solida**:
- RLS bem configurado em todas as tabelas
- Autenticacao implementada corretamente
- Sem exposicao de secrets sensiveis
- Sem vulnerabilidades de SQL injection

As melhorias recomendadas sao:
1. **Critica:** Avaliar a tabela `api_keys` e sua necessidade
2. **Media:** Padronizar validacao de inputs com Zod
3. **Baixa:** Limpar console logs em producao
