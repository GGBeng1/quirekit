import DOMPurify from "dompurify";

/** @param svg - Engine output, still untrusted. @param owner - Host DOM parser. @returns Sanitized SVG with bounded natural dimensions. */
export function sanitizeTextDiagram(svg: string, owner: Document): { svg: string; width: number; height: number } {
  if (svg.length > 4_000_000) throw new RangeError("diagram-svg-budget");
  const clean = DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["foreignObject", "a", "image", "animate", "animateTransform", "set"], FORBID_ATTR: ["href", "xlink:href"] });
  for (const match of clean.matchAll(/url\(([^)]*)\)/giu)) {
    if (!match[1]!.trim().replace(/^["']|["']$/gu, "").startsWith("#")) throw new Error("diagram-external-resource");
  }
  const parsed = new owner.defaultView!.DOMParser().parseFromString(clean, "image/svg+xml");
  const root = parsed.documentElement;
  if (root.localName !== "svg" || parsed.querySelector("parsererror")) throw new Error("diagram-svg-invalid");
  for (const element of root.querySelectorAll("style,[style]")) {
    const css = (element.localName === "style" ? element.textContent : "") + (element.getAttribute("style") ?? "");
    if (/@import|@font-face|\\/iu.test(css)) throw new Error("diagram-external-style");
  }
  const box = root.getAttribute("viewBox")?.trim().split(/[\s,]+/u).map(Number);
  const width = box?.[2] ?? Number.parseFloat(root.getAttribute("width") ?? ""), height = box?.[3] ?? Number.parseFloat(root.getAttribute("height") ?? "");
  if (![width, height].every(value => Number.isFinite(value) && value > 0 && value <= 30_000)) throw new Error("diagram-size-invalid");
  root.setAttribute("width", String(width)); root.setAttribute("height", String(height));
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return { svg: new owner.defaultView!.XMLSerializer().serializeToString(root), width, height };
}
