import {
  defaultWordStyleSelectorHeadingLevels
} from "./defaults";
import type {
  WordParagraphStyleRegistry,
  WordParagraphStyleSelectorItem
} from "./types";

/**
 * Builds the standard compact authoring style inventory.
 *
 * Normal, Title, Subtitle, and Heading 1–6 are exposed by default. Heading 7–9
 * and custom/imported styles remain available to advanced style-management UI.
 *
 * @param registry - Valid document paragraph style registry.
 * @returns Product-neutral compact selector entries in stable gallery order.
 */
export function createWordParagraphStyleSelectorItems(
  registry: WordParagraphStyleRegistry
): readonly WordParagraphStyleSelectorItem[] {
  const headingLevels = new Set<number>(defaultWordStyleSelectorHeadingLevels);
  return Object.values(registry.styles)
    .filter((style) => {
      if (style.hidden || style.semiHidden || !style.quickFormat) return false;
      if (style.role === "heading") {
        return style.headingLevel !== null
          && headingLevels.has(style.headingLevel);
      }
      return style.role === "body"
        || style.role === "title"
        || style.role === "subtitle";
    })
    .map((style) => ({
      styleId: style.id,
      name: style.name,
      role: style.role as WordParagraphStyleSelectorItem["role"],
      headingLevel: style.headingLevel,
      uiPriority: style.uiPriority ?? Number.MAX_SAFE_INTEGER
    }))
    .sort((left, right) =>
      left.uiPriority - right.uiPriority
      || left.name.localeCompare(right.name)
    );
}
