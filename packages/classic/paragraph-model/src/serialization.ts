import type {
  QuireNodeHTMLSerializationTransformMap,
  QuireNodeMarkdownSerializationTransformMap
} from "@quirekit/core";
import type { DOMOutputSpec } from "@quirekit/pm";
import {
  resolveWordHeadingLevel,
  resolveWordParagraphFormatting
} from "./model";

/**
 * Creates semantic HTML projections for Word-formatted paragraph-like nodes.
 *
 * @param types - Node type names carrying canonical Word paragraph formatting.
 * @returns HTML transforms keyed by configured node type.
 */
export function createWordParagraphHTMLSerializationTransforms(
  types: readonly string[]
): QuireNodeHTMLSerializationTransformMap {
  return Object.fromEntries(
    types.map((type) => [
      type,
      (node, output) => {
        const level = resolveExternalHeadingLevel(
          node.attrs.wordParagraph
        );

        if (level === null || !Array.isArray(output)) {
          return output;
        }

        return [`h${level}`, ...output.slice(1)] as DOMOutputSpec;
      }
    ])
  );
}

/**
 * Creates semantic Markdown projections for Word-formatted paragraph-like nodes.
 *
 * @param types - Node type names carrying canonical Word paragraph formatting.
 * @returns Markdown transforms keyed by configured node type.
 */
export function createWordParagraphMarkdownSerializationTransforms(
  types: readonly string[]
): QuireNodeMarkdownSerializationTransformMap {
  return Object.fromEntries(
    types.map((type) => [
      type,
      (node, output) => {
        const level = resolveExternalHeadingLevel(
          node.attrs?.wordParagraph
        );

        if (level === null) {
          return output;
        }

        const content = output.replace(/^#{1,6}\s+/u, "");

        return `${"#".repeat(level)} ${content}`;
      }
    ])
  );
}

/**
 * Resolves the heading level supported by semantic HTML and CommonMark.
 *
 * Word supports nine outline levels while both target formats expose six
 * heading tags or markers, so deeper levels intentionally degrade to level six.
 *
 * @param value - Canonical Word paragraph formatting attribute.
 * @returns External heading level from one through six, or null for body text.
 */
function resolveExternalHeadingLevel(value: unknown): number | null {
  const level = resolveWordHeadingLevel(
    resolveWordParagraphFormatting(value)
  );

  return level === null ? null : Math.min(level, 6);
}
