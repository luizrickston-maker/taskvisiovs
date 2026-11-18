# Automations Specification

## Problem Statement

Criar a estrutura de pastas de um cliente no Frame.io hoje é manual: abrir o Frame.io, criar o projeto, criar cinco pastas raiz e, a cada vídeo, repetir a pasta de mês, a pasta do projeto e as subpastas de material. É repetitivo, propenso a erro de nomenclatura e não segue um padrão. O TaskVisio já conhece o cliente e a data — ele deve fazer esse trabalho com um clique.

## Goals

- [ ] Um gestor conecta o Frame.io uma vez por workspace e a conexão sobrevive mais de uma hora sem novo login.
- [ ] Com um clique, um cliente selecionado ganha projeto + as 5 pastas fixas no Frame.io, sem duplicar nada se executado duas vezes.
- [ ] Com um clique, um vídeo ganha pasta de mês, pasta de projeto e as 3 pastas de material, no formato `AAAA-MM-DD_DiaSemana-Tipo-NomeProjeto`.
- [ ] Toda falha do Frame.io vira uma mensagem legível com ação de repetir — nunca um sucesso silencioso.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Entrada de comando em linguagem natural | Decisão do usuário: primeira versão é "só botões e seletores". |
| Outras automações além do Frame.io | O menu nasce com uma automação; as seguintes entram em features próprias. |
| Upload de arquivos para o Frame.io | O pedido é criar estrutura de pastas, não mover material. |
| Convidar cliente ou colaborador para o projeto do Frame.io | Permissão e convite são outro fluxo, com outro risco. |
| Nomes de pastas configuráveis ou templates editáveis | V1 usa constantes fixas; configurabilidade é decisão futura. |
| Ação de desconectar | Reconectar sobrescreve a conexão; revogação fica para depois. |
| Vincular pastas do Frame.io a projetos/tarefas do TaskVisio | Não pedido; exigiria modelo de correspondência entre os dois. |
| Criar contas ou workspaces no Frame.io | A integração usa a conta já existente. |
| Notificação (WhatsApp ou outra) do resultado da automação | Não pedido. |
| Criar estrutura retroativa para clientes anteriores | Mesmo critério do usuário em features passadas: só o que for criado a partir de agora. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| "Brutos (com Cenas de Apoio)" aninhado ou irmão? | `Brutos`, `Cenas de Apoio` e `Editados` são **três pastas irmãs** sob a pasta do projeto | Confirmado pelo usuário em 2026-11-18: "três pastas irmãs (Brutos, Cenas de Apoio, Editados) esse é o correto." | y |
| Estrutura fixa = 5 pastas ou só `Vídeos`? | As 5 pastas: `Contratos`, `Artes`, `Textos e Roteiros`, `Relatórios`, `Vídeos` | Escolha explícita do usuário em discussão. Só a `Vídeos` recebe o fluxo de mês/projeto. | y |
| Um projeto Frame.io por cliente ou um projeto único? | **Um projeto por cliente**, nomeado exatamente como `clients.name` | Escolha explícita do usuário; dá isolamento de permissão e um link direto por cliente. | y |
| Quem conecta a conta Frame.io? | **Uma conexão por workspace** — o gestor conecta uma vez e todos usam | Escolha explícita do usuário; cabe em "clique um botão". | y |
| Forma do comando | **Só botões e seletores** — sem campo de texto interpretado | Escolha explícita do usuário. Campos de texto livres existem apenas para nome/tipo do projeto, que são conteúdo, não comando. | y |
| Workspace do Frame.io usado | O **primeiro** `account` e o **primeiro** `workspace` devolvidos pela API no momento da conexão, gravados na linha de conexão | Evita UI de escolha na v1. Se a conta Adobe tiver mais de um workspace do Frame.io, esta premissa precisa ser revista. | n |
| URI de redirecionamento em produção | Rota da aplicação `https://taskvisiovs.vercel.app/auth/frameio/callback` | Registrada pelo usuário no console da Adobe em 2026-11-18 ("alterei agr o redirect para url do taskvisovs recomendada"). | y |
| Onde o `state` é validado | Na página de callback da aplicação, contra valor guardado em `sessionStorage` antes de qualquer chamada ao servidor | A troca do `code` exige o `client_secret`, que fica no servidor; a proteção CSRF do redirecionamento pertence ao originador do fluxo, que é o navegador. | y |
| `Tipo` do projeto de vídeo | Campo de texto livre, valor inicial `Video` | O usuário não definiu uma lista de tipos; inventar um enum criaria vocabulário que ele não usa. | y |
| Acentuação nos nomes de pasta | Preservada; só sequências de espaço viram `-` | Frame.io aceita acentos. Normalizar seria perda de informação sem ganho. | y |
| `verify_jwt` das funções novas | Padrão Supabase (**não** declarar `verify_jwt = false`) | Ambas as funções são chamadas da aplicação com JWT do usuário. O padrão `false` do repositório existe para webhooks externos, que este fluxo não tem. | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Conectar o Frame.io e criar a estrutura de cliente novo ⭐ MVP

**User Story**: As a workspace manager, I want to connect Frame.io once and create a client's full folder structure with one button, so that every client starts from the same Chapada Digital pattern without me building it by hand.

**Why P1**: This is the whole point of the feature. Without the connection nothing else can run, and the client structure is the flow the user asked for first.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN a signed-in user who is a workspace admin loads the application THEN the sidebar SHALL include an "Automações" entry pointing to `/pj/automacoes`. <!-- event-driven -->
2. WHEN a signed-in user is not a workspace admin of any workspace THEN the sidebar SHALL NOT include the "Automações" entry. <!-- event-driven -->
3. WHEN a user who is not a workspace admin navigates directly to `/pj/automacoes` THEN the page SHALL NOT render the connection or creation actions. <!-- event-driven -->
4. WHEN a workspace admin activates the Frame.io connection action THEN the system SHALL navigate the browser to `https://ims-na1.adobelogin.com/ims/authorize/v2` carrying `response_type=code`, the configured `client_id`, the registered `redirect_uri`, the scope `openid email profile offline_access additional_info.roles`, and a `state` value. <!-- event-driven -->
5. IF the value returned in `state` differs from the value the system generated for that attempt THEN the system SHALL abort the connection attempt and SHALL NOT write a connection row. <!-- unwanted-behavior -->
6. WHEN Adobe returns a `code` to the registered `redirect_uri` THEN the system SHALL exchange it by sending `grant_type=authorization_code` with that `code`, `client_id`, `client_secret` and `redirect_uri` to `https://ims-na1.adobelogin.com/ims/token/v3`. <!-- event-driven -->
7. WHEN the exchange succeeds THEN the system SHALL store exactly one connection row per `workspace_id`, holding the Frame.io account id, the Frame.io workspace id, the access token, its expiry instant and the refresh token. <!-- event-driven -->
8. The system SHALL supply `client_secret` exclusively from a Supabase Edge Function environment variable, and SHALL NOT place it in client-side source, in the built bundle, or in any `VITE_*` variable. <!-- ubiquitous -->
9. WHEN a workspace has no stored connection THEN the Automations page SHALL display a connection action and SHALL NOT display the structure-creation actions. <!-- event-driven -->
10. WHEN a workspace has a stored connection THEN the Automations page SHALL display its connected state and SHALL display the structure-creation actions. <!-- event-driven -->
11. WHEN a workspace admin selects a client and activates the creation action THEN the system SHALL ensure a Frame.io project whose name equals `clients.name` exists in the connected Frame.io workspace, creating it if absent. <!-- event-driven -->
12. WHEN the project exists or has just been created THEN the system SHALL ensure the folders `Contratos`, `Artes`, `Textos e Roteiros`, `Relatórios` and `Vídeos` exist directly under that project's root folder, creating only the ones that are absent. <!-- event-driven -->
13. IF a folder with the target name already exists under that parent THEN the system SHALL reuse it and SHALL NOT create a second folder of that name. <!-- unwanted-behavior -->
14. IF a creation run stops partway and is run again for the same client THEN the system SHALL create only the items still missing and SHALL NOT report an error because earlier items already exist. <!-- unwanted-behavior -->
15. WHILE a creation run is in flight the system SHALL keep the submitting control disabled and SHALL NOT start a second concurrent run for the same client. <!-- state-driven -->
16. WHEN a run has to create more than one folder THEN the system SHALL send the folder-create requests one at a time, with at least 350 ms between consecutive requests. <!-- event-driven -->
17. WHEN a run finishes with every item present THEN the system SHALL display a success message listing the items it created and marking the items that already existed. <!-- event-driven -->
18. IF the Frame.io API rejects a call with HTTP 401 THEN the system SHALL refresh the access token once and retry that call once. <!-- unwanted-behavior -->
19. IF the Frame.io API is unreachable or answers with HTTP 5xx after the permitted retries THEN the system SHALL display a failure message naming the step that failed and SHALL offer a `Tentar novamente` action. <!-- unwanted-behavior -->
20. WHILE the stored access token is within 5 minutes of its expiry the system SHALL obtain a fresh access token using `grant_type=refresh_token` before the next Frame.io call. <!-- state-driven -->
21. IF the refresh token is rejected by Adobe THEN the system SHALL mark the connection as requiring reconnection and SHALL display a `Reconectar Frame.io` action. <!-- unwanted-behavior -->

**Independent Test**: Connect with a real Adobe account, click create for an existing client, and confirm the Frame.io project plus five folders appear — then click again and confirm nothing is duplicated.

---

### P2: Criar projeto de vídeo para cliente existente

**User Story**: As a workspace manager, I want to pick a client, a date and a project name and get the month folder, the project folder and its material folders created in Frame.io, so that every video lands in the same place with the same name.

**Why P2**: The client structure must exist first, so this flow sits on top of P1 — but it is the recurring daily use and was requested alongside it.

**Acceptance Criteria**:

1. WHEN a workspace admin selects a client, a date, a type and a project name and activates the video-project action THEN the system SHALL ensure the folder `Vídeos` exists directly under that client's Frame.io project root folder. <!-- event-driven -->
2. WHEN `Vídeos` exists or has just been created THEN the system SHALL ensure a folder named `AAAA-MM-NomeMes` exists directly under `Vídeos`. <!-- event-driven -->
3. When the month folder exists or has just been created THEN the system SHALL ensure a folder named `AAAA-MM-DD_DiaSemana-Tipo-NomeProjeto` exists directly under it. <!-- event-driven -->
4. WHEN the project folder exists or has just been created THEN the system SHALL ensure the folders `Brutos`, `Cenas de Apoio` and `Editados` exist directly under it. <!-- event-driven -->
5. IF a folder with the target name already exists under that parent THEN the system SHALL reuse it and SHALL NOT create a second folder of that name. <!-- unwanted-behavior -->
6. IF a creation run stops partway and is run again for the same client, date, type and project name THEN the system SHALL create only the items still missing and SHALL NOT report an error because earlier items already exist. <!-- unwanted-behavior -->
7. The system SHALL render `NomeMes` as the full Portuguese month name of the selected date with its first letter uppercased, such as `Novembro`. <!-- ubiquitous -->
8. The system SHALL render `DiaSemana` as one of `Segunda`, `Terça`, `Quarta`, `Quinta`, `Sexta`, `Sábado`, `Domingo` for the selected date. <!-- ubiquitous -->
9. The system SHALL replace each run of whitespace in `Tipo` and in `NomeProjeto` with a single hyphen when building the folder name, preserving every other character including accents. <!-- ubiquitous -->
10. IF no Frame.io project exists for the selected client THEN the system SHALL display `Crie primeiro a estrutura do cliente` and SHALL NOT create any folder or project. <!-- unwanted-behavior -->
11. WHILE a creation run is in flight the system SHALL keep the submitting control disabled and SHALL NOT start a second concurrent run for the same client, date, type and project name. <!-- state-driven -->
12. WHEN a run finishes with every item present THEN the system SHALL display a success message listing the items it created and marking the items that already existed. <!-- event-driven -->

**Independent Test**: Run the flow twice for `2026-11-05` / `Video` / `Lancamento` and confirm the second run reports everything as already present with no duplicate folders in Frame.io.

---

### P3: Resiliência diante de falhas do Frame.io

**User Story**: As a workspace manager, I want a rate-limit or a mid-run outage to be reported honestly with what was and was not created, so that I never believe a structure is complete when part of it failed.

**Why P3**: P1 already surfaces terminal failures; this story covers the two cases that would otherwise lie to the user — throttling and partial completion.

**Acceptance Criteria**:

1. IF the Frame.io API answers a call with HTTP 429 THEN the system SHALL wait for the `Retry-After` value, or 1 second when it is absent, and SHALL retry that call up to 3 times. <!-- unwanted-behavior -->
2. IF a run fails after at least one item was created THEN the system SHALL display both the items created before the failure and the items not created. <!-- unwanted-behavior -->
3. IF a run fails on the very first item THEN the system SHALL display that nothing was created and SHALL offer a `Tentar novamente` action. <!-- unwanted-behavior -->

---

## Edge Cases

- IF the Frame.io project already exists but one or more of the five folders are missing (someone deleted a folder) THEN the system SHALL create only the missing folders. <!-- unwanted-behavior -->
- IF the client's `name` contains a character Frame.io rejects as a project name THEN the system SHALL surface the Frame.io error message and SHALL NOT create a partial project. <!-- unwanted-behavior -->
- IF the selected date falls in a month whose folder exists but whose project folder does not THEN the system SHALL create only the project folder and its material folders. <!-- unwanted-behavior -->
- IF two different clients share the same `clients.name` in the same workspace THEN the system SHALL treat them as one Frame.io project, because the project name is the only key. <!-- unwanted-behavior -->
- IF the connection row exists but its Frame.io workspace no longer exists THEN the system SHALL display `Reconectar Frame.io` rather than an empty success. <!-- unwanted-behavior -->
- WHEN the user leaves `/pj/automacoes` mid-run THEN the system SHALL NOT start a second run when they return and click again before the first completes. <!-- event-driven -->

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| MENU-01 | P1: Conexão + estrutura de cliente | Pending | Pending |
| MENU-02 | P1: Conexão + estrutura de cliente | Pending | Pending |
| MENU-03 | P1: Conexão + estrutura de cliente | Pending | Pending |
| AUTH-01 | P1: Conexão + estrutura de cliente | Pending | Pending |
| AUTH-02 | P1: Conexão + estrutura de cliente | Pending | Pending |
| AUTH-03 | P1: Conexão + estrutura de cliente | Pending | Pending |
| AUTH-04 | P1: Conexão + estrutura de cliente | Pending | Verified |
| AUTH-05 | P1: Conexão + estrutura de cliente | Pending | Pending |
| AUTH-06 | P1: Conexão + estrutura de cliente | Pending | Pending |
| AUTH-07 | P1: Conexão + estrutura de cliente | Pending | Verified |
| AUTH-08 | P1: Conexão + estrutura de cliente | Pending | Pending |
| AUTH-09 | P1: Conexão + estrutura de cliente | Pending | Verified |
| STRU-01 | P1: Conexão + estrutura de cliente | Pending | Pending |
| STRU-02 | P1: Conexão + estrutura de cliente | Pending | Pending |
| STRU-03 | P1: Conexão + estrutura de cliente | Pending | Pending |
| STRU-04 | P1: Conexão + estrutura de cliente | Pending | Pending |
| STRU-05 | P1: Conexão + estrutura de cliente | Pending | Verified |
| STRU-06 | P1: Conexão + estrutura de cliente | Pending | Pending |
| STRU-07 | P1: Conexão + estrutura de cliente | Pending | Pending |
| RETY-01 | P1: Conexão + estrutura de cliente | Pending | Pending |
| FAIL-01 | P1: Conexão + estrutura de cliente | Pending | Pending |
| PROJ-01 | P2: Projeto de vídeo | Pending | Pending |
| PROJ-02 | P2: Projeto de vídeo | Pending | Pending |
| PROJ-03 | P2: Projeto de vídeo | Pending | Pending |
| PROJ-04 | P2: Projeto de vídeo | Pending | Pending |
| PROJ-05 | P2: Projeto de vídeo | Pending | Pending |
| PROJ-06 | P2: Projeto de vídeo | Pending | Pending |
| PROJ-07 | P2: Projeto de vídeo | Pending | Verified |
| PROJ-08 | P2: Projeto de vídeo | Pending | Verified |
| PROJ-09 | P2: Projeto de vídeo | Pending | Verified |
| PROJ-10 | P2: Projeto de vídeo | Pending | Pending |
| PROJ-11 | P2: Projeto de vídeo | Pending | Verified |
| PROJ-12 | P2: Projeto de vídeo | Pending | Pending |
| RATE-01 | P3: Resiliência | Pending | Pending |
| PART-01 | P3: Resiliência | Pending | Pending |
| PART-02 | P3: Resiliência | Pending | Pending |
| EDGE-01 | P1: Conexão + estrutura de cliente | Pending | Pending |
| EDGE-02 | P1: Conexão + estrutura de cliente | Pending | Pending |
| EDGE-03 | P2: Projeto de vídeo | Pending | Pending |
| EDGE-04 | P1: Conexão + estrutura de cliente | Pending | Pending |
| EDGE-05 | P1: Conexão + estrutura de cliente | Pending | Pending |
| EDGE-06 | P1: Conexão + estrutura de cliente | Pending | Verified |

**ID format:** `MENU-NN`, `AUTH-NN`, `STRU-NN`, `RETY-NN`, `FAIL-NN`, `PROJ-NN`, `RATE-NN`, `PART-NN`, `EDGE-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 42 total, 0 mapped to tasks, 42 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] A manager connects Frame.io once and the connection still works after the access token's 1-hour expiry.
- [ ] Creating a client's structure takes one click and a second click on the same client creates zero new folders.
- [ ] A video project produces the exact name `2026-11-05_Quinta-Video-Lancamento` plus `2026-11-Novembro` plus three material folders.
- [ ] Every Frame.io failure the user can hit ends in a readable message with a working `Tentar novamente`, and never in a success toast.
- [ ] `client_secret` appears nowhere in the built bundle.
