/** System fonts for diagrams shown as images: an image cannot use the page's web fonts, so text is measured with the same fonts it is drawn with. */
export const IMAGE_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

/**
 * Wraps rendered SVG markup as an image. The diagram's own stylesheet then stays inside the image document, so
 * showing or scrolling the preview never adds page-wide styles, and layout sees one replaced element.
 * @param markup - Sanitized SVG from the shared renderer.
 * @param owner - Document used for inert parsing.
 * @returns Image HTML with the SVG's intrinsic size, or the markup unchanged when it has no usable geometry.
 */
export function svgImageMarkup(markup: string, owner: Document): string {
  const template = owner.createElement("template");
  template.innerHTML = markup;
  const svg = template.content.querySelector("svg"), box = svg?.viewBox?.baseVal;
  const width = box?.width || Number.parseFloat(svg?.getAttribute("width") ?? ""), height = box?.height || Number.parseFloat(svg?.getAttribute("height") ?? "");
  if (!svg || !width || !height) return markup;
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(width)); svg.setAttribute("height", String(height));
  svg.style.removeProperty("max-width");
  const source = new (owner.defaultView ?? globalThis).XMLSerializer().serializeToString(svg);
  const image = owner.createElement("img");
  image.className = "msfe-preview-image";
  image.alt = "";
  image.draggable = false;
  image.width = Math.round(width); image.height = Math.round(height);
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  return image.outerHTML;
}
