import { createDefaultWordParagraphStyleRegistry } from "./defaults";
import type { WordParagraphStyleRegistry } from "./types";
import { isWordParagraphStyleRegistry } from "./validation";

/**
 * Resolves persisted registry data or supplies clean built-in definitions.
 *
 * @param value - Candidate document `wordStyleRegistry` attribute.
 * @returns Valid registry safe for commands, layout, and product selectors.
 */
export function resolveWordParagraphStyleRegistry(
  value: unknown
): WordParagraphStyleRegistry {
  return isWordParagraphStyleRegistry(value)
    ? value
    : createDefaultWordParagraphStyleRegistry();
}
