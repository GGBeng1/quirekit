import type { PendingActivityEvent } from "../protocol/types";
import type { ConformanceEnvironment } from "./types";

/** Controlled clock and permissive access, with helpers to advance time. */
export function environment(start = Date.parse("2026-10-15T08:00:00.000Z")): ConformanceEnvironment & { advance(ms: number): void; denied: Set<string> } {
  let time = start;
  const denied = new Set<string>();
  return { now: () => new Date(time), advance(ms) { time += ms; }, denied,
    canView: (viewer, event) => !(viewer && denied.has(`${viewer}:${event.actor.id}`)) };
}

/**
 * @param operationId - Idempotency key.
 * @param fields - Overrides.
 * @returns A valid pending event.
 */
export function pending(operationId: string, fields: Partial<PendingActivityEvent> = {}): PendingActivityEvent {
  return { documentId: "doc-1", epoch: "e1", operationId, actor: { id: "alice", name: "Alice", trust: "verified" }, source: "human",
    kind: "text.edit", kindVersion: 1, facts: { inserted: 1 }, content: { format: "markdown", before: "a", after: "ab", truncated: false }, ...fields };
}

/** @param condition - Expected truth. @param message - Violation description. */
export function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`conformance: ${message}`);
}

/** @param action - Operation expected to fail. @param message - Violation description. */
export async function rejects(action: () => Promise<unknown>, message: string): Promise<void> {
  try { await action(); } catch { return; }
  throw new Error(`conformance: ${message}`);
}
