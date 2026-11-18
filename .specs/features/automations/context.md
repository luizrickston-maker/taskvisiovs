# Automations Context

**Gathered:** 2026-11-18
**Spec:** `.specs/features/automations/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Um menu **Automações** no painel do gestor, com uma única automação no ar: criar a estrutura de pastas de um cliente no Adobe Frame.io com um clique. Dois fluxos — cliente novo (projeto + 5 pastas fixas) e projeto de vídeo para cliente existente (pasta de mês + pasta do projeto + 3 pastas de material). Nada além disso: sem upload, sem convites, sem outras integrações, sem comando em linguagem natural.

---

## Implementation Decisions

### Como a estrutura fica no Frame.io

- **Um projeto por cliente**, nomeado exatamente como `clients.name`.
- O projeto ganha as **5 pastas fixas**: `Contratos`, `Artes`, `Textos e Roteiros`, `Relatórios`, `Vídeos`.
- Só a `Vídeos` recebe o fluxo de mês → projeto → material.

### Escopo das pastas fixas

- As 5 pastas completas, não apenas `Vídeos`. O padrão Chapada Digital vale por inteiro.

### Quem conecta a conta Frame.io

- **Uma conexão por workspace.** O gestor conecta uma vez; todos os membros do workspace usam a mesma conexão. Não há login por usuário.

### Forma de dar o comando

- **Só botões e seletores.** Sem campo de texto interpretado como comando.
- Campo de texto existe apenas para o **nome** e o **tipo** do projeto de vídeo — isso é conteúdo digitado, não um comando.

### Agent's Discretion

- Posição do item no sidebar: logo antes de `Ferramentas` em `businessNavItems`.
- Escolha da conta/workspace do Frame.io: primeiro retornado pela API na conexão, gravado na linha.
- Onde o `state` do OAuth é validado: na página de callback, via `sessionStorage`.
- Delay entre criações de pasta: ≥350 ms (o limite da API é 3 chamadas/s).
- Detalhes de UX (estados de loading, rótulos dos toasts) — o spec fixa o conteúdo obrigatório, não a composição visual.

### Declined / Undiscussed Gray Areas → Assumptions

| Área | Default escolhido | Por quê |
| ---- | ----------------- | ------- |
| `Cenas de Apoio` dentro de `Brutos` ou irmã? | **Irmã** — `Brutos`, `Cenas de Apoio`, `Editados` são 3 pastas paralelas | Texto do usuário: "Brutos (com Cenas de Apoio)". Ambíguo; não perguntei para não estender a rodada de decisões. Registrado como premissa **não confirmada** no spec — se estiver errado, é uma mudança de uma linha nos testes e no código. |
| Workspace do Frame.io quando há mais de um | Primeiro retornado | Evita UI de escolha na v1. Marcado como não confirmado. |
| URI de redirect em produção | `https://taskvisiovs.vercel.app/auth/frameio/callback` | A URI atual é `https://localhost:8080/callback`, que só funciona na máquina local. **Ação do usuário: registrar no console da Adobe.** |
| `Tipo` do vídeo | Texto livre, inicial `Video` | Nenhuma lista de tipos foi definida pelo usuário. |
| Acentos nos nomes | Preservados | Frame.io aceita; normalizar seria perda. |

---

## Specific References

- Formato de pasta de projeto, na palavra do usuário: `AAAA-MM-DD_DiaSemana-Tipo-NomeProjeto`
- Formato de pasta de mês: `AAAA-MM-NomeMes`
- Estrutura de material: `Brutos` / `Cenas de Apoio` / `Editados`
- OAuth: platform **OAuth Web App**, scopes `offline_access, profile, additional_info.roles, openid, email`
- Redirect URI hoje: `https://localhost:8080/callback`

---

## Verified by Research (não é opinião)

| Fato | Fonte |
| ---- | ----- |
| `GET https://ims-na1.adobelogin.com/ims/authorize/v2` existe (HTTP 200) | sonda direta `curl` |
| `POST https://ims-na1.adobelogin.com/ims/token/v3` é POST-only (HEAD → 405) e reconhece `grant_type`, `client_id`, `refresh_token` — devolveu `invalid_client: invalid client_id parameter` | sonda direta `curl` |
| `GET /v4/accounts` → 100/min · `GET /v4/accounts/{id}/workspaces` → 100/min | docs Frame.io v4 |
| `GET /v4/accounts/{id}/workspaces/{id}/projects` → 100/min, devolve `root_folder_id` | docs Frame.io v4 |
| `POST .../projects` → **10/min**, corpo `{"data":{"name":...}}`, 201 com `root_folder_id` | docs Frame.io v4 |
| `POST .../folders/{id}/folders` → **3/s**, corpo `{"data":{"name":...}}` | docs Frame.io v4 |
| `GET .../folders/{id}/folders` → 5/s, paginação por `after` | docs Frame.io v4 |
| Access token ~1h; `offline_access` é o scope que dá refresh token | docs Frame.io v4 |
| Escopo S2S seria `openid AdobeID frame.s2s.all` (sem refresh token) | docs Frame.io v4 — **não usado**, o app está como Web App |

## Facts From The Codebase

| Fato | Onde |
| ---- | ---- |
| Sidebar do gestor é o array `businessNavItems` | `src/components/layout/AppSidebar.tsx:44-68` |
| Rotas `/pj/*` são aninhadas sob o layout em `src/App.tsx` | `src/App.tsx:268-375` |
| `clients` tem `id`, `name`, `company_name`, `workspace_id`, `is_active` | `src/integrations/supabase/types.ts:767` |
| Padrão de edge function: valida o caller via `Authorization` + `auth.getUser()`, depois checa papel em `workspace_members` | `supabase/functions/generate-client-portal-link/index.ts:31-60` |
| Padrão de invoke no cliente | `supabase.functions.invoke(nome, { body })` |
| Segredos via `Deno.env.get(...)` | `supabase/functions/notify-appointment/index.ts:82-84` |
| AD-003: lógica testável vive em `supabase/functions/_shared/` como TS puro | `.specs/STATE.md` |
| Nenhuma função nova precisa de `verify_jwt = false` — só webhooks externos usam isso | `supabase/config.toml` |

---

## Deferred Ideas

- Desconectar / revogar a conexão Frame.io.
- Notificação (WhatsApp) do resultado da automação.
- Vincular a pasta criada de volta ao projeto/tarefa do TaskVisio.
- Templates de estrutura editáveis pelo usuário.
- Outras automações no mesmo menu (o menu foi desenhado para receber mais).
- Usar o fluxo **server-to-server** (`client_credentials`, sem usuário e sem redirect URI) se algum dia o app no console da Adobe for trocado de tipo — eliminaria o problema de URI de produção inteiro.
