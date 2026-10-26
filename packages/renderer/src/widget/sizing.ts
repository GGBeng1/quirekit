import type { QuirePoint, QuireRect } from "../core/geometry";
import {
  isFiniteQuireWidgetDimension,
  resolveQuireWidgetDimension
} from "./constraints";
import type { QuireWidgetConstraints } from "./types";

const defaultTextHeight = 20;

/**
 * Creates a resolved rectangle for a widget node.
 *
 * @param origin - Rectangle origin.
 * @param constraints - Constraints that bound the widget.
 * @param fixedWidth - Optional fixed width.
 * @param fixedHeight - Optional fixed height.
 * @param fallbackWidth - Optional preferred width.
 * @param fallbackHeight - Optional preferred height.
 * @returns Resolved rectangle.
 */
export function createResolvedRect(
  origin: QuirePoint,
  constraints: QuireWidgetConstraints,
  fixedWidth?: number,
  fixedHeight?: number,
  fallbackWidth?: number,
  fallbackHeight?: number
): QuireRect {
  const widthFallback = fallbackWidth ?? finiteOrZero(constraints.maxWidth);
  const heightFallback = fallbackHeight ?? finiteOrZero(constraints.maxHeight);

  return {
    x: origin.x,
    y: origin.y,
    width: resolveQuireWidgetDimension(
      fixedWidth,
      widthFallback,
      constraints.minWidth,
      constraints.maxWidth
    ),
    height: resolveQuireWidgetDimension(
      fixedHeight,
      heightFallback,
      constraints.minHeight,
      constraints.maxHeight
    )
  };
}

/**
 * Measures text when no caller-provided measurer exists.
 *
 * This fallback is intentionally approximate. Production editor paths should
 * inject a real font measurer from the active render surface.
 *
 * @param text - Text to measure.
 * @param font - CSS font shorthand.
 * @returns Approximate text size.
 */
export function defaultMeasureText(
  text: string,
  font: string
): { readonly width: number; readonly height: number } {
  void font;

  return {
    width: text.length * 8,
    height: defaultTextHeight
  };
}

/**
 * Converts infinity to zero for fallback sizing.
 *
 * @param value - Dimension to inspect.
 * @returns Finite dimension or zero.
 */
function finiteOrZero(value: number): number {
  return isFiniteQuireWidgetDimension(value) ? value : 0;
}
