import type { LitAstMark } from "@quirekit/lit-docx-contract";

/** @param value - Unknown preservation entry. @returns Whether it has a LitAST mark identity. */
export function isMark(value: unknown): value is LitAstMark {
  return isRecord(value) && typeof value.type === "string";
}

/** @param value - Untrusted JSON value. @returns Whether it is a non-array record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** @param value - Candidate direct property. @returns Nonempty text or the inherited state. */
export function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** @param value - Candidate direct emphasis. @returns Nullable boolean, preserving explicit false. */
export function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

/** @param value - Candidate point-size token. @returns Positive point size or the unowned state. */
export function readPointSize(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const match = /^(\d+(?:\.\d+)?)pt$/u.exec(value.trim());
  return match === null ? null : Number(match[1]);
}
