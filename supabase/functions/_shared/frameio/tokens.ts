// Predicados puros sobre o ciclo de vida do access token (AD-003).
//
// Cobre AUTH-08 (renovar antes de vencer), AUTH-09 (recusa do refresh ⇒
// reconectar) e EDGE-05 (workspace sumiu da conta ⇒ reconectar, em vez de um
// sucesso vazio).

export type TokenErrorKind = 'reconnect' | 'retryable' | 'fatal';

/** AUTH-08: renova com 5 minutos de antecedência, não no minuto exato. */
const DEFAULT_SKEW_MS = 5 * 60_000;

/**
 * `now` é obrigatório na prática dos testes: sem ele a asserção dependeria do
 * relógio de parede e de qualquer coisa passaria.
 */
export function needsRefresh(
  expiresAt: Date,
  skewMs: number = DEFAULT_SKEW_MS,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() - now.getTime() <= skewMs;
}

/**
 * - `invalid_grant` / 401 → o refresh foi recusado ou o token não é mais aceito:
 *   a conexão precisa de um novo login (AUTH-09, EDGE-05).
 * - 429, 5xx ou rede → pode voltar sozinho; quem repetir é o runner.
 * - o resto (400 por nome inválido, 403 sem permissão, 404) é definitivo.
 */
export function classifyTokenError(status: number, body: unknown): TokenErrorKind {
  const code =
    body && typeof body === 'object' && 'error' in body
      ? (body as { error?: unknown }).error
      : undefined;

  if (code === 'invalid_grant') return 'reconnect';
  if (status === 401) return 'reconnect';
  if (status === 0 || status === 429 || status >= 500) return 'retryable';
  return 'fatal';
}

/**
 * EDGE-05: a conta Adobe ainda devolve o workspace gravado na conexão? Se não,
 * a conexão está morta e a UI mostra `Reconectar Frame.io` em vez de reportar
 * sucesso sem nenhuma pasta.
 */
export function workspaceStillPresent(
  available: { id: string }[],
  storedId: string,
): boolean {
  return available.some((workspace) => workspace.id === storedId);
}
