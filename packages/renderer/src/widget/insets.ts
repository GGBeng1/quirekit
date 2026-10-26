import { createQuireWidgetInsets } from "./constraints";
import type { QuireWidgetInsets } from "./types";

/**
 * Creates an inset object using a single value or per-edge values.
 *
 * @param value - Inset shorthand.
 * @returns Immutable inset object.
 */
export function insets(value: number | Partial<QuireWidgetInsets> = 0): QuireWidgetInsets {
  return createQuireWidgetInsets(value);
}
