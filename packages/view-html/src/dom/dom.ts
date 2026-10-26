import type {
  HtmlMountedViewElements,
  HtmlMountedViewOptions,
  HtmlMountedViewRuntimeOptions
} from "../types";
import { applyHtmlMountedStructureStyles } from "./style";

const svgNamespace = "http://www.w3.org/2000/svg";

/**
 * Creates the DOM elements required by a mounted HTML editor view.
 *
 * @param options - Mount options with host element and optional owner document.
 * @returns Elements owned by the mounted HTML view.
 */
export function createHtmlMountedViewElements(
  options: HtmlMountedViewOptions
): HtmlMountedViewElements {
  const ownerDocument = options.ownerDocument ?? options.element.ownerDocument;
  const root = ownerDocument.createElement("div");
  const contentSurface = ownerDocument.createElement("div");
  const overlaySurface = ownerDocument.createElementNS(svgNamespace, "svg");
  const overlayHost = ownerDocument.createElement("div");
  const inputProxy = ownerDocument.createElement("textarea");

  root.className = "qk-html-editor";
  root.dataset.qkView = "html";
  root.dataset.qkViewId = options.id;
  root.dataset.qkHiddenTextView = options.runtime?.hiddenTextViewMode ?? "normal";

  contentSurface.className = "qk-html-editor__content";
  contentSurface.dataset.qkSurface = "content";
  // The retained DOM is measurable semantic content, while the shared input
  // proxy is the only browser editing host. Making both editable lets Chrome
  // move focus to the Range mirror and interrupts IME composition ordering.
  contentSurface.setAttribute("contenteditable", "false");
  contentSurface.setAttribute("aria-multiline", "true");
  contentSurface.tabIndex = -1;

  overlaySurface.setAttribute("class", "qk-html-editor__overlay");
  overlaySurface.dataset.qkSurface = "overlay";
  overlayHost.className = "qk-html-editor__overlays";
  overlayHost.dataset.qkOverlays = "";
  inputProxy.className = "qk-html-editor__input-proxy";
  inputProxy.dataset.qkInputProxy = "";
  inputProxy.setAttribute("aria-label", "HTML editor input");
  for (const surface of [contentSurface, inputProxy]) {
    surface.setAttribute("autocomplete", "off");
    surface.setAttribute("autocapitalize", "off");
    surface.setAttribute("spellcheck", "false");
    surface.setAttribute("inputmode", "text");
  }
  applyHtmlMountedStructureStyles({ root, contentSurface, overlaySurface, overlayHost, inputProxy });
  applyHtmlSurfaceSizing(root, contentSurface, overlaySurface, options.runtime);

  root.appendChild(contentSurface);
  root.appendChild(overlaySurface);
  root.appendChild(overlayHost);
  root.appendChild(inputProxy);

  return {
    root,
    contentSurface,
    overlaySurface,
    overlayHost,
    inputProxy
  };
}

/**
 * Applies initial CSS dimensions to HTML runtime surfaces.
 *
 * @param root - Mounted view root element.
 * @param contentSurface - HTML content surface to size.
 * @param overlaySurface - SVG overlay surface to size.
 * @param runtime - Optional sizing inputs.
 */
function applyHtmlSurfaceSizing(
  root: HTMLElement,
  contentSurface: HTMLElement,
  overlaySurface: SVGSVGElement,
  runtime: HtmlMountedViewRuntimeOptions | undefined
): void {
  if (runtime?.width !== undefined) {
    const width = `${runtime.width}px`;

    root.style.width = width;
    contentSurface.style.width = width;
    contentSurface.setAttribute("width", `${runtime.width}`);
    overlaySurface.style.width = width;
    overlaySurface.setAttribute("width", `${runtime.width}`);
  }

  if (runtime?.height !== undefined) {
    const height = `${runtime.height}px`;

    root.style.height = height;
    contentSurface.style.minHeight = height;
    contentSurface.setAttribute("height", `${runtime.height}`);
    overlaySurface.style.height = height;
    overlaySurface.setAttribute("height", `${runtime.height}`);
  }
}
