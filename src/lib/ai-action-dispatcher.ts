/**
 * AI Action Dispatcher
 * Central system that parses action tokens from AI responses and routes them
 * to registered module handlers.
 *
 * HOW TO ADD A NEW MODULE:
 * 1. Define token patterns in TOKEN_PATTERNS below
 * 2. Register a handler with registerHandler()
 * 3. Add the token syntax to the AI system prompt (Edge Function)
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// Types
// =====================================================

export type ActionMode = 'auto' | 'confirm';

export interface ActionToken {
  /** Full raw match string */
  raw: string;
  /** Action type identifier (e.g. CREATE_PROSPECT) */
  type: string;
  /** Parsed parameters from the token */
  params: Record<string, string>;
}

export interface PendingConfirmAction {
  type: string;
  id: string;
  name: string;
  raw: string;
  /** Extra params for handlers that need them (e.g. update fields) */
  extra?: Record<string, string>;
}

export interface DispatchResult {
  /** Auto-executed actions (no confirmation needed) */
  executed: { type: string; label: string }[];
  /** Actions pending user confirmation */
  pending: PendingConfirmAction | null;
  /** Any execution errors */
  errors: string[];
}

type AutoHandler = (params: Record<string, string>) => Promise<{ label: string }>;
type ConfirmHandler = (id: string, params: Record<string, string>) => Promise<void>;

interface HandlerEntry {
  mode: ActionMode;
  handler: AutoHandler | ConfirmHandler;
}

// =====================================================
// UUID Validation
// =====================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

// =====================================================
// Token Parser
// =====================================================

/**
 * Parse key="value" or key=value pairs from a token body string
 */
export function parseTokenParams(body: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match key="value" (with quotes)
  const quotedRegex = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = quotedRegex.exec(body)) !== null) {
    result[m[1]] = m[2];
  }
  // Match key=value (without quotes, no spaces)
  const unquotedRegex = /(\w+)=([^\s,\]]+)/g;
  while ((m = unquotedRegex.exec(body)) !== null) {
    if (!(m[1] in result)) {
      result[m[1]] = m[2];
    }
  }
  return result;
}

/**
 * Extract all action tokens from an AI response string.
 * Tokens must match the pattern: [TOKEN_TYPE: ...params...]
 */
export function extractTokens(content: string): ActionToken[] {
  const tokens: ActionToken[] = [];
  // Match [WORD_WORD: body]
  const tokenRegex = /\[([A-Z_]+):\s*([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(content)) !== null) {
    tokens.push({
      raw: m[0],
      type: m[1],
      params: parseTokenParams(m[2]),
    });
  }
  return tokens;
}

// =====================================================
// Handler Registry
// =====================================================

const registry = new Map<string, HandlerEntry>();

/**
 * Register a handler for an action token type.
 * @param tokenType  - e.g. "CREATE_PROSPECT"
 * @param mode       - "auto" (execute immediately) | "confirm" (ask user first)
 * @param handler    - function to execute the action
 */
export function registerHandler(
  tokenType: string,
  mode: ActionMode,
  handler: AutoHandler | ConfirmHandler
) {
  registry.set(tokenType.toUpperCase(), { mode, handler });
}

// =====================================================
// Dispatcher
// =====================================================

/**
 * Process an AI response and dispatch all found action tokens.
 * Returns executed actions and any action requiring user confirmation.
 */
export async function dispatchActions(content: string): Promise<DispatchResult> {
  const tokens = extractTokens(content);
  const result: DispatchResult = { executed: [], pending: null, errors: [] };

  for (const token of tokens) {
    const entry = registry.get(token.type);
    if (!entry) continue;

    if (entry.mode === 'auto') {
      try {
        const { label } = await (entry.handler as AutoHandler)(token.params);
        result.executed.push({ type: token.type, label });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${token.type}: ${msg}`);
      }
    } else {
      // For confirm mode, take only the FIRST pending action
      // (multiple destructive actions in one response are rare and risky)
      if (!result.pending) {
        const id = token.params.id ?? '';
        const name = token.params.name ?? token.params.title ?? token.params.descricao ?? id;
        result.pending = {
          type: token.type,
          id,
          name,
          raw: token.raw,
          extra: token.params,
        };
      }
    }
  }

  return result;
}

/**
 * Strip ALL action tokens from visible chat content.
 * Tokens are in the format [TOKEN_NAME: ...] or [TOKEN_NAME:...].
 * This should be applied to any AI response before rendering it to the user.
 */
export function stripActionTokens(content: string): string {
  // Remove all [UPPERCASE_TOKEN: ...] patterns (single-line)
  return content
    .replace(/\[[A-Z][A-Z_]+:[^\]]*\]/g, '')
    // Remove leftover blank lines caused by token removal
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function executeConfirmedAction(action: PendingConfirmAction): Promise<void> {
  const entry = registry.get(action.type.toUpperCase());
  if (!entry || entry.mode !== 'confirm') {
    throw new Error(`Handler not found or not confirmable: ${action.type}`);
  }
  await (entry.handler as ConfirmHandler)(action.id, action.extra ?? {});
}
