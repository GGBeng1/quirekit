import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import {
  resolveWordNamedParagraphStyle,
  type WordParagraphStyleRegistry
} from "@quirekit/classic-styles-model";
import {
  isWordParagraphNumberingSuppressed,
  resolveWordParagraphNumbering
} from "../model";
import type { ResolvedWordEffectiveParagraphNumbering } from "../types";

/**
 * Resolves the numbering that applies to one paragraph.
 *
 * Direct numbering wins; a direct `"none"` removes style numbering; otherwise the
 * named style chain supplies the reference with level zero as the final default.
 *
 * @param paragraph - Paragraph-like node carrying `wordNumbering` and `wordParagraph`.
 * @param styleRegistry - Valid document named paragraph style registry.
 * @returns Effective numbering with its source, or null when the paragraph is unnumbered.
 */
export function resolveWordEffectiveParagraphNumbering(
  paragraph: ProseMirrorNode,
  styleRegistry: WordParagraphStyleRegistry
): ResolvedWordEffectiveParagraphNumbering | null {
  const direct = resolveWordParagraphNumbering(paragraph.attrs.wordNumbering);
  if (direct !== null) return { numbering: direct, source: "direct", sourceStyleId: null };
  if (isWordParagraphNumberingSuppressed(paragraph.attrs.wordNumbering)) return null;
  if (paragraph.attrs.wordParagraph === undefined) return null;
  const styleId = resolveWordParagraphFormatting(paragraph.attrs.wordParagraph).styleId;
  const styled = resolveWordNamedParagraphStyle(styleRegistry, styleId).numbering;
  return styled === null
    ? null
    : {
      numbering: { numId: styled.numId, level: styled.level, startOverride: null, task: null },
      source: "style",
      sourceStyleId: styled.sourceStyleId
    };
}
