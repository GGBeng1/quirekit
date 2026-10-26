import type { EditorProps as PMEditorProps } from "@quirekit/pm";
import type { QuireMountedEditorView } from "../types";
import type { MountedViewScrollInset, MountedViewScrollRect } from "./types";

/**
 * Resolves a PM scroll prop as an inset.
 *
 * @param view - Mounted view whose props should be queried.
 * @param propName - PM scroll prop name.
 * @param fallback - Fallback inset when no valid prop exists.
 * @returns Resolved inset.
 */
export function readMountedViewScrollInset(
  view: QuireMountedEditorView,
  propName: keyof PMEditorProps,
  fallback: MountedViewScrollInset
): MountedViewScrollInset {
  const value = view.someProp(propName);

  return isMountedViewScrollInset(value) ? value : fallback;
}

/**
 * Reads one side from a scroll inset.
 *
 * @param inset - Scroll inset.
 * @param side - Rectangle side to read.
 * @returns Inset for that side.
 */
export function getMountedViewScrollInsetSide(
  inset: MountedViewScrollInset,
  side: keyof MountedViewScrollRect
): number {
  return typeof inset === "number" ? inset : inset[side];
}

/**
 * Reports whether a value can be used as a scroll inset.
 *
 * @param value - Candidate value from PM props.
 * @returns Whether the candidate is a supported inset.
 */
function isMountedViewScrollInset(value: unknown): value is MountedViewScrollInset {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (value === null || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Record<keyof MountedViewScrollRect, unknown>>;

  return (
    typeof candidate.top === "number" &&
    typeof candidate.right === "number" &&
    typeof candidate.bottom === "number" &&
    typeof candidate.left === "number"
  );
}
