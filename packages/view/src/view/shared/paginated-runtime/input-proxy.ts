import type { QuireRect } from "@quirekit/renderer";
import type { QuireImePreedit } from "@quirekit/view-engine";
import { resolveQuireImePreeditInputProxyMinWidth, resolveQuireInputProxyPlacement } from "../../../input";
import type { QuireViewRenderResult } from "../../types";
import { resolveMountedInputProxyAnchor } from "../input-anchor";
import {
  readMountedInputProxyPositioningRoot,
  syncMountedInputProxyImePreeditVisibility,
  syncMountedInputProxyLayoutStyle
} from "../input-proxy";

/** Inputs required to synchronize a paginated mounted input proxy. */
export interface SyncMountedPaginatedInputProxyOptions {
  /** Textarea input proxy owned by the mounted view. */
  readonly inputProxy: HTMLTextAreaElement;
  /** Coordinate authority used to resolve viewport-relative placement. */
  readonly coordinateSurface: Element;
  /** Latest render result with selection geometry. */
  readonly renderResult: QuireViewRenderResult;
  /** Rendered surface bounds from the current render pass. */
  readonly surfaceBounds: QuireRect;
  /** Optional IME preedit from IME input. */
  readonly imePreedit?: QuireImePreedit | undefined;
  /** Display-list font mirrored onto the proxy; empty keeps the stylesheet font. */
  readonly font?: string | undefined;
}

/**
 * Places the hidden input proxy of a Canvas or SVG view at the current caret or selection anchor.
 *
 * @param options - Input proxy, render result, surface bounds, and font inputs.
 */
export function syncMountedPaginatedInputProxy(options: SyncMountedPaginatedInputProxyOptions): void {
  const imePreeditMinWidth = options.imePreedit === undefined
    ? undefined
    : resolveQuireImePreeditInputProxyMinWidth(options.imePreedit.text);
  const placement = resolveQuireInputProxyPlacement({
    anchor: resolveMountedInputProxyAnchor(options.renderResult),
    surfaceBounds: options.surfaceBounds,
    surfaceClientRect: options.coordinateSurface.getBoundingClientRect(),
    ...readMountedInputProxyPositioningRoot(options.inputProxy),
    ...(imePreeditMinWidth === undefined ? {} : { minWidth: imePreeditMinWidth })
  });

  syncMountedInputProxyLayoutStyle(options.inputProxy, {
    left: `${placement.left}px`,
    top: `${placement.top}px`,
    width: `${placement.width}px`,
    height: `${placement.height}px`,
    font: options.font ?? "",
    lineHeight: `${placement.height}px`
  });
  syncMountedInputProxyImePreeditVisibility({ inputProxy: options.inputProxy });
}
