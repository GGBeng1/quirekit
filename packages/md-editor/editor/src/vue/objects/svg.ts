import { PREVIEW_STYLE_ATTRIBUTE } from "@quirekit/msfe-markdown-extras";

/**
 * Turns a rendered diagram SVG into a standalone image address.
 * An `<img>` cannot resolve percentage sizes, so the intrinsic size comes from the viewBox.
 * @param svg - Mounted or freshly parsed sanitized SVG.
 * @returns SVG data URL, or null when the element has no usable geometry.
 */
export function svgImageUrl(svg: SVGSVGElement): string | null {
  const clone = svg.cloneNode(true) as SVGSVGElement, box = svg.viewBox?.baseVal;
  const width = box?.width || svg.width?.baseVal.value, height = box?.height || svg.height?.baseVal.value;
  if (!width || !height) return null;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width)); clone.setAttribute("height", String(height));
  clone.style.removeProperty("max-width");
  // Previews hoist a diagram's own stylesheet into shared head styles; standalone images need it back.
  const css = clone.getAttribute(PREVIEW_STYLE_ATTRIBUTE);
  if (css) {
    clone.removeAttribute(PREVIEW_STYLE_ATTRIBUTE);
    const style = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = css;
    clone.prepend(style);
  }
  const markup = new (svg.ownerDocument.defaultView ?? globalThis).XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** @param owner - Document used for parsing. @param markup - Sanitized SVG from the shared renderer. @returns Its image address, or null. */
export function svgMarkupImageUrl(owner: Document, markup: string): string | null {
  const template = owner.createElement("template");
  template.innerHTML = markup;
  const svg = template.content.querySelector("svg");
  return svg ? svgImageUrl(svg) : null;
}

/** @param label - Localized pending text. @returns A neutral placeholder shown until an unmounted diagram renders. */
export function pendingImageUrl(label: string): string {
  const text = label.replace(/[<&>]/gu, "");
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270"><rect width="480" height="270" fill="#fff"/><text x="240" y="140" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#64748b">${text}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
