import type {
  SvgMountedViewElements,
  SvgMountedViewOptions,
  SvgMountedViewRuntimeOptions
} from "./types";
import type { QuireRect } from "@quirekit/renderer";

const svgRootClassName = "qk-svg-editor";
const svgDocumentSurfaceClassName = "qk-svg-editor__document";
const svgOverlayHostClassName = "qk-svg-editor__overlays";
const svgInputProxyClassName = "qk-svg-editor__input-proxy";

/**
 * Creates the DOM elements required by a mounted SVG editor view.
 *
 * The mounted SVG backend owns a positioned `pageStackHost` div that renders
 * per-page SVG frames and a document-sized coordinate surface for input geometry.
 *
 * @param options - Mount options with host element and optional owner document.
 * @returns Elements owned by the mounted SVG view.
 */
export function createSvgMountedViewElements(
  options: SvgMountedViewOptions
): SvgMountedViewElements {
  const ownerDocument = options.ownerDocument ?? options.element.ownerDocument;
  const root = ownerDocument.createElement("div");
  const overlayHost = ownerDocument.createElement("div");
  const inputProxy = ownerDocument.createElement("textarea");

  applySvgRootAttributes(
    root,
    options.id,
    options.runtime?.hiddenTextViewMode ?? "normal"
  );
  applySvgOverlayHostAttributes(overlayHost);
  applySvgInputProxyAttributes(inputProxy);

  const documentSurface = createSvgDocumentSurface(ownerDocument);
  const pageStackHost = createSvgPageStackHost(ownerDocument);

  root.appendChild(documentSurface);
  root.appendChild(pageStackHost);
  root.appendChild(overlayHost);
  root.appendChild(inputProxy);

  return {
    root,
    overlayHost,
    inputProxy,
    documentSurface,
    pageStackHost
  };
}

/**
 * Resolves the document-space coordinate surface for SVG mounted interactions.
 *
 * SVG page-stack mode uses the invisible document surface that spans the
 * scrollable document; the root remains a final fallback for partially
 * constructed elements.
 *
 * @param elements - Elements owned by the mounted SVG view.
 * @returns Element whose client rect maps to document coordinates.
 */
export function resolveSvgMountedCoordinateSurface(
  elements: SvgMountedViewElements
): SVGSVGElement | HTMLElement {
  return elements.documentSurface ?? elements.root;
}

/**
 * Synchronizes the SVG page-stack coordinate surface with document bounds.
 *
 * The coordinate authority maps the surface client rectangle onto
 * `layoutSnapshot.documentRect`. The DOM element must therefore occupy that same
 * rectangle in CSS pixels; using the full channel width would scale x
 * coordinates and using document origin `(0, 0)` would double-apply page offsets.
 *
 * @param surface - Document coordinate surface used by page-stack mode.
 * @param documentRect - Document-space bounds produced by layout.
 */
export function syncSvgMountedDocumentSurfaceGeometry(
  surface: HTMLElement | undefined,
  documentRect: QuireRect
): void {
  if (!surface) {
    return;
  }

  surface.style.left = `${documentRect.x}px`;
  surface.style.top = `${documentRect.y}px`;
  surface.style.width = `${documentRect.width}px`;
  surface.style.height = `${documentRect.height}px`;
}

/**
 * Creates the document-bounds SVG page-stack coordinate surface.
 *
 * @param ownerDocument - Document used to create the surface element.
 * @returns Element used as the page-stack coordinate origin.
 */
function createSvgDocumentSurface(ownerDocument: Document): HTMLElement {
  const surface = ownerDocument.createElement("div");

  surface.className = svgDocumentSurfaceClassName;
  surface.dataset.qkDocumentSurface = "";
  surface.style.position = "absolute";
  surface.style.left = "0";
  surface.style.top = "0";
  surface.style.width = "0";
  surface.style.height = "0";

  return surface;
}

/**
 * Creates the page-stack host that owns per-page SVG frames.
 *
 * @param ownerDocument - Document used to create the host element.
 * @returns Positioned page-stack host element.
 */
function createSvgPageStackHost(ownerDocument: Document): HTMLElement {
  const host = ownerDocument.createElement("div");

  host.className = "qk-svg-editor__page-stack";
  host.dataset.qkPageStack = "";
  host.style.position = "absolute";
  host.style.left = "0";
  host.style.top = "0";
  host.style.width = "100%";
  host.style.height = "100%";

  return host;
}

/**
 * Applies stable attributes to the mounted SVG view root element.
 *
 * @param root - Root element to update.
 * @param id - Stable mounted view identifier.
 * @param hiddenTextViewMode - Initial hidden-text presentation policy.
 */
function applySvgRootAttributes(
  root: HTMLElement,
  id: string,
  hiddenTextViewMode: NonNullable<
    SvgMountedViewRuntimeOptions["hiddenTextViewMode"]
  >
): void {
  root.className = svgRootClassName;
  root.dataset.qkView = "svg";
  root.dataset.qkViewId = id;
  root.dataset.qkHiddenTextView = hiddenTextViewMode;
}

/**
 * Applies stable attributes to the DOM overlay host.
 *
 * @param overlayHost - Overlay host to update.
 */
function applySvgOverlayHostAttributes(overlayHost: HTMLElement): void {
  overlayHost.className = svgOverlayHostClassName;
  overlayHost.dataset.qkOverlays = "";
}

/**
 * Applies stable attributes to the hidden text input proxy.
 *
 * @param inputProxy - Textarea input proxy to update.
 */
function applySvgInputProxyAttributes(inputProxy: HTMLTextAreaElement): void {
  inputProxy.className = svgInputProxyClassName;
  inputProxy.dataset.qkInputProxy = "";
  inputProxy.setAttribute("aria-label", "SVG editor input");
  inputProxy.setAttribute("autocomplete", "off");
  inputProxy.setAttribute("autocapitalize", "off");
  inputProxy.setAttribute("spellcheck", "false");
  inputProxy.setAttribute("inputmode", "text");
}
