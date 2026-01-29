

## Plano: Correcao do Erro ERR-S4DZ00 ao Navegar no Menu

### Diagnostico

O erro "Algo deu errado" (ERR-S4DZ00) esta ocorrendo toda vez que voce clica em um item do menu. Baseado na analise do codigo, o problema e causado por uma **falha de contexto** durante a navegacao entre rotas protegidas.

### Causa Raiz Identificada

O `AppLayout.tsx` (linha 15) usa `useRealtimeContext()` que lanca erro se nao estiver dentro de um `RealtimeProvider`. A hierarquia esperada e:

```text
AuthProvider
  └─ ProtectedRoute
       └─ AppBootstrap
            └─ RealtimeBootstrap (cria RealtimeProvider)
                 └─ AppLayout (usa useRealtimeContext) ← ERRO AQUI
```

O problema ocorre quando:
1. Ha uma condicao de corrida durante a navegacao
2. O componente tenta renderizar antes do provider estar pronto
3. Ou ha um remount inesperado que quebra a cadeia de contexto

### Solucao Proposta

Tornar o uso de `useRealtimeContext` mais resiliente no `AppLayout`, com fallback seguro em vez de lancar erro:

---

### Alteracao 1: Contexto Realtime Resiliente

**Arquivo: `src/contexts/RealtimeContext.tsx`**

Adicionar hook alternativo que retorna valor padrao em vez de lancar erro:

```tsx
// Hook seguro que nao lanca erro (para uso em componentes de layout)
export function useRealtimeContextSafe(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  // Retorna valor padrao se nao estiver no provider
  return ctx ?? { status: 'disconnected' };
}
```

---

### Alteracao 2: AppLayout Resiliente

**Arquivo: `src/components/layout/AppLayout.tsx`**

Trocar `useRealtimeContext` por `useRealtimeContextSafe`:

```tsx
// Antes:
import { useRealtimeContext } from '@/contexts/RealtimeContext';
const { status: realtimeStatus } = useRealtimeContext();

// Depois:
import { useRealtimeContextSafe } from '@/contexts/RealtimeContext';
const { status: realtimeStatus } = useRealtimeContextSafe();
```

---

### Alteracao 3: AuthContext Resiliente (Preventivo)

**Arquivo: `src/contexts/AuthContext.tsx`**

Adicionar hook alternativo seguro:

```tsx
// Hook seguro para uso em layouts
export function useAuthContextSafe(): AuthContextValue | null {
  return useContext(AuthContext);
}
```

---

### Alteracao 4: AppSidebar Resiliente

**Arquivo: `src/components/layout/AppSidebar.tsx`**

Adicionar verificacao de seguranca:

```tsx
const authContext = useAuthContextSafe();
const signOut = authContext?.signOut ?? (() => {});
```

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/contexts/RealtimeContext.tsx` | Adicionar `useRealtimeContextSafe` |
| `src/contexts/AuthContext.tsx` | Adicionar `useAuthContextSafe` |
| `src/components/layout/AppLayout.tsx` | Usar hook seguro |
| `src/components/layout/AppSidebar.tsx` | Usar hook seguro |
| `src/components/layout/MobileNav.tsx` | Usar hook seguro |

---

### Resultado Esperado

- Navegacao entre menus funciona sem erros
- Se o contexto nao estiver disponivel, usa valor padrao silenciosamente
- O indicador de realtime mostra "desconectado" como fallback
- Sem quebra de tela ao clicar nos itens do menu

---

### Proximos Passos Apos Implementacao

1. Testar navegacao em todas as paginas do menu
2. Verificar se o erro nao aparece mais
3. Confirmar que funcionalidades dependentes de contexto ainda funcionam

