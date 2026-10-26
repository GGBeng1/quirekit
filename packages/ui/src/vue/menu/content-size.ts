import type { CSSProperties } from "vue";
import { menuVariableReferences } from "../../components/menu";
import type { QuireKitMenuLength } from "../../components/menu";
import { anchoredSurfaceStyle } from "../shared/surface/geometry";

/**
 * Resolves one Menu surface's fixed or content-responsive inline constraints.
 *
 * @param width - Explicit fixed width or `auto`.
 * @param minWidth - Optional lower bound used by content-responsive menus.
 * @param maxWidth - Optional upper bound used by content-responsive menus.
 * @returns Vue style bindings for the Menu Content surface.
 */
export function resolveMenuContentStyle(
  width: QuireKitMenuLength | undefined,
  minWidth: QuireKitMenuLength | undefined,
  maxWidth: QuireKitMenuLength | undefined
): Readonly<CSSProperties> {
  const hasResponsiveConstraint = minWidth !== undefined || maxWidth !== undefined;
  return Object.freeze({
    width: width ?? (
      hasResponsiveConstraint
        ? "auto"
        : menuVariableReferences.geometry.contentWidth
    ),
    ...(minWidth === undefined ? {} : { minWidth }),
    ...(maxWidth === undefined ? {} : { maxWidth })
  });
}

/**
 * Keeps constrained Menu-family surfaces inside the viewport even with an explicit minimum width.
 * @param width - Explicit fixed width or `auto`.
 * @param minWidth - Optional lower bound capped by the usable viewport width.
 * @param maxWidth - Optional upper bound capped by the usable viewport width.
 * @returns Menu-family content constraints with independent vertical scrolling.
 */
export function resolveViewportMenuContentStyle(
  width: QuireKitMenuLength | undefined,
  minWidth: QuireKitMenuLength | undefined,
  maxWidth: QuireKitMenuLength | undefined
): Readonly<CSSProperties> {
  return Object.freeze({
    ...resolveMenuContentStyle(width, minWidth, maxWidth),
    ...(minWidth === undefined ? {} : { minWidth: viewportWidth(minWidth) }),
    maxWidth: viewportWidth(maxWidth ?? "100vw"),
    ...anchoredSurfaceStyle
  });
}

/**
 * Caps a CSS length while retaining the floating layer's 8 px edge allowance.
 * @param value - Numeric pixels or a CSS length expression.
 * @returns A CSS minimum expression in viewport coordinates.
 */
function viewportWidth(value: QuireKitMenuLength): string {
  return `min(${typeof value === "number" ? `${value}px` : value}, calc(100vw - 16px))`;
}

/**
 * Caps a child to the free side of its parent instead of sliding over its rows.
 * @param width - Preferred child width.
 * @param minWidth - Requested lower bound, limited by the available side.
 * @param maxWidth - Requested upper bound, limited by the available side.
 * @returns Content constraints following the floating layer's final placement.
 */
export function resolveSubmenuContentStyle(
  width: QuireKitMenuLength | undefined,
  minWidth: QuireKitMenuLength | undefined,
  maxWidth: QuireKitMenuLength | undefined
): Readonly<CSSProperties> {
  const available = "var(--available-width, calc(100vw - 16px))";
  return {
    ...resolveViewportMenuContentStyle(width, minWidth, maxWidth),
    ...(minWidth === undefined ? {} : { minWidth: `min(${viewportWidth(minWidth)}, ${available})` }),
    maxWidth: `min(${viewportWidth(maxWidth ?? "100vw")}, ${available})`
  };
}
