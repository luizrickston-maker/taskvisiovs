# Reorganização: Pessoal vs Empresarial ✅

## Status: Implementado

O app foi reorganizado em dois contextos: **Pessoal** e **Empresarial**.

---

## O que foi implementado

### 1. Context Switcher
- Hook `useAppContext` com estado persistido em localStorage
- Componente `ContextSwitcher` no header da sidebar
- Alternância automática baseada na rota atual

### 2. Navegação por Contexto

**Modo Pessoal:**
- Caixa (`/caixa`)
- Finanças (`/financas`)
- Foco (`/foco`)
- Projetos (`/projetos`)
- Conteúdos (`/conteudos`)
- Roteiros (`/roteiros`)

**Modo Empresarial:**
- Comercial (`/comercial`)
- Precificador (`/pj/precificador`)
- Planos (`/pj/planos`)
- Investimentos (`/pj/investimentos`)
- Time (`/pj/time`)

### 3. Páginas PJ Independentes
Cada módulo da antiga "Área PJ" agora é uma página independente:
- `src/pages/PJ/PrecificadorPage.tsx`
- `src/pages/PJ/PlanosPage.tsx`
- `src/pages/PJ/InvestimentosPage.tsx`
- `src/pages/PJ/TimePage.tsx`

### 4. Mobile Navigation
- Context switcher no menu "Mais"
- Botão para alternar entre Pessoal/Empresarial
- Navegação adaptada ao contexto atual

---

## Arquivos Criados/Modificados

| Arquivo | Ação |
|---------|------|
| `src/hooks/useAppContext.ts` | Criado - Estado global de contexto |
| `src/components/layout/ContextSwitcher.tsx` | Criado - Seletor visual |
| `src/components/layout/AppSidebar.tsx` | Atualizado - Navegação condicional |
| `src/components/layout/MobileNav.tsx` | Atualizado - Navegação condicional |
| `src/App.tsx` | Atualizado - Novas rotas `/pj/*` |
| `src/pages/PJ/PrecificadorPage.tsx` | Criado |
| `src/pages/PJ/PlanosPage.tsx` | Criado |
| `src/pages/PJ/InvestimentosPage.tsx` | Criado |
| `src/pages/PJ/TimePage.tsx` | Criado |
| `src/pages/AreaPJDashboard.tsx` | Removido |

---

## Como Usar

1. No desktop: clique no seletor abaixo do nome do app
2. No mobile: acesse "Mais" e clique em "Modo Empresarial" ou "Modo Pessoal"
3. A navegação muda automaticamente se você acessar uma rota do outro contexto
