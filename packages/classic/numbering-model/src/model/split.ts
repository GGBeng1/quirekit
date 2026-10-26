import { resolveWordParagraphNumbering } from "./validation";
import type { WordParagraphNumbering } from "../types";

/**
 * Keeps sequence identity while initializing the new paragraph's occurrence state.
 *
 * @param value - Numbering reference on the paragraph being split.
 * @returns Continued reference with a fresh task state, or no numbering.
 */
export function splitWordParagraphNumbering(value: unknown): WordParagraphNumbering | null {
  const reference = resolveWordParagraphNumbering(value);
  return reference === null ? null : {
    ...reference,
    startOverride: null,
    task: reference.task === null ? null : { checked: false }
  };
}
