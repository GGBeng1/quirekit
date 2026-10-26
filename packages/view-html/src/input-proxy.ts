import {
  resolveQuireImePreeditInputProxyMinWidth
} from "@quirekit/view/mounted-backend";
import {
  readMountedInputProxyPositioningRoot,
  syncMountedInputProxyLayoutStyle,
  syncMountedInputProxyImePreeditVisibility
} from "@quirekit/view/mounted-backend";
import type { QuireImePreedit } from "@quirekit/view-engine";
import type { HtmlMountedViewRuntimeOptions } from "./types";
import type { HtmlMeasuredClientRect } from "./measurement";

/** Inputs required to synchronize a mounted HTML input proxy. */
export interface SyncHtmlMountedInputProxyOptions {
  /** Textarea input proxy owned by the mounted HTML view. */
  readonly inputProxy: HTMLTextAreaElement;
  /** Retained Range anchor measured in viewport CSS coordinates. */
  readonly anchor: HtmlMeasuredClientRect;
  /** Optional IME preedit used only to size the transparent candidate host. */
  readonly imePreedit?: QuireImePreedit | undefined;
  /** Optional runtime style overrides. */
  readonly runtime?: HtmlMountedViewRuntimeOptions | undefined;
}

/**
 * Places the transparent input proxy at the post-preedit Range anchor.
 *
 * Visible preedit belongs to retained DOM flow; the proxy remains only the
 * shared keyboard/IME host and must never become a second visual rendering.
 *
 * @param options - Input proxy, render result, surface state, and runtime inputs.
 */
export function syncHtmlMountedInputProxy(
  options: SyncHtmlMountedInputProxyOptions
): void {
  const imePreeditMinWidth =
    options.imePreedit === undefined
      ? undefined
      : resolveQuireImePreeditInputProxyMinWidth(options.imePreedit.text);
  const minWidth = imePreeditMinWidth ?? 150;
  const { positioningRootClientRect: rootRect, positioningRootScale: scale } =
    readMountedInputProxyPositioningRoot(options.inputProxy);
  const width = Math.max((options.anchor.right - options.anchor.left) / scale, minWidth);
  // A proxy reaching past the root's end widens the scroll container, and the focused textarea then
  // scrolls it sideways; near the end it shifts back inside while keeping its IME width.
  const rootWidth = options.inputProxy.parentElement?.offsetWidth ?? 0;
  const anchorLeft = (options.anchor.left - rootRect.left) / scale;
  // Range rects are client px; the proxy's styles are root-local px.
  const placement = {
    left: rootWidth > 0 ? Math.max(0, Math.min(anchorLeft, rootWidth - width)) : anchorLeft,
    // Keep the browser candidate window below the in-flow preedit. Anchoring
    // at the line top lets native IME chrome cover the text QuireKit just drew.
    top: (options.imePreedit === undefined
      ? options.anchor.top - rootRect.top
      : options.anchor.bottom - rootRect.top) / scale,
    width,
    height: Math.max((options.anchor.bottom - options.anchor.top) / scale, 20)
  };

  syncMountedInputProxyLayoutStyle(options.inputProxy, {
    left: `${placement.left}px`,
    top: `${placement.top}px`,
    width: `${placement.width}px`,
    height: `${placement.height}px`,
    font: options.runtime?.displayListStyles?.font ?? "",
    lineHeight: `${placement.height}px`
  });
  syncMountedInputProxyImePreeditVisibility({
    inputProxy: options.inputProxy
  });
}
