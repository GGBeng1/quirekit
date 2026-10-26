import type {
  CanvasMountedViewElements,
  CanvasMountedViewOptions,
  CanvasMountedViewRuntimeOptions
} from "./types";
import { resolveCanvasDevicePixelRatio } from "./device-pixel-ratio";

const canvasRootClassName = "qk-canvas-editor";
const canvasContentSurfaceClassName = "qk-canvas-editor__content";
const canvasOverlaySurfaceClassName = "qk-canvas-editor__overlay";
const canvasPointerLayerClassName = "qk-canvas-editor__pointer";
const canvasOverlayHostClassName = "qk-canvas-editor__overlays";
const canvasInputProxyClassName = "qk-canvas-editor__input-proxy";

/**
 * Creates the DOM elements required by a mounted Canvas 2D editor view.
 *
 * Single-surface mode owns a content and an overlay canvas; the content canvas
 * also serves as the pointer target and coordinate origin. Page-stack mode owns
 * no reference canvases: the per-page frames paint document content, and a single
 * lightweight pointer/coordinate layer beneath them is the pointer target and the
 * document-space coordinate origin.
 *
 * @param options - Mount options with host element and optional owner document.
 * @returns Elements owned by the mounted canvas view.
 */
export function createCanvasMountedViewElements(
  options: CanvasMountedViewOptions
): CanvasMountedViewElements {
  const ownerDocument = options.ownerDocument ?? options.element.ownerDocument;
  const root = ownerDocument.createElement("div");
  const overlayHost = ownerDocument.createElement("div");
  const inputProxy = ownerDocument.createElement("textarea");

  applyCanvasRootAttributes(
    root,
    options.id,
    options.runtime?.hiddenTextViewMode ?? "normal"
  );
  applyCanvasOverlayHostAttributes(overlayHost);
  applyCanvasInputProxyAttributes(inputProxy);

  if (options.runtime?.pageStack) {
    const coordinateSurface = createCanvasPointerLayer(ownerDocument);
    const pageStackHost = createCanvasPageStackHost(ownerDocument);

    root.appendChild(coordinateSurface);
    root.appendChild(pageStackHost);
    root.appendChild(overlayHost);
    root.appendChild(inputProxy);

    return { root, coordinateSurface, overlayHost, inputProxy, pageStackHost };
  }

  const contentSurface = ownerDocument.createElement("canvas");
  const overlaySurface = ownerDocument.createElement("canvas");

  applyCanvasSurfaceAttributes(contentSurface, "content", canvasContentSurfaceClassName);
  applyCanvasSurfaceAttributes(overlaySurface, "overlay", canvasOverlaySurfaceClassName);
  applyCanvasSurfaceSizing(contentSurface, options.runtime);
  applyCanvasSurfaceSizing(overlaySurface, options.runtime);

  root.appendChild(contentSurface);
  root.appendChild(overlaySurface);
  root.appendChild(overlayHost);
  root.appendChild(inputProxy);

  return {
    root,
    coordinateSurface: contentSurface,
    contentSurface,
    overlaySurface,
    overlayHost,
    inputProxy
  };
}

/**
 * Creates the page-stack pointer/coordinate layer.
 *
 * This absolutely positioned layer spans the document box beneath the per-page
 * frames. It is the pointer catcher (the page-stack host stays
 * `pointer-events: none` so clicks fall through to it) and the document-space
 * coordinate origin used by `posAtCoords`/`coordsAtPos`.
 *
 * @param ownerDocument - Document used to create the layer element.
 * @returns Positioned pointer/coordinate layer element.
 */
function createCanvasPointerLayer(ownerDocument: Document): HTMLElement {
  const layer = ownerDocument.createElement("div");
  layer.className = canvasPointerLayerClassName;
  layer.dataset.qkPointer = "";
  layer.style.position = "absolute";
  layer.style.left = "0";
  layer.style.top = "0";
  layer.style.width = "100%";
  layer.style.height = "100%";
  return layer;
}

/**
 * Creates the page-stack host that owns per-page surfaces.
 *
 * @param ownerDocument - Document used to create the host element.
 * @returns Positioned page-stack host element.
 */
function createCanvasPageStackHost(ownerDocument: Document): HTMLElement {
  const host = ownerDocument.createElement("div");
  host.className = "qk-canvas-editor__page-stack";
  host.dataset.qkPageStack = "";
  host.style.position = "absolute";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = "100%";
  host.style.height = "100%";
  return host;
}

/**
 * Applies stable attributes to the mounted canvas view root element.
 *
 * @param root - Root element to update.
 * @param id - Stable mounted view identifier.
 * @param hiddenTextViewMode - Initial hidden-text presentation policy.
 */
function applyCanvasRootAttributes(
  root: HTMLElement,
  id: string,
  hiddenTextViewMode: NonNullable<
    CanvasMountedViewRuntimeOptions["hiddenTextViewMode"]
  >
): void {
  root.className = canvasRootClassName;
  root.dataset.qkView = "canvas";
  root.dataset.qkViewId = id;
  root.dataset.qkHiddenTextView = hiddenTextViewMode;
}

/**
 * Applies stable attributes to a canvas surface element.
 *
 * @param canvas - Canvas surface to update.
 * @param surface - Surface role assigned to the canvas.
 * @param className - CSS class assigned to the canvas.
 */
function applyCanvasSurfaceAttributes(
  canvas: HTMLCanvasElement,
  surface: "content" | "overlay",
  className: string
): void {
  canvas.className = className;
  canvas.dataset.qkSurface = surface;
}

/**
 * Applies stable attributes to the DOM overlay host.
 *
 * @param overlayHost - Overlay host to update.
 */
function applyCanvasOverlayHostAttributes(overlayHost: HTMLElement): void {
  overlayHost.className = canvasOverlayHostClassName;
  overlayHost.dataset.qkOverlays = "";
}

/**
 * Applies stable attributes to the hidden text input proxy.
 *
 * @param inputProxy - Textarea input proxy to update.
 */
function applyCanvasInputProxyAttributes(inputProxy: HTMLTextAreaElement): void {
  inputProxy.className = canvasInputProxyClassName;
  inputProxy.dataset.qkInputProxy = "";
  inputProxy.setAttribute("aria-label", "Canvas editor input");
  inputProxy.setAttribute("autocomplete", "off");
  inputProxy.setAttribute("autocapitalize", "off");
  inputProxy.setAttribute("spellcheck", "false");
  inputProxy.setAttribute("inputmode", "text");
}

/**
 * Applies initial CSS and backing-store dimensions to a canvas surface.
 *
 * @param canvas - Canvas surface to size.
 * @param runtime - Optional sizing inputs.
 */
function applyCanvasSurfaceSizing(
  canvas: HTMLCanvasElement,
  runtime: CanvasMountedViewRuntimeOptions | undefined
): void {
  const width = runtime?.width;
  const height = runtime?.height;
  const devicePixelRatio = resolveCanvasDevicePixelRatio(
    runtime?.devicePixelRatio,
    runtime?.getDevicePixelRatio
  );

  if (width !== undefined) {
    canvas.style.width = `${width}px`;
    canvas.width = Math.max(Math.round(width * devicePixelRatio), 0);
  }

  if (height !== undefined) {
    canvas.style.height = `${height}px`;
    canvas.height = Math.max(Math.round(height * devicePixelRatio), 0);
  }
}
