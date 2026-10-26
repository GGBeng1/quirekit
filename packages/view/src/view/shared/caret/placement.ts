import { resolveDisplayListStyles } from "@quirekit/view-engine";
import type { QuireDisplayListStyles } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import type { MountedDomCaretPlacement } from "./types";

/** Minimum DOM caret width in document pixels. */
const minDomCaretWidth = 1;

/** Options used to resolve the DOM caret placement for a render pass. */
export interface ResolveMountedDomCaretPlacementOptions {
  /** Latest render result with selection caret geometry. */
  readonly renderResult: QuireViewRenderResult;
  /** Optional display-list style overrides used to resolve the caret color. */
  readonly displayListStyles?: Partial<QuireDisplayListStyles> | undefined;
}

/**
 * Resolves the DOM caret placement from selection caret geometry.
 *
 * The caret rectangle is returned in **document coordinates** (the layout
 * snapshot's absolute space, where blocks already carry their page offsets). The
 * caret element lives inside the document-spanning overlay layer
 * (`.qk-*-editor__overlays`), whose origin is the document origin and which scrolls
 * with the content, so a document-space rectangle lands on the rendered caret and
 * follows scroll natively — no client conversion or scroll listener is needed.
 *
 * @param options - Render result and optional style overrides.
 * @returns Caret placement in document coordinates, or undefined when no caret exists.
 */
export function resolveMountedDomCaretPlacement(
  options: ResolveMountedDomCaretPlacementOptions
): MountedDomCaretPlacement | undefined {
  const caret = options.renderResult.selectionGeometry.carets[0];

  if (caret === undefined) {
    return undefined;
  }

  const styles = resolveDisplayListStyles(options.displayListStyles);

  return {
    left: caret.rect.x,
    top: caret.rect.y,
    width: Math.max(caret.rect.width, minDomCaretWidth),
    height: caret.rect.height,
    color: styles.caretFillStyle
  };
}
