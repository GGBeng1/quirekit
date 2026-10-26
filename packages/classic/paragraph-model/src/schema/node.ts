import { Paragraph } from "@quirekit/extension-paragraph";
import { defaultWordHeadingStyleId, resolveWordParagraphFormatting } from "../model";
import type { WordHeadingLevel } from "../model";

/**
 * Word's canonical paragraph node, including external semantic heading parsing.
 * Install instead of the generic Paragraph and Heading nodes, together with
 * WordParagraph formatting. Its schema name remains `paragraph`.
 */
export const WordParagraphNode = Paragraph.extend({
  /** @returns Body and semantic heading tags sharing one paragraph schema. */
  parseHTML() {
    return [
      { tag: "p" },
      ...[1, 2, 3, 4, 5, 6].map(level => ({
        tag: `h${level}`, attrs: headingAttributes(level)
      }))
    ];
  },

  markdownTokenName: "heading",

  /** @param token - Semantic Markdown heading. @param helpers - Inline parser. @returns Styled paragraph JSON. */
  parseMarkdown(token, helpers) {
    return helpers.createNode(
      "paragraph", headingAttributes(Number(token.depth)),
      helpers.parseInline([...(token.tokens ?? [])])
    );
  }
});

/**
 * Maps external six-level heading semantics to existing Word named styles.
 * @param level - HTML/Markdown heading level.
 * @returns Paragraph attributes with inherited outline semantics.
 */
function headingAttributes(level: number) {
  const normalized = (Number.isInteger(level) && level >= 1 && level <= 6 ? level : 1) as WordHeadingLevel;
  return { wordParagraph: resolveWordParagraphFormatting({ styleId: defaultWordHeadingStyleId(normalized) }) };
}
