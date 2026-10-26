import type { WordParagraphCompatibility } from "./types";

/** @param value - Untrusted attrs or typed LitAST settings. @returns Valid paragraph decisions. */
export function normalizeWordParagraphCompatibility(value: unknown): WordParagraphCompatibility {
  if (value === null || typeof value !== "object") return {};
  const flag = (value as Record<string, unknown>).doNotExpandShiftReturn;
  return typeof flag === "boolean" ? { doNotExpandShiftReturn: flag } : {};
}

/** @param value - Document paragraph compatibility attrs. @returns Neutral soft-break layout policy. */
export function resolveWordParagraphJustifySoftBreaks(value: unknown): boolean {
  return normalizeWordParagraphCompatibility(value).doNotExpandShiftReturn !== true;
}
