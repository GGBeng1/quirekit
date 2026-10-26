import type { QuireWidgetConstraints, QuireWidgetInsets } from "./types";

/** Empty inset value shared by widget layout helpers. */
export const emptyQuireWidgetInsets: QuireWidgetInsets = Object.freeze({
  bottom: 0,
  left: 0,
  right: 0,
  top: 0
});

/**
 * Creates a normalized widget constraint object.
 *
 * @param constraints - Partial constraint values to normalize.
 * @returns Complete constraints with non-negative dimensions.
 */
export function createQuireWidgetConstraints(
  constraints: Partial<QuireWidgetConstraints> = {}
): QuireWidgetConstraints {
  const minWidth = normalizeDimension(constraints.minWidth ?? 0);
  const minHeight = normalizeDimension(constraints.minHeight ?? 0);
  const maxWidth = normalizeMaxDimension(constraints.maxWidth ?? Number.POSITIVE_INFINITY);
  const maxHeight = normalizeMaxDimension(constraints.maxHeight ?? Number.POSITIVE_INFINITY);

  return Object.freeze({
    minWidth: Math.min(minWidth, maxWidth),
    maxWidth,
    minHeight: Math.min(minHeight, maxHeight),
    maxHeight
  });
}

/**
 * Creates constraints that force one exact size.
 *
 * @param width - Exact width in canvas coordinate space.
 * @param height - Exact height in canvas coordinate space.
 * @returns Tight constraints for the requested size.
 */
export function createTightQuireWidgetConstraints(
  width: number,
  height: number
): QuireWidgetConstraints {
  const normalizedWidth = normalizeDimension(width);
  const normalizedHeight = normalizeDimension(height);

  return Object.freeze({
    minWidth: normalizedWidth,
    maxWidth: normalizedWidth,
    minHeight: normalizedHeight,
    maxHeight: normalizedHeight
  });
}

/**
 * Resolves a widget inset object from shorthand values.
 *
 * @param value - Either a number applied to all edges or a partial inset object.
 * @returns Complete immutable inset object.
 */
export function createQuireWidgetInsets(
  value: number | Partial<QuireWidgetInsets> = 0
): QuireWidgetInsets {
  if (typeof value === "number") {
    const inset = normalizeDimension(value);

    return Object.freeze({
      bottom: inset,
      left: inset,
      right: inset,
      top: inset
    });
  }

  return Object.freeze({
    bottom: normalizeDimension(value.bottom ?? 0),
    left: normalizeDimension(value.left ?? 0),
    right: normalizeDimension(value.right ?? 0),
    top: normalizeDimension(value.top ?? 0)
  });
}

/**
 * Reduces constraints by a set of insets.
 *
 * @param constraints - Constraints to shrink.
 * @param insets - Insets that consume available space.
 * @returns Constraints for the inset content box.
 */
export function insetQuireWidgetConstraints(
  constraints: QuireWidgetConstraints,
  insets: QuireWidgetInsets
): QuireWidgetConstraints {
  const horizontal = insets.left + insets.right;
  const vertical = insets.top + insets.bottom;

  return createQuireWidgetConstraints({
    minWidth: Math.max(0, constraints.minWidth - horizontal),
    maxWidth: subtractFiniteDimension(constraints.maxWidth, horizontal),
    minHeight: Math.max(0, constraints.minHeight - vertical),
    maxHeight: subtractFiniteDimension(constraints.maxHeight, vertical)
  });
}

/**
 * Clamps a dimension between min and max values.
 *
 * @param value - Preferred dimension.
 * @param min - Minimum allowed dimension.
 * @param max - Maximum allowed dimension.
 * @returns Clamped dimension.
 */
export function clampQuireWidgetDimension(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(normalizeDimension(value), max));
}

/**
 * Resolves a possibly fixed dimension against constraints.
 *
 * @param fixed - Optional fixed dimension requested by a widget.
 * @param fallback - Fallback dimension when no fixed size exists.
 * @param min - Minimum allowed dimension.
 * @param max - Maximum allowed dimension.
 * @returns Resolved dimension.
 */
export function resolveQuireWidgetDimension(
  fixed: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (fixed !== undefined) {
    return clampQuireWidgetDimension(fixed, min, max);
  }

  return clampQuireWidgetDimension(fallback, min, max);
}

/**
 * Returns whether a dimension is finite and usable as a concrete size.
 *
 * @param value - Dimension to inspect.
 * @returns Whether the value is a finite number.
 */
export function isFiniteQuireWidgetDimension(value: number): boolean {
  return Number.isFinite(value);
}

/**
 * Normalizes a dimension to a non-negative finite value.
 *
 * @param value - Dimension to normalize.
 * @returns Non-negative finite dimension.
 */
function normalizeDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

/**
 * Normalizes a maximum dimension while preserving infinity.
 *
 * @param value - Maximum dimension to normalize.
 * @returns Non-negative finite dimension or positive infinity.
 */
function normalizeMaxDimension(value: number): number {
  if (value === Number.POSITIVE_INFINITY) {
    return value;
  }

  return normalizeDimension(value);
}

/**
 * Subtracts from a dimension while preserving infinity.
 *
 * @param value - Dimension to reduce.
 * @param amount - Amount to subtract.
 * @returns Reduced non-negative dimension.
 */
function subtractFiniteDimension(value: number, amount: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  return Math.max(0, value - amount);
}
