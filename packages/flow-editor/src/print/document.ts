import { planFlowchartPages, type FlowchartPageBounds, type FlowchartPagePlan, type FlowchartPageSettings, type FlowchartSnapshot } from "@quirekit/flowchart";
import { v4 as uuidv4 } from "uuid";

const svgNamespace = "http://www.w3.org/2000/svg";
/** @param snapshot - Adapter-generated source snapshot. @param owner - Browser realm. @returns Detached static SVG, refusing executable markup at the HTML output boundary. */
function readSvg(snapshot: FlowchartSnapshot, owner: Document): SVGSVGElement {
  if (!owner.defaultView) throw new Error("打印需要浏览器文档");
  const xml = new owner.defaultView.DOMParser().parseFromString(snapshot.svg, "image/svg+xml"), root = xml.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== svgNamespace || xml.querySelector("parsererror")) throw new Error("无效 SVG 快照");
  for (const element of [root, ...root.querySelectorAll("*")]) {
    if (["script", "foreignObject", "iframe", "animate", "animateTransform", "set", "style"].includes(element.localName)) throw new Error("打印快照含不支持的内容");
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) throw new Error("打印快照含不支持的内容");
      if (attribute.localName === "href" && !attribute.value.startsWith("#") && !/^(data:image\/png;base64,|data:image\/svg\+xml;charset=utf-8,)/.test(attribute.value)
        && !(element.localName === "a" && /^(https?:\/\/|mailto:)/i.test(attribute.value))) throw new Error("打印快照含外部资源");
    }
  }
  return root as unknown as SVGSVGElement;
}
/** @param snapshot - Exact source-bound SVG. @param owner - Browser realm. @returns Graph-coordinate bounds, including actual routed paths and captions. */
export function flowPrintBounds(snapshot: FlowchartSnapshot, owner: Document): FlowchartPageBounds {
  const values = readSvg(snapshot, owner).getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (!values || values.length !== 4 || !values.every(Number.isFinite)) throw new Error("SVG 缺少有效边界");
  return { x: values[0]!, y: values[1]!, width: values[2]!, height: values[3]! };
}
/** @param snapshot - Frozen vector content. @param plan - Validated physical layout. @param index - One current preview page. @param owner - Browser realm. @returns Standalone SVG for one graph-coordinate crop. */
export function flowPrintPageSvg(snapshot: FlowchartSnapshot, plan: FlowchartPagePlan, index: number, owner: Document): string {
  const page = plan.pages[index]; if (!page) throw new RangeError("page: invalid preview index");
  const root = readSvg(snapshot, owner);
  root.setAttribute("viewBox", `${page.x} ${page.y} ${page.width} ${page.height}`);
  root.setAttribute("width", String(page.width)); root.setAttribute("height", String(page.height)); root.setAttribute("preserveAspectRatio", "xMinYMin meet");
  return new owner.defaultView!.XMLSerializer().serializeToString(root);
}
/** @param snapshot - Exact immutable adapter output. @param settings - Physical draft settings. @param owner - Browser realm. @param title - Literal download title. @returns Self-contained printable HTML with content defined once and referenced by each page. */
export function createFlowPrintDocument(snapshot: FlowchartSnapshot, settings: FlowchartPageSettings, owner: Document, title: string): string {
  const root = readSvg(snapshot, owner), plan = planFlowchartPages(flowPrintBounds(snapshot, owner), settings), { margins } = plan.settings;
  const output = owner.implementation.createHTMLDocument(), meta = output.createElement("meta"), heading = output.createElement("title");
  heading.textContent = title; output.head.append(heading); meta.setAttribute("charset", "utf-8"); output.head.prepend(meta);
  const style = output.createElement("style");
  style.textContent = `@page{size:${plan.paperWidth}mm ${plan.paperHeight}mm;margin:0}
html,body{margin:0;padding:0;background:white}*{box-sizing:border-box}
.qk-print-definitions{position:absolute;width:0;height:0;overflow:hidden}
.qk-print-page{position:relative;width:${plan.paperWidth}mm;height:${plan.paperHeight}mm;overflow:hidden;background:white;break-after:page;print-color-adjust:exact;-webkit-print-color-adjust:exact}
.qk-print-page:last-child{break-after:auto}
.qk-print-page>svg{position:absolute;left:${margins.left}mm;top:${margins.top}mm;width:${plan.paperWidth - margins.left - margins.right}mm;height:${plan.paperHeight - margins.top - margins.bottom}mm;overflow:hidden}
@media screen{body{background:#e2e8f0;padding:16px}.qk-print-page{margin:0 auto 16px;box-shadow:0 1px 6px #0002}}`;
  output.head.append(style);
  // Define content once even for 100 sheets; embedded resources and graph SVG
  // are never duplicated per page. Each use keeps the same world-coordinate crop.
  const definitions = output.createElementNS(svgNamespace, "svg"), defs = output.createElementNS(svgNamespace, "defs"), group = output.createElementNS(svgNamespace, "g");
  definitions.setAttribute("class", "qk-print-definitions"); definitions.setAttribute("aria-hidden", "true");
  const id = `qk-print-${uuidv4()}`; group.id = id;
  for (const child of [...root.childNodes]) group.append(output.importNode(child, true));
  defs.append(group); definitions.append(defs); output.body.append(definitions);
  for (const page of plan.pages) {
    const section = output.createElement("section"), svg = output.createElementNS(svgNamespace, "svg"), use = output.createElementNS(svgNamespace, "use");
    section.className = "qk-print-page"; section.setAttribute("aria-label", `${page.index + 1} / ${plan.pages.length}`);
    svg.setAttribute("viewBox", `${page.x} ${page.y} ${page.width} ${page.height}`); svg.setAttribute("preserveAspectRatio", "xMinYMin meet");
    use.setAttribute("href", `#${id}`); svg.append(use); section.append(svg); output.body.append(section);
  }
  return `<!doctype html>\n${output.documentElement.outerHTML}`;
}
