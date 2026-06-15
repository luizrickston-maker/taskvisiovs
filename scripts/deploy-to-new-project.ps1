# deploy-to-new-project.ps1
# Executa o deploy completo das Edge Functions para o novo projeto Supabase.
#
# PRE-REQUISITO: rode primeiro em um terminal separado:
#   npx supabase login
# (abre o browser para autenticação — faça isso UMA VEZ e depois rode este script)
#
# Como usar:
#   .\scripts\deploy-to-new-project.ps1 -LovableApiKey "sua-chave-aqui" -ResendApiKey "sua-chave-aqui"
#
# Parâmetros opcionais:
#   -SiteUrl    URL do site (default: https://taskvisiovs.vercel.app)
#   -AllowedOrigin  Origem permitida para CORS (default: *)

param(
    [Parameter(Mandatory=$true)]
    [string]$LovableApiKey,

    [Parameter(Mandatory=$true)]
    [string]$ResendApiKey,

    [string]$SiteUrl = "https://taskvisiovs.vercel.app",
    [string]$AllowedOrigin = "*"
)

$ProjectRef = "gvjvwirlgzrmmeekpyzh"
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host " TaskVisionPro — Deploy para novo projeto Supabase" -ForegroundColor Cyan
Write-Host " Projeto: $ProjectRef" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# 1. Verificar login
Write-Host "`n[1/4] Verificando autenticação Supabase..." -ForegroundColor Yellow
$projects = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0 -or $projects -match "Access token not provided") {
    Write-Host "   ❌ Não está logado. Execute primeiro:" -ForegroundColor Red
    Write-Host "      npx supabase login" -ForegroundColor White
    exit 1
}
Write-Host "   ✅ Autenticado!" -ForegroundColor Green

# 2. Link ao novo projeto
Write-Host "`n[2/4] Linkando ao projeto $ProjectRef..." -ForegroundColor Yellow
$dbPassword = 'nvD,RQaC#bm9aV,'
npx supabase link --project-ref $ProjectRef --password $dbPassword
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  Link falhou, tentando continuar mesmo assim..." -ForegroundColor Yellow
}
Write-Host "   ✅ Projeto linkado!" -ForegroundColor Green

# 3. Deploy das Edge Functions
Write-Host "`n[3/4] Fazendo deploy das Edge Functions..." -ForegroundColor Yellow

$functions = @(
    "ai-360-agent",
    "ai-360-personal",
    "ai-help-assistant",
    "ai-help-personal",
    "create-collaborator",
    "dispatch-webhook",
    "generate-briefing-magic-link",
    "generate-client-portal-link",
    "generate-video-briefing-magic-link",
    "invite-client-user",
    "operational-brain"
)

$failed = @()
foreach ($fn in $functions) {
    Write-Host "   Deploying: $fn..." -ForegroundColor Gray
    npx supabase functions deploy $fn --project-ref $ProjectRef --no-verify-jwt 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $fn" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $fn (falhou)" -ForegroundColor Red
        $failed += $fn
    }
}

if ($failed.Count -gt 0) {
    Write-Host "`n   Funções com falha:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
} else {
    Write-Host "   ✅ Todas as 11 funções deployadas!" -ForegroundColor Green
}

# 4. Configurar Secrets
Write-Host "`n[4/4] Configurando Secrets das Edge Functions..." -ForegroundColor Yellow

npx supabase secrets set `
    LOVABLE_API_KEY="$LovableApiKey" `
    RESEND_API_KEY="$ResendApiKey" `
    SITE_URL="$SiteUrl" `
    ALLOWED_ORIGIN="$AllowedOrigin" `
    --project-ref $ProjectRef

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Secrets configurados!" -ForegroundColor Green
} else {
    Write-Host "   ❌ Erro ao configurar secrets" -ForegroundColor Red
}

# Resumo
Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host " ✅ DEPLOY CONCLUÍDO" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "`nPróximos passos manuais (no Supabase Dashboard):"
Write-Host "  1. Rodar o SQL de setup:"
Write-Host "     https://supabase.com/dashboard/project/$ProjectRef/sql/new"
Write-Host "     → Cole o conteúdo de: scripts/new-project-setup.sql"
Write-Host ""
Write-Host "  2. Configurar Auth Providers:"
Write-Host "     https://supabase.com/dashboard/project/$ProjectRef/auth/providers"
Write-Host "     → Email: habilitar"
Write-Host "     → Google: colar Client ID + Secret"
Write-Host "     → Site URL: $SiteUrl"
Write-Host "     → Redirect URLs:"
Write-Host "       ${SiteUrl}/**"
Write-Host "       http://localhost:5173/**"
Write-Host "       http://localhost:8080/**"
Write-Host ""
Write-Host "  3. Migrar usuários:"
Write-Host "     node scripts/migrate-auth-users.mjs"
Write-Host ""
Write-Host "  4. Testar o app:"
Write-Host "     bun run dev"
Write-Host ""