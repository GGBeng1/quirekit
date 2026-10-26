import type { FlowchartSnapshot } from "@quirekit/flowchart";
/** @param snapshot - Trusted adapter-generated SVG. @param background - Explicit HEX or transparent omission. @param owner - DOM realm used for XML. @returns Source-bound SVG with a background in its own world viewBox. */
export function flowchartSnapshotBackground(snapshot: FlowchartSnapshot, background: string | undefined, owner: Document): FlowchartSnapshot {
  if (background === undefined) return snapshot;
  if (!/^#[\da-fA-F]{6}$/.test(background)) throw new TypeError("背景色需要六位 HEX 颜色");
  const view = owner.defaultView; if (!view) throw new Error("图片导出需要浏览器文档");
  const xml = new view.DOMParser().parseFromString(snapshot.svg, "image/svg+xml"), root = xml.documentElement;
  if (root.localName !== "svg" || xml.querySelector("parsererror")) throw new Error("无效 SVG 快照");
  const values = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (!values || values.length !== 4 || !values.every(Number.isFinite)) throw new Error("SVG 缺少有效边界");
  root.querySelector('[data-flow-background]')?.remove();
  const rectangle = xml.createElementNS("http://www.w3.org/2000/svg", "rect");
  ["x", "y", "width", "height"].forEach((key, i) => rectangle.setAttribute(key, String(values[i])));
  rectangle.setAttribute("fill", background); rectangle.setAttribute("data-flow-background", ""); root.insertBefore(rectangle, root.firstChild);
  return Object.freeze({ ...snapshot, svg: new view.XMLSerializer().serializeToString(root) });
}
