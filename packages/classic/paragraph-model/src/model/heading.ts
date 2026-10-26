import type { WordParagraphFormatting } from "../types";

/** Word outline level exposed to users as heading levels one through nine. */
export type WordHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Canvas font scale associated with each built-in Word heading level. */
export const wordHeadingCanvasFontScales:
Readonly<Record<WordHeadingLevel, number>> = Object.freeze({
  1: 2,
  2: 1.5,
  3: 1.25,
  4: 1.1,
  5: 1,
  6: 0.85,
  7: 0.85,
  8: 0.85,
  9: 0.85
});

/**
 * Resolves the effective heading level carried by Word paragraph formatting.
 *
 * Direct outline level is used when present. Otherwise the resolver recognizes
 * built-in English and Chinese heading style identifiers without treating
 * arbitrary custom paragraph styles as headings.
 *
 * @param formatting - Canonical Word paragraph formatting.
 * @returns Effective heading level from one through nine, or null.
 */
export function resolveWordHeadingLevel(
  formatting: WordParagraphFormatting
): WordHeadingLevel | null {
  if (formatting.outlineLevel !== null) {
    return formatting.outlineLevel === 9 ? null : (formatting.outlineLevel + 1) as WordHeadingLevel;
  }
  if (formatting.styleId === null) return null;
  const match = /^(?:Heading|标题)\s*([1-9])$/iu.exec(formatting.styleId);
  if (match?.[1] === undefined) return null;
  return Number(match[1]) as WordHeadingLevel;
}

/**
 * Resolves only an explicitly selected built-in heading style.
 *
 * Outline level is deliberately excluded: it controls navigation and TOC
 * participation but does not assign a built-in heading's visual preset.
 *
 * @param formatting - Canonical Word paragraph formatting.
 * @returns Built-in heading style level, or null for body/custom styles.
 */
export function resolveWordHeadingStyleLevel(
  formatting: WordParagraphFormatting
): WordHeadingLevel | null {
  if (formatting.styleId === null) return null;
  const match = /^(?:Heading|标题)\s*([1-9])$/iu.exec(formatting.styleId);
  return match?.[1] === undefined
    ? null
    : Number(match[1]) as WordHeadingLevel;
}

/**
 * Returns the built-in Word paragraph style identifier for a heading level.
 *
 * @param level - Heading level from one through nine.
 * @returns Stable built-in paragraph style identifier.
 */
export function defaultWordHeadingStyleId(level: WordHeadingLevel): string {
  return `Heading${level}`;
}
