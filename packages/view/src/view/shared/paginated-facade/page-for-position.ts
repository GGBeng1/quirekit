import type { QuireLayoutSnapshot } from "@quirekit/view-engine";

/** One laid-out page of a snapshot. */
type MountedLayoutPage = NonNullable<QuireLayoutSnapshot["pages"]>[number];

/**
 * Finds the page showing a document position, laid out in the current window or not.
 *
 * Body positions resolve through page ranges; positions inside footnotes and
 * endnotes resolve through the note ranges each page records.
 *
 * @param snapshot - Layout snapshot whose pages cover the whole document.
 * @param position - Document position.
 * @returns Page holding the position, or undefined.
 */
export function findMountedPageForPosition(
  snapshot: QuireLayoutSnapshot,
  position: number
): MountedLayoutPage | undefined {
  const pages = snapshot.pages ?? [];
  const contains = (range: { readonly from: number; readonly to: number }) => range.from <= position && position <= range.to;
  return pages.find(page => contains(page.range)) ?? pages.find(page => page.noteRanges?.some(contains) === true);
}
