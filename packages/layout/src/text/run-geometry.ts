import type { QuireRect } from "@quirekit/renderer";
import type { QuireTextFragment } from "./types";

/**
 * Resolves the visual rectangle owned by one text run.
 *
 * The fragment rectangle remains the line box used by wrapping, selection, and
 * row hit testing. Character backgrounds, run-relative decorations, and carets
 * use this narrower vertical box so a tall sibling run cannot stretch them.
 *
 * @param fragment - Text fragment carrying line and optional run metrics.
 * @returns Run-relative visual rectangle, or the line box for legacy fragments.
 */
export function resolveQuireTextFragmentRunRect(
  fragment: QuireTextFragment
): QuireRect {
  const ascent = fragment.runAscent;
  const descent = fragment.runDescent;

  if (
    ascent === undefined
    || descent === undefined
    || !Number.isFinite(ascent)
    || !Number.isFinite(descent)
    || ascent < 0
    || descent < 0
  ) {
    return fragment.rect;
  }

  return {
    x: fragment.rect.x,
    y: fragment.baseline - ascent,
    width: fragment.rect.width,
    height: ascent + descent
  };
}
