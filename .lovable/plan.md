

## Reorganizacao: Pessoal vs Empresarial

### Analise do Cenario Atual

O app possui 8 modulos principais na navegacao:
- **Comercial** (prospecao, metas de vendas)
- **Caixa** (fluxo de caixa pessoal)
- **Financas** (dividas, poupanca pessoal)
- **Foco** (produtividade pessoal)
- **Projetos** (kanban de projetos)
- **Conteudos** (calendario de conteudo)
- **Roteiros** (scripts de video)
- **Area PJ** (precificador, planos, investimentos, time)

---

### Opcoes de Arquitetura

#### Opcao 1: Context Switcher no Header (Recomendada)

Adicionar um seletor abaixo do nome do app que alterna entre "Pessoal" e "Empresarial", filtrando a navegacao:

```text
+------------------------+
|  Chapada Digital       |
|  [Pessoal v]           |  <-- Seletor de contexto
+------------------------+
|  Caixa                 |
|  Financas              |
|  Foco                  |
|  Projetos              |
|  Conteudos             |
|  Roteiros              |
+------------------------+
```

Ao selecionar "Empresarial":
```text
+------------------------+
|  Chapada Digital       |
|  [Empresarial v]       |
+------------------------+
|  Comercial             |
|  Precificador          |
|  Planos                |
|  Investimentos         |
|  Time                  |
+------------------------+
```

**Vantagens:**
- Navegacao limpa e focada
- Escalavel para adicionar mais modulos em cada contexto
- UX moderna usada por apps como Notion, Linear
- Facil alternar entre contextos

**Desvantagens:**
- Requer estado global para o contexto
- Mais complexo de implementar

---

#### Opcao 2: Abas dentro da Area PJ (Simples)

Manter a navegacao atual, mas mover o Comercial como uma aba dentro da Area PJ:

```text
Area PJ
+--------------------------------------------------+
| [Comercial] [Precificador] [Planos] [Invest] [Time]
+--------------------------------------------------+
```

**Vantagens:**
- Implementacao mais simples
- Mantem estrutura de rotas atual
- Menos mudancas no codigo

**Desvantagens:**
- Muitas abas podem ficar confusas no mobile
- Comercial fica "escondido" dentro de Area PJ
- Menos escalavel para novos modulos

---

#### Opcao 3: Grupos de Navegacao com Collapse

Usar grupos expansiveis na sidebar:

```text
+------------------------+
|  Chapada Digital       |
+------------------------+
| v PESSOAL              |
|   Caixa                |
|   Financas             |
|   Foco                 |
|   Projetos             |
|   Conteudos            |
|   Roteiros             |
+------------------------+
| v EMPRESARIAL          |
|   Comercial            |
|   Precificador         |
|   Planos               |
|   Investimentos        |
|   Time                 |
+------------------------+
```

**Vantagens:**
- Visao completa de todas opcoes
- Organizacao clara por contexto
- Sem necessidade de alternar

**Desvantagens:**
- Navegacao mais longa
- Menos elegante no mobile
- Pode parecer sobrecarregado

---

### Recomendacao: Opcao 1 (Context Switcher)

Esta opcao oferece a melhor experiencia de usuario e escalabilidade para adicionar mais funcionalidades no futuro.

---

### Plano de Implementacao

#### 1. Criar Estado Global de Contexto

Adicionar ao Zustand store ou criar um contexto React:

```typescript
// Estado: 'personal' | 'business'
type AppContext = 'personal' | 'business';

// Persistir no localStorage para manter entre sessoes
```

#### 2. Modificar AppSidebar

Adicionar seletor de contexto no header da sidebar:

```text
+------------------------+
|  [Logo] Chapada Digital|
|  +------------------+  |
|  | Pessoal       v  |  |  <-- Select/Dropdown
|  +------------------+  |
+------------------------+
```

#### 3. Definir Navegacao por Contexto

```typescript
const personalNavItems = [
  { title: 'Caixa', url: '/caixa', icon: Wallet },
  { title: 'Financas', url: '/financas', icon: TrendingUp },
  { title: 'Foco', url: '/foco', icon: Target },
  { title: 'Projetos', url: '/projetos', icon: FolderKanban },
  { title: 'Conteudos', url: '/conteudos', icon: FileText },
  { title: 'Roteiros', url: '/roteiros', icon: Pen },
];

const businessNavItems = [
  { title: 'Comercial', url: '/comercial', icon: Briefcase },
  { title: 'Precificador', url: '/pj/precificador', icon: Calculator },
  { title: 'Planos', url: '/pj/planos', icon: Package },
  { title: 'Investimentos', url: '/pj/investimentos', icon: TrendingUp },
  { title: 'Time', url: '/pj/time', icon: Users },
];
```

#### 4. Separar Rotas da Area PJ

Transformar as abas da Area PJ em rotas independentes:
- `/pj/precificador`
- `/pj/planos`
- `/pj/investimentos`
- `/pj/time`
- `/comercial` (mantido, mas visivel apenas no contexto empresarial)

#### 5. Atualizar MobileNav

Aplicar a mesma logica de contexto no menu mobile:

```text
Modo Pessoal:   [Caixa] [Financas] [Foco] [Projetos] [Mais...]
Modo Business:  [Comercial] [Precif.] [Planos] [Invest.] [Mais...]
```

#### 6. Persistir Preferencia

Salvar o contexto selecionado:
- localStorage para manter entre sessoes
- Opcional: salvar no banco para sincronizar entre dispositivos

---

### Arquivos a Modificar/Criar

| Arquivo | Acao |
|---------|------|
| `src/stores/useAppStore.ts` | Adicionar estado `appContext` |
| `src/components/layout/AppSidebar.tsx` | Adicionar seletor de contexto + navegacao condicional |
| `src/components/layout/MobileNav.tsx` | Navegacao condicional por contexto |
| `src/components/layout/AppLayout.tsx` | Passar contexto se necessario |
| `src/App.tsx` | Adicionar rotas `/pj/*` |
| `src/pages/PJ/PrecificadorPage.tsx` | Nova pagina (extrair de AreaPJDashboard) |
| `src/pages/PJ/PlanosPage.tsx` | Nova pagina (extrair de AreaPJDashboard) |
| `src/pages/PJ/InvestimentosPage.tsx` | Nova pagina (extrair de AreaPJDashboard) |
| `src/pages/PJ/TimePage.tsx` | Nova pagina (extrair de AreaPJDashboard) |

---

### Design do Context Switcher

```text
Desktop (Sidebar Header):
+---------------------------+
| [Building2]  Chapada Dig. |
| +----------------------+  |
| | [User] Pessoal    v  |  |
| +----------------------+  |
+---------------------------+

Mobile (Header):
+----------------------------------------+
| [=] Chapada Digital  [Pessoal v]  [•]  |
+----------------------------------------+
```

Visual do dropdown:
```text
+----------------------+
| [User] Pessoal     ✓ |
| [Building2] Empresa  |
+----------------------+
```

---

### Resultado Esperado

Apos implementacao:
1. Usuario pode alternar entre contexto Pessoal e Empresarial
2. Navegacao mostra apenas modulos relevantes ao contexto
3. Comercial fica visivel apenas no modo Empresarial
4. Modulos PJ (Precificador, Planos, etc) viram paginas independentes
5. Escalavel para adicionar novos modulos em cada contexto
6. Experiencia fluida no desktop e mobile
7. Preferencia salva entre sessoes

