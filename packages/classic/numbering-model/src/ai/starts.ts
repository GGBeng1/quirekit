import type { Node } from "@quirekit/pm";
import { resolveWordParagraphNumbering } from "../model";
import { resolveWordNumberingMarkers } from "../resolver/markers";
import type { ResolvedWordNumberingMarker } from "../types";

/** Shown starting numbers of each document, computed once per document. */
const cache = new WeakMap<Node, ReadonlyMap<number, number>>();

/**
 * Finds the numbered list items whose number the AI view shows: the first item of each run
 * of consecutive list paragraphs at a level, and items whose number does not follow the
 * item before at their level or that carry an explicit restart.
 *
 * Runs end at a paragraph outside any list, and a shallower item ends the groups below it,
 * so nested lists that start again under each parent count as new runs.
 *
 * @param doc - Document root.
 * @returns Shown number by paragraph position.
 */
export function resolveWordListAiStarts(doc: Node): ReadonlyMap<number, number> {
  const cached = cache.get(doc);
  if (cached !== undefined) return cached;
  const markers = resolveWordNumberingMarkers(doc);
  const starts = new Map<number, number>();
  let run: (ResolvedWordNumberingMarker | undefined)[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const marker = markers.get(pos);
    if (marker === undefined) {
      run = [];
      return false;
    }
    const previous = run[marker.level];
    run = run.slice(0, marker.level);
    run[marker.level] = marker;
    if (marker.kind !== "ordered" || marker.counter === undefined) return false;
    const natural = previous?.kind === "ordered" && previous.counter !== undefined
      ? previous.counter + 1
      : undefined;
    const restarted = resolveWordParagraphNumbering(node.attrs.wordNumbering)?.startOverride != null;
    if (natural === undefined || restarted || marker.counter !== natural) starts.set(pos, marker.counter);
    return false;
  });
  cache.set(doc, starts);
  return starts;
}

/**
 * @param doc - Document root.
 * @param pos - Position before a list paragraph.
 * @returns Number the paragraph's marker shows, or undefined for bullets and plain paragraphs.
 */
export function readWordListAiCounter(doc: Node, pos: number): number | undefined {
  const marker = resolveWordNumberingMarkers(doc).get(pos);
  return marker?.kind === "ordered" ? marker.counter : undefined;
}
