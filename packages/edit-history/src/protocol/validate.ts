import type { PendingActivityEvent } from "./types";

const kindPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/u;
const sources = new Set(["human", "ai", "import", "system"]);

/** @param value - Candidate. @returns Whether it is a non-empty string. */
function text(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
/** @param value - Candidate. @returns Whether it is a plain JSON object. */
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
/** @param value - Candidate. @returns Whether it is absent or a string. */
function optionalText(value: unknown): boolean { return value === undefined || typeof value === "string"; }

/**
 * Checks a writer-supplied event before a store confirms it.
 * @param value - Untrusted input.
 * @returns Problems found; empty when the event is valid.
 */
export function validatePendingEvent(value: unknown): readonly string[] {
  if (!record(value)) return ["event must be an object"];
  const problems: string[] = [];
  for (const field of ["documentId", "epoch", "operationId"] as const) if (!text(value[field])) problems.push(`${field} must be a non-empty string`);
  const actor = value.actor;
  if (!record(actor) || !text(actor.id) || (actor.trust !== "verified" && actor.trust !== "local")
    || !optionalText(actor.name) || !optionalText(actor.avatar)) problems.push("actor must have an id and a trust of verified or local");
  if (!sources.has(value.source as string)) problems.push("source must be human, ai, import or system");
  if (typeof value.kind !== "string" || !kindPattern.test(value.kind)) problems.push("kind must be dot-separated lowercase names");
  if (!Number.isInteger(value.kindVersion) || (value.kindVersion as number) < 1) problems.push("kindVersion must be a positive integer");
  if (!record(value.facts)) problems.push("facts must be an object");
  if (!optionalText(value.occurredAt) || (value.occurredAt !== undefined && Number.isNaN(Date.parse(value.occurredAt as string)))) problems.push("occurredAt must be an ISO time");
  if (!optionalText(value.sessionId)) problems.push("sessionId must be a string");
  if (value.related !== undefined && (!record(value.related) || !optionalText(value.related.undoes) || !optionalText(value.related.parent))) problems.push("related must reference operation ids");
  if (value.target !== undefined && (!record(value.target) || !text(value.target.scheme) || !optionalText(value.target.quote))) problems.push("target must have a scheme");
  const content = value.content;
  if (content !== undefined && (!record(content) || !text(content.format) || !optionalText(content.before)
    || !optionalText(content.after) || typeof content.truncated !== "boolean")) problems.push("content must have a format, optional before/after text and truncated");
  return problems;
}

/** @param value - Untrusted input. @returns The value typed as a pending event. @throws When it is invalid. */
export function assertPendingEvent(value: unknown): PendingActivityEvent {
  const problems = validatePendingEvent(value);
  if (problems.length) throw new TypeError(`invalid activity event: ${problems.join("; ")}`);
  return value as PendingActivityEvent;
}
