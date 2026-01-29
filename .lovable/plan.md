

## Plano: Integracao Completa Google Drive BYOD (Bring Your Own Drive)

### Visao Geral

Implementar um sistema onde cada usuario conecta seu proprio Google Drive usando OAuth 2.0 com escopo minimo `drive.file`, permitindo listar, visualizar, fazer upload, renomear e deletar arquivos apenas nas pastas selecionadas pelo usuario.

---

### Pre-requisitos de Configuracao (Voce Precisara Fazer)

#### 1. Criar Projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com
2. Crie um novo projeto ou selecione existente
3. Ative as APIs:
   - **Google Drive API**
   - **Google Picker API**

#### 2. Configurar Tela de Consentimento OAuth

1. Va em "APIs e Servicos" > "Tela de consentimento OAuth"
2. Tipo de usuario: **Externo**
3. Preencha nome do app, email de suporte
4. Escopos: adicione `https://www.googleapis.com/auth/drive.file`
5. Adicione usuarios de teste (enquanto em modo de teste)

#### 3. Criar Credenciais OAuth 2.0

1. Va em "Credenciais" > "Criar credenciais" > "ID do cliente OAuth"
2. Tipo: **Aplicativo da Web**
3. Origens JavaScript autorizadas:
   - `https://id-preview--e5fd2f0c-7bdc-421a-be6e-f85fbf3ede60.lovable.app`
   - `https://taskvisionpro.lovable.app`
4. URIs de redirecionamento autorizados:
   - `https://kxuwzhnkragzsqafszpo.supabase.co/functions/v1/google-oauth-callback`
5. Copie o **Client ID** e **Client Secret**

#### 4. Criar Chave de API

1. "Criar credenciais" > "Chave de API"
2. Restrinja a chave para Google Picker API
3. Copie a **API Key**

---

### Secrets Necessarios

Serao solicitados via ferramenta de secrets:

| Secret | Descricao |
|--------|-----------|
| `GOOGLE_CLIENT_ID` | Client ID do OAuth |
| `GOOGLE_CLIENT_SECRET` | Client Secret do OAuth |
| `GOOGLE_API_KEY` | Chave de API para Picker |
| `ENCRYPTION_KEY` | Chave AES-256 para criptografar tokens (32 bytes hex) |

---

### Alteracoes no Banco de Dados

#### Nova Tabela: `user_integrations`

```sql
CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google_drive',
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text NOT NULL,
  token_expiry timestamp with time zone NOT NULL,
  scope text NOT NULL,
  selected_folder_id text,
  selected_folder_name text,
  google_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(user_id, provider)
);

-- RLS Policies
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON user_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON user_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON user_integrations FOR DELETE
  USING (auth.uid() = user_id);
```

---

### Edge Functions (Backend)

#### 1. `google-oauth-start`

Inicia o fluxo OAuth gerando URL de autorizacao.

```text
POST /functions/v1/google-oauth-start
Response: { authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

- Gera `state` token com user_id criptografado
- Usa PKCE com `code_verifier` armazenado temporariamente
- Redireciona para Google com escopo `drive.file`

#### 2. `google-oauth-callback`

Recebe callback do Google apos autorizacao.

```text
GET /functions/v1/google-oauth-callback?code=...&state=...
Redirect: /config?drive=connected ou /config?drive=error
```

- Valida `state` e extrai user_id
- Troca `code` por tokens
- Criptografa e salva tokens na tabela
- Redireciona usuario de volta ao app

#### 3. `google-drive-list`

Lista arquivos de uma pasta.

```text
POST /functions/v1/google-drive-list
Body: { folderId?: string, pageToken?: string, searchQuery?: string }
Response: { files: [...], nextPageToken?: string }
```

- Renova token automaticamente se expirado
- Retorna metadata: id, name, mimeType, size, modifiedTime, thumbnailLink

#### 4. `google-drive-file`

Obtem detalhes de um arquivo.

```text
POST /functions/v1/google-drive-file
Body: { fileId: string, action: 'metadata' | 'download' | 'stream' }
Response: { file: {...}, downloadUrl?: string }
```

- Para imagens/PDFs: proxy do conteudo
- Para videos: streaming com Range headers

#### 5. `google-drive-upload`

Faz upload para pasta selecionada.

```text
POST /functions/v1/google-drive-upload
Body: FormData com file e folderId
Response: { file: { id, name, ... } }
```

- Suporta multipart upload
- Limite: 50MB por arquivo

#### 6. `google-drive-rename`

Renomeia arquivo ou pasta.

```text
POST /functions/v1/google-drive-rename
Body: { fileId: string, newName: string }
Response: { success: true, file: {...} }
```

#### 7. `google-drive-delete`

Deleta arquivo (move para lixeira).

```text
POST /functions/v1/google-drive-delete
Body: { fileId: string }
Response: { success: true }
```

#### 8. `google-drive-disconnect`

Desconecta integracao e revoga tokens.

```text
POST /functions/v1/google-drive-disconnect
Response: { success: true }
```

- Revoga tokens no Google
- Remove registro da tabela

---

### Arquitetura dos Componentes Frontend

```text
src/
  pages/
    IntegrationsPage.tsx         <- Nova pagina de integracoes
    DriveFilesPage.tsx           <- Navegador de arquivos
    
  components/
    integrations/
      GoogleDriveCard.tsx        <- Card de status/conexao
      GoogleDrivePicker.tsx      <- Wrapper do Google Picker
      
    drive/
      DriveFileList.tsx          <- Lista de arquivos
      DriveFileBreadcrumb.tsx    <- Navegacao de pastas
      DriveFileCard.tsx          <- Card de arquivo individual
      DriveFilePreview.tsx       <- Modal de preview
      DriveUploadButton.tsx      <- Upload com drag-and-drop
      DriveSearchFilter.tsx      <- Busca e filtros
      
  hooks/
    useGoogleDrive.ts            <- Hook principal para operacoes Drive
    useGoogleIntegration.ts      <- Hook para status da integracao
    
  types/
    google-drive.ts              <- Tipos TypeScript
```

---

### Novas Rotas

Adicionar em `App.tsx`:

```tsx
<Route path="/integracoes" element={<IntegrationsPage />} />
<Route path="/drive" element={<DriveFilesPage />} />
```

Adicionar no menu lateral (AppSidebar):

```tsx
{ title: 'Integracoes', url: '/integracoes', icon: Plug }
{ title: 'Meu Drive', url: '/drive', icon: CloudIcon }
```

---

### Fluxo do Usuario

```text
1. Usuario acessa /integracoes
            |
            v
2. Clica "Conectar Google Drive"
            |
            v
3. Edge Function gera URL OAuth
            |
            v
4. Usuario faz login Google e autoriza
            |
            v
5. Google redireciona para callback
            |
            v
6. Edge Function salva tokens criptografados
            |
            v
7. Usuario retorna ao app com status "Conectado"
            |
            v
8. Usuario clica "Selecionar Pasta"
            |
            v
9. Google Picker abre para escolher pasta
            |
            v
10. Pasta selecionada e salva no banco
            |
            v
11. Usuario acessa /drive e ve arquivos
```

---

### Detalhes de Seguranca

#### Criptografia de Tokens

```typescript
// Usando AES-256-GCM
function encrypt(text: string, key: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}
```

#### Validacoes

- Todos endpoints validam JWT do usuario
- Verificacao de propriedade do folderId via API do Google
- Rate limiting para prevenir abuso
- Tokens nunca expostos ao frontend

---

### Interface de Usuario

#### Tela de Integracoes

```text
+--------------------------------------------------+
|  Integracoes                                      |
+--------------------------------------------------+
|                                                   |
|  +---------------------------------------------+ |
|  |  [G] Google Drive                           | |
|  |                                              | |
|  |  Status: Conectado                          | |
|  |  Email: usuario@gmail.com                   | |
|  |  Pasta: /Projetos/Clientes                  | |
|  |                                              | |
|  |  [Trocar Pasta]  [Desconectar]              | |
|  +---------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

#### Tela Meus Arquivos

```text
+--------------------------------------------------+
|  Meu Drive > Projetos > Clientes                 |
+--------------------------------------------------+
|  [Buscar...]  [Filtro: Todos v]  [+ Upload]      |
+--------------------------------------------------+
|                                                   |
|  +----------+  +----------+  +----------+        |
|  |  [img]   |  |  [img]   |  |  [pdf]   |        |
|  | foto.jpg |  | video.mp4|  | doc.pdf  |        |
|  | 2.4 MB   |  | 156 MB   |  | 340 KB   |        |
|  +----------+  +----------+  +----------+        |
|                                                   |
|  +----------+  +----------+                       |
|  |  [pasta] |  |  [doc]   |                       |
|  | Backups  |  | notas.txt|                       |
|  | Pasta    |  | 12 KB    |                       |
|  +----------+  +----------+                       |
|                                                   |
+--------------------------------------------------+
```

#### Modal de Preview

```text
+--------------------------------------------------+
|  foto_cliente.jpg                        [X]     |
+--------------------------------------------------+
|                                                   |
|             +------------------+                  |
|             |                  |                  |
|             |    [Imagem]      |                  |
|             |                  |                  |
|             +------------------+                  |
|                                                   |
|  Nome: foto_cliente.jpg                          |
|  Tamanho: 2.4 MB                                 |
|  Modificado: 28/01/2026                          |
|                                                   |
|  [Baixar]  [Renomear]  [Deletar]                 |
+--------------------------------------------------+
```

---

### Tratamento de Erros

| Erro | Mensagem Amigavel |
|------|-------------------|
| Token expirado | "Sua sessao expirou. Reconectando..." (auto-refresh) |
| Permissao negada | "Voce nao tem permissao para acessar este arquivo" |
| Usuario cancelou | "Conexao cancelada. Tente novamente quando quiser." |
| Limite de taxa | "Muitas requisicoes. Aguarde alguns segundos." |
| Arquivo nao encontrado | "Este arquivo foi movido ou deletado" |
| Rede offline | "Sem conexao. Verifique sua internet." |

---

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela `user_integrations` |
| `supabase/functions/google-oauth-start/index.ts` | Criar |
| `supabase/functions/google-oauth-callback/index.ts` | Criar |
| `supabase/functions/google-drive-list/index.ts` | Criar |
| `supabase/functions/google-drive-file/index.ts` | Criar |
| `supabase/functions/google-drive-upload/index.ts` | Criar |
| `supabase/functions/google-drive-rename/index.ts` | Criar |
| `supabase/functions/google-drive-delete/index.ts` | Criar |
| `supabase/functions/google-drive-disconnect/index.ts` | Criar |
| `supabase/functions/_shared/google-auth.ts` | Criar (utilitarios compartilhados) |
| `supabase/functions/_shared/encryption.ts` | Criar (criptografia) |
| `supabase/config.toml` | Atualizar com novas functions |
| `src/pages/IntegrationsPage.tsx` | Criar |
| `src/pages/DriveFilesPage.tsx` | Criar |
| `src/components/integrations/GoogleDriveCard.tsx` | Criar |
| `src/components/integrations/GoogleDrivePicker.tsx` | Criar |
| `src/components/drive/DriveFileList.tsx` | Criar |
| `src/components/drive/DriveFileBreadcrumb.tsx` | Criar |
| `src/components/drive/DriveFileCard.tsx` | Criar |
| `src/components/drive/DriveFilePreview.tsx` | Criar |
| `src/components/drive/DriveUploadButton.tsx` | Criar |
| `src/components/drive/DriveSearchFilter.tsx` | Criar |
| `src/hooks/useGoogleDrive.ts` | Criar |
| `src/hooks/useGoogleIntegration.ts` | Criar |
| `src/types/google-drive.ts` | Criar |
| `src/App.tsx` | Adicionar rotas |
| `src/components/layout/AppSidebar.tsx` | Adicionar links menu |
| `src/types/database.ts` | Adicionar interface UserIntegration |
| `src/stores/useAppStore.ts` | Adicionar estado de integracao |

---

### Proximos Passos

1. Primeiro, voce precisara configurar as credenciais no Google Cloud Console
2. Depois, eu solicitarei os secrets necessarios (Client ID, Client Secret, API Key, Encryption Key)
3. Entao implementarei as Edge Functions
4. Por fim, criarei os componentes frontend

---

### Estimativa de Complexidade

- **Backend (Edge Functions)**: 8 funcoes
- **Frontend (Componentes)**: 10+ componentes
- **Banco de Dados**: 1 tabela nova
- **Configuracao Google**: ~30 minutos do seu lado

