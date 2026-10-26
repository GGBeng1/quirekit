import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { FlowchartSvg, SvgEntry } from "./types";

const elements = new Set(["svg", "g", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "linearGradient", "radialGradient", "stop", "clipPath", "title", "desc"]);
const attributes = new Set(["xmlns", "viewBox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "d", "points", "transform", "id", "fill", "stroke", "color", "fill-rule", "clip-rule", "opacity", "fill-opacity", "stroke-opacity", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "clip-path", "clipPathUnits", "gradientUnits", "gradientTransform", "spreadMethod", "offset", "stop-color", "stop-opacity", "preserveAspectRatio", "version"]);
/** @param value - Literal attribute/text. @returns Escaped XML. */
function escapeXml(value: string): string { return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;"); }
/** @param value - Intrinsic dimension. @returns Positive finite bounded size. */
function size(value: string | undefined): number {
  const result = Number(value?.replace(/px$/u, ""));
  if (!Number.isFinite(result) || result <= 0 || result > 4096) throw new TypeError("image: invalid SVG dimensions");
  return result;
}
/** @param input - Untrusted vector XML. @returns Bounded static SVG with no executable/external content. */
export function readFlowchartSvg(input: string): FlowchartSvg {
  if (typeof input !== "string" || input.length > 500000 || /<!DOCTYPE|<!ENTITY|<\?/iu.test(input)) throw new TypeError("image: unsupported SVG source");
  if (XMLValidator.validate(input) !== true) throw new TypeError("image: invalid SVG XML");
  const tree = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: "", parseAttributeValue: false, trimValues: false, processEntities: true }).parse(input) as SvgEntry[];
  const roots = tree.filter(entry => !Object.hasOwn(entry, "#text"));
  if (roots.length !== 1 || !roots[0]!.svg) throw new TypeError("image: expected SVG root");
  const rootAttrs = roots[0]![":@"] as Readonly<Record<string, string>> | undefined;
  const viewBox = rootAttrs?.viewBox?.trim().split(/[ ,]+/u).map(Number);
  if (viewBox && (viewBox.length !== 4 || !viewBox.every(n => Number.isFinite(n) && Math.abs(n) <= 1e6))) throw new TypeError("image: invalid SVG viewBox");
  const width = size(viewBox ? String(viewBox[2]) : rootAttrs?.width), height = size(viewBox ? String(viewBox[3]) : rootAttrs?.height);
  let count = 0; const ids = new Set<string>(), references = new Set<string>();
  /** @param entry - Ordered XML element. @param depth - Bounded nesting. @param parent - Text owner. @returns Allowlisted XML. */
  function compile(entry: SvgEntry, depth: number, parent = ""): string {
    if (++count > 4000 || depth > 32) throw new RangeError("image: SVG element budget exceeded");
    if (Object.hasOwn(entry, "#text")) {
      const literal = String(entry["#text"]);
      if (!literal.trim()) return "";
      if (!["title", "desc"].includes(parent) || literal.length > 1000) throw new TypeError("image: unsupported SVG text");
      return escapeXml(literal);
    }
    const name = Object.keys(entry).find(key => key !== ":@")!;
    if (!elements.has(name) || (name === "svg" && depth !== 0)) throw new TypeError(`image: unsupported SVG element ${name}`);
    const attrs = { ...entry[":@"] as Readonly<Record<string, string>> };
    if (name === "svg") { attrs.xmlns = "http://www.w3.org/2000/svg"; attrs.viewBox ??= `0 0 ${width} ${height}`; }
    const compiled = Object.entries(attrs).map(([key, value]) => {
      if (!attributes.has(key) || typeof value !== "string" || /[<>\u0000-\u001f]/u.test(value)) throw new TypeError(`image: unsupported SVG attribute ${key}`);
      if (key === "xmlns" && value !== "http://www.w3.org/2000/svg") throw new TypeError("image: invalid SVG namespace");
      if (/url\s*\(/iu.test(value)) {
        const match = /^url\(#([A-Za-z][\w.-]*)\)$/u.exec(value);
        if (!match || !["fill", "stroke", "clip-path"].includes(key)) throw new TypeError("image: external SVG reference");
        references.add(match[1]!);
      } else if (key !== "xmlns" && /https?:|data:|javascript:|\\|[;{}]/iu.test(value)) throw new TypeError("image: unsupported SVG value");
      if (key === "id") { if (!/^[A-Za-z][\w.-]*$/u.test(value) || ids.has(value)) throw new TypeError("image: invalid SVG identity"); ids.add(value); }
      return ` ${key}="${escapeXml(value)}"`;
    }).join("");
    return `<${name}${compiled}>${(entry[name] as readonly SvgEntry[]).map(child => compile(child, depth + 1, name)).join("")}</${name}>`;
  }
  const source = compile(roots[0]!, 0);
  if ([...references].some(id => !ids.has(id))) throw new TypeError("image: missing SVG reference");
  return Object.freeze({ source, width, height });
}
