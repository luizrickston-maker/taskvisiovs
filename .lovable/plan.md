

# Encurtar Link do Portal do Cliente

## Problema Identificado

O link gerado pelo sistema de magic link aponta para o endpoint de autenticacao do backend, resultando em uma URL extremamente longa:

```
https://kxuwzhnkragzsqafszpo.supabase.co/auth/v1/verify?token=<token_longo>&type=magiclink&redirect_to=https%3A%2F%2Ftaskvisionpro.lovable.app%2Fauth%2Fcallback
```

Isso causa dois problemas:
- Apps de mensagem no mobile truncam ou quebram o link, impedindo o acesso
- A URL expoe o ID do projeto backend, o que nao e ideal

## Solucao: Sistema de Short Links interno

Criar um encurtador de links interno que transforma a URL longa em algo como:

```
https://taskvisionpro.lovable.app/p/aB3xK9
```

### Etapas

**1. Nova tabela `portal_short_links`**

Armazena o mapeamento entre codigo curto e a URL completa do magic link.

- `id` (uuid, PK)
- `code` (text, unique, 8 caracteres alfanumericos)
- `target_url` (text, a URL completa do magic link)
- `created_at` (timestamptz)
- `expires_at` (timestamptz, default now() + 1 hora)
- RLS: somente leitura publica (SELECT) para que a pagina de redirect funcione sem autenticacao

**2. Modificar Edge Function `generate-client-portal-link`**

Apos gerar o magic link, salvar na tabela `portal_short_links` com um codigo curto aleatorio e retornar a URL curta:

```
https://taskvisionpro.lovable.app/p/<codigo>
```

**3. Nova pagina React `/p/:code`**

Uma pagina simples (sem layout) que:
1. Busca o `target_url` na tabela `portal_short_links` usando o `code`
2. Valida que o link nao expirou
3. Redireciona o navegador para o `target_url` (que e o magic link original)
4. Mostra mensagem de erro se o link for invalido ou expirado

**4. Rota no App.tsx**

Adicionar a rota `/p/:code` fora do ProtectedRoute (acesso publico).

**5. Atualizar `ClientPortalAccessCard`**

O link geral do portal (`PORTAL_URL`) permanece como `https://taskvisionpro.lovable.app/auth`. Apenas o link individual (magic link) sera encurtado.

---

### Detalhes Tecnicos

- Geracao do codigo curto: 8 caracteres usando `crypto.getRandomValues` com charset alfanumerico (a-z, A-Z, 0-9) -- 62^8 = ~218 trilhoes de combinacoes
- Expiracao padrao: 1 hora (magic links do Supabase expiram em 1h por padrao)
- Tabela com RLS: politica SELECT para `anon` role (necessario para lookup sem autenticacao), INSERT restrito a `service_role` (feito pela edge function)
- A pagina `/p/:code` exibe um spinner enquanto carrega e mensagem amigavel se expirado

