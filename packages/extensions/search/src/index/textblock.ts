import type { Node as PMNode } from "@quirekit/pm";

/** Object replacement character used for inline leaves so typed text never matches them. */
export const searchInlineLeafPlaceholder = "￼";

/** Flat text of one textblock and the document position of every UTF-16 unit. */
export interface IndexedTextblock {
  /** Concatenated inline text, with inline leaves replaced by a placeholder. */
  readonly text: string;
  /** Document position of each `text` code unit; same length as `text`. */
  readonly positions: readonly number[];
}

/**
 * Indexes one textblock so a match can cross formatting boundaries.
 *
 * Inline nodes with content are descended; inline leaves contribute one
 * placeholder unit, which keeps matches from spanning images, fields, or breaks.
 *
 * @param node - Textblock node.
 * @param position - Document position immediately before `node`.
 * @returns Flat text and its position map.
 */
export function indexTextblock(node: PMNode, position: number): IndexedTextblock {
  const parts: string[] = [];
  const positions: number[] = [];
  appendInlineContent(node, position + 1, parts, positions);
  return { text: parts.join(""), positions };
}

/**
 * Appends one inline content sequence into the mutable index.
 *
 * @param parent - Node whose inline children are appended.
 * @param contentStart - Document position of the first child.
 * @param parts - Mutable text fragments.
 * @param positions - Mutable position map.
 */
function appendInlineContent(
  parent: PMNode,
  contentStart: number,
  parts: string[],
  positions: number[]
): void {
  parent.forEach((child, offset) => {
    const childStart = contentStart + offset;
    if (child.isText) {
      const text = child.text ?? "";
      parts.push(text);
      for (let index = 0; index < text.length; index += 1) {
        positions.push(childStart + index);
      }
      return;
    }
    if (child.isLeaf || !child.inlineContent) {
      parts.push(searchInlineLeafPlaceholder);
      positions.push(childStart);
      return;
    }
    appendInlineContent(child, childStart + 1, parts, positions);
  });
}
