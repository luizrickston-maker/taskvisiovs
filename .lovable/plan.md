

# Correção do Erro: useAuthContext fora do AuthProvider

## Diagnóstico

O erro ocorre porque o `ProtectedRoute` tenta usar `useAuthContext()` em um momento em que o contexto de autenticação ainda não está disponível. Isso acontece principalmente em dois cenários:

1. **Hot Module Replacement (HMR)**: Quando o Vite recarrega módulos durante o desenvolvimento, a ordem de inicialização pode causar componentes serem renderizados antes dos seus providers
2. **ErrorBoundary Recovery**: O `ErrorBoundary` está posicionado fora do `AuthProvider`, então quando ocorre um erro e o usuário clica em "Tentar novamente", o estado do provider pode estar inconsistente

## Estrutura Atual do App

```text
ErrorBoundary (fora do AuthProvider)
  └── QueryClientProvider
        └── AuthProvider
              └── BrowserRouter
                    └── Routes
                          ├── /auth (usa useAuthContext)
                          └── ProtectedRoute (usa useAuthContext)
```

## Solução

### 1. Modificar o ProtectedRoute para usar `useAuthContextSafe`

O projeto já possui um hook seguro `useAuthContextSafe()` que retorna `null` em vez de lançar erro quando fora do provider. Devemos usá-lo no `ProtectedRoute` e tratar o caso de contexto ausente como um estado de loading.

**Arquivo**: `src/components/ProtectedRoute.tsx`

```typescript
// Mudança de:
import { useAuthContext } from '@/contexts/AuthContext';

// Para:
import { useAuthContextSafe } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const authContext = useAuthContextSafe();
  
  // Se o contexto não existir, trata como loading
  if (!authContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Inicializando...</p>
        </div>
      </div>
    );
  }
  
  const { user, loading: authLoading } = authContext;
  // ... resto da lógica
}
```

### 2. Modificar a página Auth para usar `useAuthContextSafe`

A página `/auth` também usa `useAuthContext` diretamente, o que pode causar o mesmo problema.

**Arquivo**: `src/pages/Auth.tsx`

```typescript
// Usar useAuthContextSafe e tratar contexto ausente como loading
const authContext = useAuthContextSafe();

if (!authContext || authContext.loading) {
  return <LoadingSpinner />;
}

const { user, resetPassword } = authContext;
```

### 3. (Opcional) Mover ErrorBoundary para dentro do AuthProvider

Para garantir que erros sejam tratados corretamente com o contexto de auth disponível, podemos criar um ErrorBoundary interno.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ProtectedRoute.tsx` | Usar `useAuthContextSafe` com fallback para loading |
| `src/pages/Auth.tsx` | Usar `useAuthContextSafe` com fallback para loading |

## Benefícios

- Elimina erros de contexto durante HMR
- Experiência mais suave com loading state em vez de tela de erro
- Mantém compatibilidade com o padrão existente (já há `useAuthContextSafe` definido)
- Segue o padrão "resilient-context-hooks-pattern" já documentado na arquitetura

