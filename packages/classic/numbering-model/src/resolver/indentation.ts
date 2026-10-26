import {
  resolveWordParagraphFormatting,
  type WordParagraphIndentation
} from "@quirekit/classic-paragraph-model";
import {
  resolveWordNamedParagraphStyle,
  type WordParagraphStyleRegistry
} from "@quirekit/classic-styles-model";
import type { Node as ProseMirrorNode } from "@quirekit/pm";

/**
 * Resolves style, numbering-level, and direct paragraph indentation.
 *
 * Each field follows Word's compiled paragraph order: named style first,
 * numbering level second, and direct paragraph formatting last. When the
 * numbering is inherited from a style, the level applies at that style, so the
 * declaring style and its descendants still outrank the level. A null field
 * inherits while an explicit zero remains authoritative.
 *
 * @param levelIndentation - Indentation inherited from the numbering level.
 * @param paragraph - Paragraph-like node carrying direct `wordParagraph` attrs.
 * @param styleRegistry - Valid document named paragraph style registry.
 * @param sourceStyleId - Style that declared inherited numbering, or null for direct numbering.
 * @returns Complete effective indentation for layout and ruler projection.
 */
export function resolveEffectiveWordListIndentation(
  levelIndentation: WordParagraphIndentation,
  paragraph: ProseMirrorNode,
  styleRegistry: WordParagraphStyleRegistry,
  sourceStyleId: string | null = null
): WordParagraphIndentation {
  const directFormatting = resolveWordParagraphFormatting(
    paragraph.attrs.wordParagraph
  );
  const direct = directFormatting.indentation;
  const resolved = resolveWordNamedParagraphStyle(
    styleRegistry,
    directFormatting.styleId
  );
  const style = resolved.paragraph.indentation;
  const styleOverLevel = sourceStyleId === null
    ? { start: null, end: null, firstLine: null }
    : readStyleChainIndentation(styleRegistry, resolved.inheritanceChain, sourceStyleId);
  return {
    start: direct.start ?? styleOverLevel.start ?? levelIndentation.start ?? style.start,
    end: direct.end ?? styleOverLevel.end ?? levelIndentation.end ?? style.end,
    firstLine: direct.firstLine ?? styleOverLevel.firstLine ?? levelIndentation.firstLine ?? style.firstLine
  };
}

/**
 * Merges indentation declared from the numbering source style down to the leaf.
 *
 * @param styleRegistry - Valid document named paragraph style registry.
 * @param chain - Base-to-leaf style identifiers.
 * @param sourceStyleId - Style that declared the inherited numbering.
 * @returns Field-wise indentation where null means "not declared in this segment".
 */
function readStyleChainIndentation(
  styleRegistry: WordParagraphStyleRegistry,
  chain: readonly string[],
  sourceStyleId: string
): WordParagraphIndentation {
  let start: WordParagraphIndentation["start"] = null;
  let end: WordParagraphIndentation["end"] = null;
  let firstLine: WordParagraphIndentation["firstLine"] = null;
  for (const styleId of chain.slice(Math.max(0, chain.indexOf(sourceStyleId)))) {
    const indentation = styleRegistry.styles[styleId]?.paragraph.indentation;
    if (indentation === undefined) continue;
    start = indentation.start ?? start;
    end = indentation.end ?? end;
    firstLine = indentation.firstLine ?? firstLine;
  }
  return { start, end, firstLine };
}
