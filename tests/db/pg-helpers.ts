import { expect } from 'vitest';
import type { Client } from 'pg';

/**
 * Asserts the exact SQL error a statement produced. The SQLSTATE is
 * locale-independent - this server words its messages in pt_BR - and the
 * constraint name appears verbatim inside the message in either language.
 */
export async function expectFailure(
  client: Client,
  sql: string,
  params: unknown[],
  expected: { code: string; constraint?: string; messageIncludes?: string }
): Promise<void> {
  try {
    await client.query(sql, params);
    throw new Error(`statement was expected to fail with SQLSTATE ${expected.code} but succeeded`);
  } catch (error) {
    const failure = error as Error & { code?: string; constraint?: string | null };
    expect(failure.code).toBe(expected.code);
    if (expected.constraint !== undefined) {
      expect(failure.constraint).toBe(expected.constraint);
      expect(failure.message).toContain(expected.constraint);
    }
    if (expected.messageIncludes !== undefined) {
      expect(failure.message).toContain(expected.messageIncludes);
    }
  }
}
