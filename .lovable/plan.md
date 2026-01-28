

## Correcao: Loop Infinito e Context Switcher

### Problema Identificado

O erro "Maximum update depth exceeded" ocorre por duas causas principais:

#### Causa 1: Rota `/config` causa conflito na logica de auto-switch

A rota `/config` esta presente em AMBOS os contextos (pessoal e empresarial), causando conflito na logica:

```typescript
// AppSidebar.tsx e MobileNav.tsx - useEffect problematico
const isBusinessRoute = businessNavItems.some(item => currentPath.startsWith(item.url));
const isPersonalRoute = personalNavItems.some(item => currentPath.startsWith(item.url));

// Quando em /config:
// - isBusinessRoute = false (config nao esta no array business)
// - isPersonalRoute = false (config nao esta no array personal)
// - Nenhuma condicao e acionada, MAS...
```

O problema real esta no `MobileNav.tsx`:
```typescript
const allPersonalRoutes = [...personalMainNavItems, ...personalMoreNavItems];
// personalMoreNavItems inclui /config

const allBusinessRoutes = [...businessMainNavItems, ...businessMoreNavItems];  
// businessMoreNavItems TAMBEM inclui /config

// Resultado: /config e detectado como AMBOS personal E business!
```

#### Causa 2: ContextSwitcher nao navega ao trocar modo

O `ContextSwitcher` apenas chama `setMode(context.value)` sem navegar para uma rota valida do novo contexto. Isso deixa o usuario em uma rota que pode nao existir no novo contexto.

---

### Plano de Correcao

#### 1. Remover auto-switch do useEffect

A logica de auto-switch baseada em rota esta causando o loop infinito. Vamos remover completamente e deixar o usuario controlar manualmente o contexto.

**Arquivos afetados:**
- `src/components/layout/AppSidebar.tsx` - remover useEffect lines 54-65
- `src/components/layout/MobileNav.tsx` - remover useEffect lines 51-65

#### 2. Adicionar navegacao ao ContextSwitcher

Quando o usuario troca de contexto, navegar automaticamente para a rota padrao:

```typescript
// ContextSwitcher.tsx
import { useNavigate } from 'react-router-dom';

export function ContextSwitcher({ collapsed = false }: ContextSwitcherProps) {
  const { mode, setMode } = useAppContext();
  const navigate = useNavigate();
  
  const handleModeChange = (newMode: AppContextMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      // Navegar para rota padrao do novo contexto
      const defaultRoute = newMode === 'personal' ? '/caixa' : '/comercial';
      navigate(defaultRoute);
    }
  };
  
  // onClick={() => handleModeChange(context.value)}
}
```

#### 3. Excluir `/config` da logica de deteccao de contexto

Se quisermos manter alguma logica de auto-switch no futuro, `/config` deve ser tratada como rota neutra:

```typescript
// Rotas que pertencem a ambos os contextos (neutras)
const neutralRoutes = ['/config'];

// No useEffect, verificar antes:
if (neutralRoutes.some(r => currentPath.startsWith(r))) {
  return; // Nao fazer nada para rotas neutras
}
```

---

### Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/layout/AppSidebar.tsx` | Remover useEffect de auto-switch (lines 54-65) e import do useEffect |
| `src/components/layout/MobileNav.tsx` | Remover useEffect de auto-switch (lines 51-65) |
| `src/components/layout/ContextSwitcher.tsx` | Adicionar useNavigate e navegar ao trocar contexto |

---

### Codigo Final

#### AppSidebar.tsx (remover auto-switch)

```typescript
// REMOVER estas linhas:
// import { useEffect } from 'react';

// REMOVER este useEffect:
// useEffect(() => {
//   const currentPath = location.pathname;
//   const isBusinessRoute = businessNavItems.some(item => currentPath.startsWith(item.url));
//   const isPersonalRoute = personalNavItems.some(item => currentPath.startsWith(item.url));
//   
//   if (isBusinessRoute && mode === 'personal') {
//     setMode('business');
//   } else if (isPersonalRoute && mode === 'business') {
//     setMode('personal');
//   }
// }, [location.pathname, mode, setMode]);

// REMOVER funcao nao utilizada:
// const handleModeChange = ...
```

#### ContextSwitcher.tsx (adicionar navegacao)

```typescript
import { User, Building2, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAppContext, type AppContextMode } from '@/hooks/useAppContext';
import { ... } from '@/components/ui/dropdown-menu';

export function ContextSwitcher({ collapsed = false }: ContextSwitcherProps) {
  const { mode, setMode } = useAppContext();
  const navigate = useNavigate();
  
  const handleModeChange = (newMode: AppContextMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      const defaultRoute = newMode === 'personal' ? '/caixa' : '/comercial';
      navigate(defaultRoute);
    }
  };

  return (
    <DropdownMenu>
      {/* ... */}
      <DropdownMenuItem
        key={context.value}
        onClick={() => handleModeChange(context.value)}
        {/* ... */}
      >
    </DropdownMenu>
  );
}
```

---

### Resultado Esperado

Apos as correcoes:
1. Nao havera mais loop infinito ao acessar `/config`
2. A selecao "Empresarial" funcionara corretamente
3. Ao trocar de contexto, o usuario sera navegado para a pagina inicial do contexto
4. A rota `/config` sera acessivel em ambos os contextos
5. O estado do contexto sera mantido via localStorage (ja implementado)

