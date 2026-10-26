import type { QuireParagraphFormatting } from "../../../document-profile/types";
import type {
  QuireParagraphDecoration,
  QuireParagraphDecorationBorder
} from "../../../layout/engine/block-types";
import type { QuireTextblockIndentationGeometry } from "./indentation";

/** Non-collapsing block-flow insets reserved for paragraph border geometry. */
export interface QuireParagraphDecorationBlockInsets {
  /** Space from intrinsic content through the outer top border edge. */
  readonly blockStartInset?: number | undefined;
  /** Space from intrinsic content through the outer bottom border edge. */
  readonly blockEndInset?: number | undefined;
}

/**
 * Maps logical paragraph decoration onto physical sides for renderer metadata.
 *
 * @param formatting - Effective paragraph formatting.
 * @param direction - Effective paragraph base direction.
 * @returns Renderer-neutral decoration or undefined when the paragraph is plain.
 */
export function resolveQuireParagraphDecoration(
  formatting: QuireParagraphFormatting,
  direction: "auto" | "ltr" | "rtl"
): QuireParagraphDecoration | undefined {
  const source = formatting.decoration;
  if (source === null) return undefined;
  const { fill, top, bottom, start, end, inlineOutset } = source;
  const [left, right] = direction === "rtl" ? [end, start] : [start, end];
  return {
    ...(inlineOutset === undefined ? {} : { inlineOutset }),
    ...(fill === undefined ? {} : { fillStyle: fill }),
    ...(top === undefined ? {} : { top }),
    ...(bottom === undefined ? {} : { bottom }),
    ...(left === undefined ? {} : { left }),
    ...(right === undefined ? {} : { right }),
    firstFragment: true,
    lastFragment: true
  };
}

/**
 * Resolves non-collapsing flow space needed by horizontal paragraph borders.
 *
 * The paint command places a border center one border-space plus half a line
 * width from the intrinsic paragraph rectangle. Reserving space plus the full
 * line width keeps the outer edge ahead of collapsible paragraph spacing.
 *
 * @param decoration - Compiled paragraph decoration metadata.
 * @returns Sparse start/end insets in renderer pixels.
 */
export function resolveQuireParagraphDecorationBlockInsets(
  decoration: QuireParagraphDecoration | undefined
): QuireParagraphDecorationBlockInsets {
  const blockStartInset = resolveBorderBlockInset(decoration?.top);
  const blockEndInset = resolveBorderBlockInset(decoration?.bottom);
  return {
    ...(blockStartInset === 0 ? {} : { blockStartInset }),
    ...(blockEndInset === 0 ? {} : { blockEndInset })
  };
}

/**
 * Attaches the physical paragraph interval used by shading and borders.
 *
 * Word paragraph decoration spans the union of the first-line and following-
 * line indentation intervals. It is deliberately separate from the full-width
 * inline layout rectangle, which remains the authority for wrapping and
 * transient reflow.
 *
 * @param decoration - Compiled paragraph decoration metadata.
 * @param geometry - Effective first-line and following-line indentation.
 * @returns Decoration carrying physical inline bounds, or undefined.
 */
export function applyQuireParagraphDecorationInlineGeometry(
  decoration: QuireParagraphDecoration | undefined,
  geometry: QuireTextblockIndentationGeometry
): QuireParagraphDecoration | undefined {
  if (decoration === undefined) return undefined;

  const outset = decoration.inlineOutset ?? 0;
  const inlineOffset = Math.min(geometry.x, geometry.firstLineX) - outset;
  const inlineEnd = Math.max(
    geometry.x + geometry.width,
    geometry.firstLineX + geometry.firstLineWidth
  ) + outset;
  return {
    ...decoration,
    inlineOffset,
    inlineSize: Math.max(0, inlineEnd - inlineOffset)
  };
}

/**
 * Resolves the outer block-axis extent consumed by one horizontal border.
 *
 * @param border - Compiled physical border side.
 * @returns Non-negative border space plus line width.
 */
function resolveBorderBlockInset(
  border: QuireParagraphDecorationBorder | undefined
): number {
  return border === undefined ? 0 : border.space + border.lineWidth;
}
