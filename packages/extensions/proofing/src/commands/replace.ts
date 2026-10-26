import type { Mark, Node as PMNode, Transaction } from "@quirekit/pm";
import type { ProofingIssue, ProofingRange } from "../types";

/** Text node piece inside the finding, in finding-text offsets and document positions. */
interface TextPiece {
  /** Offset of the piece in the finding text. */
  readonly offset: number;
  /** Document position of the piece. */
  readonly from: number;
  /** Document position after the piece. */
  readonly to: number;
  /** Marks of the text node. */
  readonly marks: readonly Mark[];
}

/**
 * Replaces the text of a finding when the document still holds it.
 *
 * Only the differing middle is rewritten, so unchanged letters keep their own
 * formatting. New text is inserted before old text is deleted piece by piece,
 * which leaves zero-width markers such as bookmarks and comment anchors in place.
 *
 * @param tr - Transaction to extend.
 * @param issue - Finding in current positions.
 * @param replacement - Replacement text.
 * @returns Whether the document held the finding's text.
 */
export function replaceProofingText(tr: Transaction, issue: ProofingIssue, replacement: string): boolean {
  const pieces = collectTextPieces(tr.doc, issue);
  const current = pieces.map((piece) => tr.doc.textBetween(piece.from, piece.to)).join("");
  if (current !== issue.text || pieces.length === 0) return false;
  const { prefix, suffix } = measureCommonEnds(current, replacement);
  const removed = toDocumentRanges(pieces, prefix, current.length - suffix);
  const inserted = replacement.slice(prefix, replacement.length - suffix);
  const anchor = locateOffset(pieces, prefix);
  if (inserted.length > 0) tr.insert(anchor.pos, tr.doc.type.schema.text(inserted, anchor.marks));
  const mapped = removed.map((range) => ({ from: tr.mapping.map(range.from, 1), to: tr.mapping.map(range.to, -1) }));
  for (const range of mapped.reverse()) tr.delete(range.from, range.to);
  return true;
}

/**
 * Lists the text nodes covered by a finding.
 *
 * @param doc - Current document.
 * @param issue - Finding in current positions.
 * @returns Pieces in document order.
 */
function collectTextPieces(doc: PMNode, issue: ProofingIssue): TextPiece[] {
  const pieces: TextPiece[] = [];
  let offset = 0;
  doc.nodesBetween(issue.from, issue.to, (node, pos) => {
    if (!node.isText) return true;
    const from = Math.max(issue.from, pos);
    const to = Math.min(issue.to, pos + node.nodeSize);
    if (to > from) {
      pieces.push({ offset, from, to, marks: node.marks });
      offset += to - from;
    }
    return false;
  });
  return pieces;
}

/**
 * Measures the shared prefix and suffix, never splitting a surrogate pair.
 *
 * @param current - Text in the document.
 * @param replacement - Replacement text.
 * @returns Shared prefix and suffix lengths.
 */
function measureCommonEnds(current: string, replacement: string): { prefix: number; suffix: number } {
  const limit = Math.min(current.length, replacement.length);
  let prefix = 0;
  while (prefix < limit && current[prefix] === replacement[prefix]) prefix += 1;
  if (prefix > 0 && isHighSurrogate(current.charCodeAt(prefix - 1))) prefix -= 1;
  let suffix = 0;
  while (suffix < limit - prefix && current[current.length - 1 - suffix] === replacement[replacement.length - 1 - suffix]) {
    suffix += 1;
  }
  if (suffix > 0 && isLowSurrogate(current.charCodeAt(current.length - suffix))) suffix -= 1;
  return { prefix, suffix };
}

/**
 * Converts a finding-text interval into document ranges.
 *
 * @param pieces - Text pieces.
 * @param start - First text offset.
 * @param end - Text offset after the interval.
 * @returns Document ranges in order.
 */
function toDocumentRanges(pieces: readonly TextPiece[], start: number, end: number): ProofingRange[] {
  const ranges: ProofingRange[] = [];
  for (const piece of pieces) {
    const from = Math.max(start, piece.offset);
    const to = Math.min(end, piece.offset + piece.to - piece.from);
    if (to > from) ranges.push({ from: piece.from + from - piece.offset, to: piece.from + to - piece.offset });
  }
  return ranges;
}

/**
 * Finds the insertion point and formatting for text inserted at an offset.
 *
 * @param pieces - Text pieces.
 * @param offset - Text offset.
 * @returns Document position and the marks of the adjacent original letter.
 */
function locateOffset(pieces: readonly TextPiece[], offset: number): { pos: number; marks: readonly Mark[] } {
  for (const piece of pieces) {
    if (offset < piece.offset + piece.to - piece.from) return { pos: piece.from + offset - piece.offset, marks: piece.marks };
  }
  const last = pieces[pieces.length - 1]!;
  return { pos: last.to, marks: last.marks };
}

/** @param code - UTF-16 code unit. @returns Whether it starts a surrogate pair. */
function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

/** @param code - UTF-16 code unit. @returns Whether it ends a surrogate pair. */
function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}
