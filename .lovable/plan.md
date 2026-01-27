

## Plano: Corrigir Recuperacao de Senha

### Problema Identificado

O email de recuperacao de senha nao esta sendo enviado porque as **URLs de redirecionamento** precisam ser configuradas no backend de autenticacao do Lovable Cloud. O codigo frontend esta correto, mas o backend precisa autorizar as URLs de callback.

### Solucao

#### Passo 1: Configurar URLs de Redirecionamento no Backend

Voce precisa acessar o painel do Lovable Cloud e adicionar as URLs permitidas para redirecionamento:

**URLs que precisam ser adicionadas:**
- `https://e5fd2f0c-7bdc-421a-be6e-f85fbf3ede60.lovableproject.com/auth/callback` (preview)
- `https://taskvisionpro.lovable.app/auth/callback` (producao publicada)

#### Passo 2: Verificar Configuracoes de Email

No painel do Lovable Cloud, verificar:
1. Se o servico de email esta habilitado
2. Se os templates de email estao configurados
3. Se o dominio de email esta verificado

### Como Acessar as Configuracoes

Clique no botao abaixo para abrir o painel do Lovable Cloud e configurar as URLs de autenticacao:

**No painel:**
1. Va para a secao "Authentication" ou "Users"
2. Procure por "URL Configuration" ou "Redirect URLs"
3. Adicione as URLs listadas acima
4. Salve as alteracoes

### Ajuste no Codigo (Opcional)

Alem da configuracao do backend, posso melhorar o codigo para:

1. **Adicionar melhor tratamento de erro** - Mostrar mensagem mais especifica quando o email nao pode ser enviado
2. **Adicionar feedback visual** - Indicar claramente se a solicitacao foi enviada
3. **Log de debug** - Adicionar logs para diagnostico em ambiente de desenvolvimento

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Auth.tsx` | Melhorar feedback e tratamento de erro no reset |
| `src/contexts/AuthContext.tsx` | Adicionar log de debug |

### Codigo Proposto

**Auth.tsx - handleResetPassword:**
```typescript
const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    emailSchema.parse(email);
  } catch {
    toast.error('Email invalido');
    return;
  }

  setIsSubmitting(true);
  const { error } = await resetPassword(email);
  setIsSubmitting(false);

  if (error) {
    // Melhor tratamento de erro
    if (error.message.includes('rate limit')) {
      toast.error('Muitas tentativas. Aguarde alguns minutos.');
    } else {
      toast.error(error.message || 'Erro ao enviar email de recuperacao');
    }
    console.error('[Auth] Reset password error:', error);
  } else {
    toast.success('Se o email existir, voce recebera um link de recuperacao.');
    setShowResetPassword(false);
    setEmail('');
  }
};
```

### Proximos Passos

1. **Voce precisa configurar as URLs no Lovable Cloud** (acao manual necessaria)
2. Apos isso, implementarei as melhorias no codigo para melhor feedback

