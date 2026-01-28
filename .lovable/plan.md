

## Plano: Adicionar Indicador Visual para Anexar Documentos

### Problema Atual

O usuário não sabe onde clicar para acessar a funcionalidade de anexar documentos porque:
1. O card/linha do prospect abre o modal de detalhes ao ser clicado, mas não há indicador visual
2. Os botões visíveis (Editar, Excluir, Status) fazem outras ações
3. Não existe um botão ou ícone de "Documentos" ou "Anexar" visível

---

### Solucao Proposta

Adicionar um **botão/ícone visual claro** na lista de prospects que indique a funcionalidade de documentos:

#### Opcao Recomendada: Botao "Ver Detalhes" com Icone de Documento

Adicionar um botão explicito no card mobile e uma coluna/acao na tabela desktop:

```text
+--------------------------------------------------+
| Cliente: João Silva              [Novo v]        |
| Empresa: Acme Corp                               |
|                                                  |
| Data: 28/01/26    Valor: R$ 5.000,00             |
| Projeto: Website  Pagamento: 3x                  |
|                                                  |
| [📎 Anexos] [✏️ Editar] [🗑️]                    |  <-- Novo botao
+--------------------------------------------------+
```

---

### Modificacoes no ProspectList.tsx

#### 1. Mobile (Cards) - Adicionar Botao de Anexos

Na secao de botoes do card (linhas 192-200), adicionar um botao "Anexos":

```tsx
<div className="mt-3 flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
  {/* NOVO: Botao de anexos/detalhes */}
  <Button 
    variant="outline" 
    size="sm" 
    onClick={() => onViewProspect(prospect)}
    className="mr-auto" // Alinha a esquerda
  >
    <FileText className="w-3.5 h-3.5 mr-1" />
    Anexos
  </Button>
  
  <Button variant="outline" size="sm" onClick={() => onEditProspect(prospect)}>
    <Pencil className="w-3.5 h-3.5 mr-1" />
    Editar
  </Button>
  <Button variant="ghost" size="sm" onClick={() => handleDelete(prospect.id)} className="text-destructive">
    <Trash2 className="w-3.5 h-3.5" />
  </Button>
</div>
```

#### 2. Desktop (Tabela) - Adicionar Botao na Coluna de Acoes

No menu dropdown de acoes (linhas 302-314), adicionar opcao "Ver Detalhes/Anexos":

```tsx
<DropdownMenuContent align="end">
  {/* NOVO: Ver Detalhes/Anexos */}
  <DropdownMenuItem onClick={() => onViewProspect(prospect)}>
    <FileText className="w-4 h-4 mr-2" />
    Ver Detalhes
  </DropdownMenuItem>
  
  <DropdownMenuItem onClick={() => onEditProspect(prospect)}>
    <Pencil className="w-4 h-4 mr-2" />
    Editar
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => handleDelete(prospect.id)} className="text-destructive">
    <Trash2 className="w-4 h-4 mr-2" />
    Excluir
  </DropdownMenuItem>
</DropdownMenuContent>
```

#### 3. Opcional: Adicionar Tooltip no Card Indicando Clicabilidade

Adicionar um indicador visual sutil no canto do card:

```tsx
<Card className="p-4 animate-fade-in cursor-pointer hover:shadow-md transition-shadow group">
  {/* Indicador de clicavel */}
  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
    <Tooltip>
      <TooltipTrigger>
        <Eye className="w-4 h-4 text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent>Clique para ver detalhes</TooltipContent>
    </Tooltip>
  </div>
  ...
</Card>
```

---

### Importacoes Necessarias

Adicionar ao ProspectList.tsx:
```tsx
import { FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
```

---

### Resumo das Alteracoes

| Local | Modificacao |
|-------|-------------|
| Card Mobile (linhas 192-200) | Adicionar botao "Anexos" com icone FileText |
| Tabela Desktop (linhas 302-314) | Adicionar item "Ver Detalhes" no dropdown de acoes |
| Card Mobile | Remover `onClick` do card pai (tornar clique explicito via botao) |
| Imports | Adicionar FileText do lucide-react |

---

### Resultado Esperado

Apos a implementacao:
1. No mobile: botao "Anexos" visivel em cada card de prospect
2. No desktop: opcao "Ver Detalhes" no menu de acoes (tres pontinhos)
3. O usuario sabera exatamente onde clicar para acessar documentos
4. Experiencia de usuario mais intuitiva e alinhada com padroes de UI

