import type { Node as PMNode } from "@quirekit/pm";
import type { TextCaseUnit } from "./types";

const wordChar = /[\p{L}\p{N}\p{M}'’]/u;

/** Characters of one textblock plus the text node each character belongs to. */
export interface TextCaseBlock {
  /** Characters in document order; inline atoms appear as separators. */
  readonly units: readonly TextCaseUnit[];
  /** Text node owning each unit, or null for a separator. */
  readonly owners: readonly (PMNode | null)[];
}

/**
 * Collects every textblock overlapping a range as character units.
 *
 * Inline containers such as inline content controls are walked through; any
 * other inline leaf ends the current word.
 *
 * @param doc - Document to read.
 * @param from - Range start.
 * @param to - Range end.
 * @returns Textblocks in document order.
 */
export function collectTextCaseBlocks(doc: PMNode, from: number, to: number): TextCaseBlock[] {
  const blocks: TextCaseBlock[] = [];
  doc.nodesBetween(from, to, (block, blockPos) => {
    if (!block.isTextblock) return true;
    const units: TextCaseUnit[] = [];
    const owners: (PMNode | null)[] = [];
    block.descendants((node, offset) => {
      if (node.isText) {
        let pos = blockPos + 1 + offset;
        for (const char of node.text!) {
          units.push({ char, pos, target: pos >= from && pos + char.length <= to });
          owners.push(node);
          pos += char.length;
        }
        return false;
      }
      if (node.isLeaf) {
        units.push({ char: " ", pos: -1, target: false });
        owners.push(null);
      }
      return true;
    });
    blocks.push({ units, owners });
    return false;
  });
  return blocks;
}

/**
 * Expands a caret to the word it touches, like Word's change case without a selection.
 *
 * @param doc - Document to read.
 * @param pos - Caret position.
 * @returns Word range, or null when the caret touches no word.
 */
export function resolveTextCaseWord(doc: PMNode, pos: number): { from: number; to: number } | null {
  const $pos = doc.resolve(pos);
  if (!$pos.parent.isTextblock) return null;
  const units = collectTextCaseBlocks(doc, $pos.start(), $pos.end())[0]?.units ?? [];
  const isWord = (unit: TextCaseUnit | undefined) => unit !== undefined && unit.pos >= 0 && wordChar.test(unit.char);
  let index = units.findIndex(unit => unit.pos >= pos);
  if (index < 0) index = units.length;
  if (!isWord(units[index])) index -= 1;
  if (!isWord(units[index])) return null;
  let start = index;
  let end = index;
  while (isWord(units[start - 1])) start -= 1;
  while (isWord(units[end + 1])) end += 1;
  return { from: units[start]!.pos, to: units[end]!.pos + units[end]!.char.length };
}
