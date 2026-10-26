import { Fragment, type Node as ProseMirrorNode, type NodeType } from "@quirekit/pm";
import { resolveWordParagraphFormatting } from "../../model";

/** Ordered replacement blocks plus the continuation selection target. */
export interface BlankPageReplacement {
  /** Complete source-block replacement. */
  readonly blocks: readonly ProseMirrorNode[];
  /** Index of the post-blank continuation block. */
  readonly rightIndex: number;
}

/**
 * Builds the minimal left/blank/right block sequence for one caret offset.
 *
 * @param source - Current paragraph-like source node.
 * @param offset - Caret offset inside source content.
 * @param blank - Empty body paragraph starting the blank page.
 * @param bodyType - Canonical body paragraph type.
 * @returns Replacement sequence, or undefined if a node cannot be created.
 */
export function createBlankPageBlocks(
  source: ProseMirrorNode,
  offset: number,
  blank: ProseMirrorNode,
  bodyType: NodeType
): BlankPageReplacement | undefined {
  if (offset === 0) {
    const right = createPageBoundaryNode(source, source.content);
    return right ? { blocks: [blank, right], rightIndex: 1 } : undefined;
  }
  const left = source.type.create(
    source.attrs,
    source.content.cut(0, offset),
    source.marks
  );
  if (offset === source.content.size) {
    const right = createEmptyPageBoundary(bodyType, source);
    return right ? { blocks: [left, blank, right], rightIndex: 2 } : undefined;
  }
  const right = createPageBoundaryNode(source, source.content.cut(offset));
  return right ? { blocks: [left, blank, right], rightIndex: 2 } : undefined;
}

/**
 * Creates one empty body paragraph that begins on a new page.
 *
 * @param type - Canonical body paragraph type.
 * @param source - Source textblock used when the type has required attrs.
 * @returns Filled empty page-boundary node, or null when schema creation fails.
 */
export function createEmptyPageBoundary(
  type: NodeType,
  source: ProseMirrorNode
): ProseMirrorNode | null {
  const inheritedAttrs = type === source.type ? source.attrs : {};
  return type.createAndFill({
    ...inheritedAttrs,
    wordParagraph: createPageBoundaryFormatting(null)
  });
}

/**
 * Resolves the configured body paragraph type without depending on StarterKit.
 *
 * @param nodes - Schema node registry.
 * @param allowedNodeNames - Configured Word paragraph-like node names.
 * @param fallback - Current source node type.
 * @returns Paragraph type when installed and configured, otherwise the source type.
 */
export function resolveBodyParagraphType(
  nodes: Readonly<Record<string, NodeType>>,
  allowedNodeNames: ReadonlySet<string>,
  fallback: NodeType
): NodeType {
  const paragraph = nodes.paragraph;
  return paragraph && allowedNodeNames.has(paragraph.name) ? paragraph : fallback;
}

/**
 * Creates one source-type continuation that begins on a new page.
 *
 * @param source - Source paragraph-like node.
 * @param content - Content retained by the continuation.
 * @returns Schema-valid continuation node, or null.
 */
function createPageBoundaryNode(
  source: ProseMirrorNode,
  content: Fragment
): ProseMirrorNode | null {
  return source.type.createAndFill(
    {
      ...source.attrs,
      wordParagraph: createPageBoundaryFormatting(source.attrs.wordParagraph)
    },
    content,
    source.marks
  );
}

/**
 * Creates canonical paragraph formatting with page-break-before enabled.
 *
 * @param value - Existing formatting source, or null for a blank body paragraph.
 * @returns Complete formatting with only the page-boundary field patched.
 */
function createPageBoundaryFormatting(value: unknown) {
  const formatting = resolveWordParagraphFormatting(value);
  return {
    ...formatting,
    pagination: {
      ...formatting.pagination,
      pageBreakBefore: true
    }
  };
}
