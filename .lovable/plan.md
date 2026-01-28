

## Diagnóstico do Erro na Página Caixa

### Problema Identificado

O erro "Algo deu errado" (ERR-AJH5RY) ao acessar a página Caixa é causado por uma **violação das Rules of Hooks do React** no componente `AppBootstrap.tsx`.

### Causa Raiz

No arquivo `src/components/bootstrap/AppBootstrap.tsx` (linhas 31-35):

```tsx
// Em safe mode, pula inicialização de dados
if (!safeMode) {
  useInitializeData(userId);  // ❌ Hook chamado condicionalmente!
}
```

O React exige que hooks sejam chamados **incondicionalmente** e na **mesma ordem** em toda renderização. Quando `safeMode` muda de valor, o número de hooks chamados varia, causando o erro "Rendered fewer hooks than expected".

---

## Plano de Correção

### Arquivo a modificar

`src/components/bootstrap/AppBootstrap.tsx`

### Correção

Modificar o hook `useInitializeData` para aceitar um parâmetro `disabled` internamente, em vez de chamá-lo condicionalmente:

**Opção 1 (Recomendada):** Passar o userId como `undefined` quando em safe mode

```tsx
// Antes (INCORRETO)
if (!safeMode) {
  useInitializeData(userId);
}

// Depois (CORRETO)
useInitializeData(safeMode ? undefined : userId);
```

Esta opção funciona porque `useInitializeData` já verifica se `userId` é `undefined` e retorna sem fazer nada nesse caso.

---

## Detalhes Técnicos

| Item | Antes | Depois |
|------|-------|--------|
| Chamada do hook | Condicional (dentro de `if`) | Incondicional (sempre chamado) |
| Safe mode | Pula execução do hook | Passa `undefined` para o hook |
| Conformidade React | Viola Rules of Hooks | Segue Rules of Hooks |

### Verificação Adicional

O hook `useInitializeData` já tem a verificação necessária na linha 40:

```tsx
if (!userId) {
  loadingRef.current = false;
  return;  // Retorna sem fazer nada se userId for undefined
}
```

Portanto, passar `undefined` quando em safe mode fará o hook retornar imediatamente sem executar a inicialização de dados.

---

## Resultado Esperado

Após a correção:

1. A página Caixa (e todas as outras páginas protegidas) carregará corretamente
2. O erro "Algo deu errado" não aparecerá mais ao navegar
3. O safe mode (`?safe=1`) continuará funcionando como esperado
4. O app seguirá as Rules of Hooks do React

