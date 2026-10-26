import type { QuireInputProxyPlacementOptions } from "../../input/types";

export { resolveMountedInputProxyAnchor } from "./input-anchor";

/**
 * Mirrors live mounted editability onto the native textarea input host.
 *
 * @param inputProxy - Hidden textarea owned by the mounted view.
 * @param editable - Whether the mounted view currently accepts editing input.
 */
export function syncMountedInputProxyEditableState(
  inputProxy: HTMLTextAreaElement,
  editable: boolean
): void {
  // WebKit owns the active keyboard session. Reasserting the same native
  // editability during focus/selection rendering must not restart that session.
  if (inputProxy.readOnly !== !editable) inputProxy.readOnly = !editable;
  const value = String(!editable);
  if (inputProxy.getAttribute("aria-readonly") !== value) inputProxy.setAttribute("aria-readonly", value);
}

/**
 * Measures the proxy's positioning root, including any host zoom or transform.
 *
 * @param inputProxy - Textarea input proxy positioned by its parent element.
 * @returns Root client rectangle and client CSS px per root-local CSS px.
 */
export function readMountedInputProxyPositioningRoot(
  inputProxy: HTMLTextAreaElement
): Required<Pick<QuireInputProxyPlacementOptions, "positioningRootClientRect" | "positioningRootScale">> {
  const root = inputProxy.parentElement!;
  const positioningRootClientRect = root.getBoundingClientRect();
  // `offsetWidth` stays in local CSS px under CSS zoom and transforms.
  const localWidth = root.offsetWidth;
  return {
    positioningRootClientRect,
    positioningRootScale: localWidth > 0 ? positioningRootClientRect.width / localWidth : 1
  };
}

/**
 * Writes geometry and typography shared by every mounted input proxy.
 *
 * Placement authority remains backend-owned: Canvas and SVG project retained
 * layout geometry, while HTML measures its retained DOM Range. Only the final
 * browser style write is shared here.
 *
 * @param inputProxy - Textarea input proxy to synchronize.
 * @param styles - CSS values resolved by the backend placement adapter.
 */
export function syncMountedInputProxyLayoutStyle(
  inputProxy: HTMLTextAreaElement,
  styles: Readonly<{
    left: string;
    top: string;
    width: string;
    height: string;
    font: string;
    lineHeight: string;
  }>
): void {
  setMountedInputProxyStyleValue(inputProxy.style, "left", styles.left);
  setMountedInputProxyStyleValue(inputProxy.style, "top", styles.top);
  setMountedInputProxyStyleValue(inputProxy.style, "width", styles.width);
  setMountedInputProxyStyleValue(inputProxy.style, "height", styles.height);
  setMountedInputProxyStyleValue(inputProxy.style, "font", styles.font);
  setMountedInputProxyStyleValue(inputProxy.style, "lineHeight", styles.lineHeight);
}

/** Options used to synchronize native IME preedit visibility on an input proxy. */
export interface SyncMountedInputProxyImePreeditVisibilityOptions {
  /** Textarea input proxy owned by the mounted view. */
  readonly inputProxy: HTMLTextAreaElement;
}

/**
 * Keeps the native input proxy measurable while QuireKit owns visual preedit text.
 *
 * @param options - Input proxy whose IME anchor styles should be normalized.
 */
export function syncMountedInputProxyImePreeditVisibility(
  options: SyncMountedInputProxyImePreeditVisibilityOptions
): void {
  setMountedInputProxyStyleValue(options.inputProxy.style, "opacity", "0");
  setMountedInputProxyStyleValue(
    options.inputProxy.style,
    "color",
    "transparent"
  );
  setMountedInputProxyStyleValue(
    options.inputProxy.style,
    "caretColor",
    "transparent"
  );
  setMountedInputProxyStyleValue(options.inputProxy.style, "padding", "0");
  setMountedInputProxyStyleValue(options.inputProxy.style, "margin", "0");
  setMountedInputProxyStyleValue(options.inputProxy.style, "overflow", "hidden");
  setMountedInputProxyStyleValue(options.inputProxy.style, "resize", "none");
  setMountedInputProxyStyleValue(options.inputProxy.style, "boxSizing", "border-box");
  setMountedInputProxyStyleValue(options.inputProxy.style, "backgroundColor", "transparent");
  setMountedInputProxyStyleValue(options.inputProxy.style, "border", "0");
  setMountedInputProxyStyleValue(options.inputProxy.style, "boxShadow", "none");
  setMountedInputProxyStyleValue(options.inputProxy.style, "outline", "none");
  setMountedInputProxyStyleValue(options.inputProxy.style, "appearance", "none");
}

/**
 * Assigns a CSS value when it differs from the current inline style.
 *
 * @param style - Input proxy inline style declaration.
 * @param property - CSSStyleDeclaration property to write.
 * @param value - New CSS value.
 */
function setMountedInputProxyStyleValue(
  style: CSSStyleDeclaration,
  property:
    | "opacity"
    | "color"
    | "caretColor"
    | "padding"
    | "margin"
    | "overflow"
    | "resize"
    | "boxSizing"
    | "backgroundColor"
    | "border"
    | "boxShadow"
    | "outline"
    | "appearance"
    | "left"
    | "top"
    | "width"
    | "height"
    | "font"
    | "lineHeight",
  value: string
): void {
  if (style[property] === value) {
    return;
  }

  style[property] = value;
}
