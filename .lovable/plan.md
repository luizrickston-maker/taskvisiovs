
## Plano: Redesign Profissional da Tela de Projetos de Clientes (Versao Empresarial)

### Analise Comparativa

Comparei a tela de Projetos de Clientes (`/pj/projetos`) com o redesign que fizemos na versao pessoal e identifiquei as seguintes diferencas:

| Elemento | Versao Pessoal (Atualizada) | Versao Empresarial (Atual) |
|----------|----------------------------|---------------------------|
| **Header** | Icone em container destacado + titulo + descricao | Icone inline simples |
| **KPIs** | Cards `glass-card` com icones coloridos | Cards simples sem icones |
| **Filtros** | Card container organizado | Elementos soltos |
| **Cards de Projeto** | DropdownMenu para acoes | Botoes visíveis no hover |
| **Layout Geral** | `p-4 md:p-6 space-y-6` | `space-y-6` sem padding externo |
| **Animacoes** | `animate-fade-in` aplicado | Presente |

---

### Alteracoes Necessarias

#### 1. ProjetosClientesPage.tsx - Redesign Completo

**Header Profissional**
```text
+--------------------------------------------------+
|  [Container] [Icone]                              |
|                      Projetos de Clientes        |
|                      Gerencie projetos e...      |
+--------------------------------------------------+
```

**KPIs com Estilo glass-card**
- Adicionar icones coloridos em cada KPI
- Usar classe `glass-card`
- Adicionar icone no container (como versao pessoal)

**Barra de Filtros em Card Container**
- Envolver filtros em `Card` com `glass-card`
- Organizar busca + filtros em layout mais limpo

---

#### 2. ClientProjectCard.tsx - Melhorias

**Migrar Acoes para DropdownMenu**
- Substituir botoes Edit/Delete por menu dropdown
- Adicionar borda lateral baseada em prioridade (padrao da versao pessoal)
- Usar classe `glass-card`

**Estrutura Atualizada**
```text
+----------------------------------------+
| [Borda P1-P5]                          |
|                                        |
|  Nome do Projeto            [Menu ...] |
|  Cliente | Empresa                     |
|                                        |
|  [P1] [Em Progresso]                   |
|                                        |
|  Prazo: 15/02/2026                     |
|                                        |
|  Progresso: 75%  ████████░░           |
|  4/6 tarefas    12h / 20h             |
+----------------------------------------+
```

---

#### 3. ClientProjectDetail.tsx - Ajustes de Estilo

**Cards de Stats**
- Aplicar `glass-card` aos cards de estatísticas
- Melhorar layout dos KPIs internos

**Task Cards**
- Adicionar borda de prioridade
- Migrar botoes para DropdownMenu

---

### Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/PJ/ProjetosClientesPage.tsx` | Header profissional, KPIs com glass-card e icones, filtros em card container |
| `src/components/areapj/projetos/ClientProjectCard.tsx` | glass-card, borda de prioridade, DropdownMenu para acoes |
| `src/components/areapj/projetos/ClientProjectDetail.tsx` | glass-card nos stats, melhorar task cards |

---

### Detalhes Tecnicos

**Classes CSS Padrao**
```tsx
// Header container
<div className="p-2.5 rounded-xl bg-primary/10">
  <FolderKanban className="w-6 h-6 text-primary" />
</div>

// KPI Cards
<Card className="glass-card">
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Label</p>
        <p className="text-2xl font-bold">Value</p>
      </div>
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </div>
  </CardContent>
</Card>

// Borda de Prioridade nos Cards
const priorityBorderColors = {
  1: 'border-l-4 border-l-red-500',
  2: 'border-l-4 border-l-orange-500',
  3: 'border-l-4 border-l-yellow-500',
  4: 'border-l-4 border-l-blue-500',
  5: 'border-l-4 border-l-gray-400',
};
```

**Componentes a Importar**
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Clock, AlertTriangle } from 'lucide-react';
```

---

### Estrutura Visual Final

```text
+------------------------------------------------------------------+
|  [Container]                                                      |
|  [FolderKanban]  Projetos de Clientes                            |
|                  Gerencie projetos e acompanhe o progresso       |
|                                                [+ Novo Projeto]   |
+------------------------------------------------------------------+

+-------------+  +-------------+  +-------------+  +-------------+
| [Icon]      |  | [Icon]      |  | [Icon]      |  | [Icon]      |
| Total       |  | Em Progresso|  | Concluidos  |  | Atrasados   |
| 8           |  | 3           |  | 4           |  | 1           |
+-------------+  +-------------+  +-------------+  +-------------+

+------------------------------------------------------------------+
| [Search icon] Buscar...     [Status v] [Prioridade v]            |
+------------------------------------------------------------------+

+----------------+  +----------------+  +----------------+
| [Border P1]    |  | [Border P2]    |  | [Border P3]    |
|                |  |                |  |                |
| Website XYZ    |  | App Mobile     |  | Dashboard      |
| Joao | Empresa |  | Maria | Corp   |  | Pedro | Tech   |
|                |  |                |  |                |
| [P1] [Progress]|  | [P2] [Todo]    |  | [P3] [Done]    |
|                |  |                |  |                |
| 15/02/2026     |  | 20/03/2026     |  | Concluido      |
| ████████░░ 80% |  | ██░░░░░░ 25%   |  | ██████████100% |
+----------------+  +----------------+  +----------------+
```

---

### Resultado Esperado

- Visual 100% consistente entre versao Pessoal e Empresarial
- Hierarquia visual profissional (header -> KPIs -> filtros -> conteudo)
- Acoes organizadas em menus dropdown
- Bordas de prioridade para identificacao visual rapida
- Cards com efeito glass-card para visual moderno
