import type { ActivityHint } from "./types";

const kindPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/u;

/** @param hint - Hint fields without the discriminator. @returns Wire payload for a text channel. */
export function encodeActivityHint(hint: Omit<ActivityHint, "type" | "version">): string {
  return JSON.stringify({ type: "quirekit.activity.hint", version: 1, ...hint });
}

/**
 * @param payload - Untrusted text from a shared channel.
 * @returns The hint, or null for other messages and malformed hints, which writers ignore.
 */
export function decodeActivityHint(payload: string): ActivityHint | null {
  let value: unknown;
  try { value = JSON.parse(payload); } catch { return null; }
  if (typeof value !== "object" || value === null) return null;
  const hint = value as Record<string, unknown>;
  if (hint.type !== "quirekit.activity.hint" || hint.version !== 1) return null;
  if (typeof hint.operationId !== "string" || !hint.operationId || hint.operationId.length > 200) return null;
  if (typeof hint.kind !== "string" || !kindPattern.test(hint.kind) || !Number.isInteger(hint.kindVersion) || (hint.kindVersion as number) < 1) return null;
  if (typeof hint.facts !== "object" || hint.facts === null || Array.isArray(hint.facts) || !Number.isInteger(hint.delta)) return null;
  if (hint.occurredAt !== undefined && (typeof hint.occurredAt !== "string" || Number.isNaN(Date.parse(hint.occurredAt)))) return null;
  return hint as unknown as ActivityHint;
}
