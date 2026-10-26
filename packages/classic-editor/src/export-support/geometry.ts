import type { QuireEditor } from "@quirekit/core";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import type { ClassicEditorFixedLayoutGeometry } from "./types";

const a4WidthCssPixels = 210 / 25.4 * 96;
const a4HeightCssPixels = 297 / 25.4 * 96;
const defaultMarginCssPixels = 96;

/** Default A4 geometry used by generic non-Word Classic documents. */
export const defaultClassicEditorFixedLayoutPageGeometry: QuirePageGeometry =
  Object.freeze({
    pageRect: Object.freeze({
      x: 0,
      y: 0,
      width: a4WidthCssPixels,
      height: a4HeightCssPixels
    }),
    bodyRect: Object.freeze({
      x: defaultMarginCssPixels,
      y: defaultMarginCssPixels,
      width: a4WidthCssPixels - defaultMarginCssPixels * 2,
      height: a4HeightCssPixels - defaultMarginCssPixels * 2
    }),
    pageGap: 16
  });

/**
 * Resolves the single Classic page policy shared by fixed-layout exports.
 *
 * @param editor - Current canonical editor.
 * @param explicit - Optional host geometry; only `undefined` means omitted.
 * @returns Viewport seed plus explicit/default geometry when Classic owns it.
 */
export function resolveClassicEditorFixedLayoutGeometry(
  editor: QuireEditor,
  explicit: QuirePageGeometry | undefined
): ClassicEditorFixedLayoutGeometry {
  if (explicit !== undefined) {
    return Object.freeze({
      viewportRect: explicit.pageRect,
      pageGeometry: explicit
    });
  }

  if (editor.state.doc.firstChild?.type.name === "wordSection") {
    return Object.freeze({
      viewportRect: defaultClassicEditorFixedLayoutPageGeometry.pageRect
    });
  }

  return Object.freeze({
    viewportRect: defaultClassicEditorFixedLayoutPageGeometry.pageRect,
    pageGeometry: defaultClassicEditorFixedLayoutPageGeometry
  });
}
