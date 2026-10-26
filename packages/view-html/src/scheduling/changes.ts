import { getChangedRanges, type QuireChangedRange } from "@quirekit/core";
import { AddMarkStep, AddNodeMarkStep, AttrStep, RemoveMarkStep, RemoveNodeMarkStep, type Transform } from "@quirekit/pm";

/**
 * Includes attribute-only steps whose empty position map still changes retained DOM.
 * @param transform - Ordered steps in their original successive document spaces.
 * @returns Dirty ranges expressed in the batch's initial and final documents.
 */
export function getHtmlChangedRanges(transform: Transform): readonly QuireChangedRange[] {
  const ranges = getChangedRanges(transform);
  for (let index = 0; index < transform.steps.length; index++) {
    const step = transform.steps[index]!;
    let mappedContent = false;
    step.getMap().forEach(() => { mappedContent = true; });
    if (mappedContent || step instanceof AddMarkStep || step instanceof RemoveMarkStep) continue;

    // Empty maps describe unchanged positions, not unchanged node attributes.
    // Node-specific steps invalidate only their owner; unknown custom steps
    // conservatively visit the document instead of silently leaving stale DOM.
    const before = transform.docs[index]!;
    const positioned = step instanceof AttrStep || step instanceof AddNodeMarkStep || step instanceof RemoveNodeMarkStep;
    const node = positioned ? before.nodeAt(step.pos) : null;
    const from = positioned && node ? step.pos : 0;
    const to = positioned && node ? from + node.nodeSize : before.content.size;
    const toInitial = transform.mapping.invert().slice(transform.steps.length - index);
    const toFinal = transform.mapping.slice(index);
    ranges.push({
      oldRange: { from: toInitial.map(from, -1), to: toInitial.map(to, 1) },
      newRange: { from: toFinal.map(from, -1), to: toFinal.map(to, 1) }
    });
  }
  return ranges;
}
