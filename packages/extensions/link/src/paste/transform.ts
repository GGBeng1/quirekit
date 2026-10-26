import { Fragment, Slice, type MarkType, type Node as ProseMirrorNode } from "@quirekit/pm";
import { findAutomaticLinkMatches } from "../authoring/matches";

/**
 * Links URL spans within a clipboard slice, preserving all structural coordinates.
 * @param slice - Parsed clipboard content.
 * @param type - Link mark available in the receiving schema.
 * @returns The transformed slice, sharing unchanged nodes.
 */
export function linkPastedSlice(slice: Slice, type: MarkType): Slice {
  const content = transformFragment(slice.content, type);
  return content.eq(slice.content) ? slice : new Slice(content, slice.openStart, slice.openEnd);
}

/**
 * Separates inline text runs from schema/atom/code/existing-link boundaries.
 * @param fragment - One local clipboard fragment.
 * @param type - Receiving Link mark.
 * @returns Fragment with URL marks and all other data preserved.
 */
function transformFragment(fragment: Fragment, type: MarkType): Fragment {
  const result: ProseMirrorNode[] = [];
  let textRun: ProseMirrorNode[] = [];
  /** Flushes only contiguous eligible text; never flattens block positions. */
  function flush(): void {
    if (textRun.length) result.push(...linkTextRun(textRun, type));
    textRun = [];
  }
  fragment.forEach(node => {
    if (node.isText && !node.marks.some(mark => mark.type === type || mark.type.spec.code
      || mark.type.excludes(type) || type.excludes(mark.type))) {
      textRun.push(node);
      return;
    }
    flush();
    if (!node.isAtom && !node.type.spec.code
      && (!node.inlineContent || node.type.allowsMarkType(type))) {
      const content = transformFragment(node.content, type);
      result.push(content.eq(node.content) ? node : node.copy(content));
    } else result.push(node);
  });
  flush();
  return Fragment.fromArray(result);
}

/**
 * Recognizes complete URL spans across differently formatted text leaves.
 * @param nodes - Adjacent text nodes with no existing link or code mark.
 * @param type - Receiving Link mark.
 * @returns Text leaves retaining original formatting and display characters.
 */
function linkTextRun(nodes: readonly ProseMirrorNode[], type: MarkType): ProseMirrorNode[] {
  const source = Fragment.fromArray(nodes);
  const text = source.textBetween(0, source.size);
  const matches = findAutomaticLinkMatches(text);
  const result: ProseMirrorNode[] = [];
  let nodeStart = 0;
  let matchIndex = 0;
  // Walk both ordered streams once; Fragment.cut per match would rescan all runs.
  for (const node of nodes) {
    let offset = 0;
    while (offset < node.nodeSize) {
      const position = nodeStart + offset;
      while (matches[matchIndex] && matches[matchIndex]!.end <= position) matchIndex += 1;
      const match = matches[matchIndex];
      const linked = match !== undefined && match.start <= position;
      const end = Math.min(node.nodeSize, match === undefined ? node.nodeSize
        : (linked ? match.end : match.start) - nodeStart);
      const part = node.cut(offset, end);
      result.push(linked ? part.mark(type.create({ href: match!.href }).addToSet(part.marks)) : part);
      offset = end;
    }
    nodeStart += node.nodeSize;
  }
  return result;
}
