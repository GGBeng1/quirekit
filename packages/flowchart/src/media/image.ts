import { choice, identity, number, record, text } from "../model/validation";
import type { FlowchartNode, FlowchartPoint } from "../model/types";
import type { FlowchartImage, FlowchartImageCrop } from "./types";
import { readFlowchartSvg } from "./svg";
import { flowchartImageSourceRect } from "./geometry";

const vectorPrefix = "data:image/svg+xml;charset=utf-8,";
/** @param source - Embedded PNG. @returns Dimensions after signature and pixel-budget checks. */
function pngSize(source: string): { readonly width: number; readonly height: number } {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bytes = "", buffer = 0, bits = 0;
  for (const char of source.slice(22, 70)) {
    const value = alphabet.indexOf(char); if (value < 0) break;
    buffer = (buffer << 6) | value; bits += 6;
    if (bits >= 8) { bits -= 8; bytes += String.fromCharCode((buffer >>> bits) & 255); }
  }
  if (bytes.slice(0, 8) !== "\x89PNG\r\n\x1a\n" || bytes.slice(12, 16) !== "IHDR") throw new TypeError("image: invalid PNG header");
  /** @param offset - Big-endian header field. @returns Unsigned dimension. */
  function dimension(offset: number): number { return bytes.charCodeAt(offset) * 16777216 + bytes.charCodeAt(offset + 1) * 65536 + bytes.charCodeAt(offset + 2) * 256 + bytes.charCodeAt(offset + 3); }
  const width = dimension(16), height = dimension(20);
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 4096) || width * height > 8e6) throw new RangeError("image: decoded pixel budget exceeded");
  return { width, height };
}
/** @param input - Untrusted resource. @returns Detached image with checked intrinsic dimensions. */
export function readFlowchartImage(input: unknown): FlowchartImage {
  const value = record(input, ["dataUrl", "width", "height", "alt", "crop", "fit", "lockAspectRatio"], "image"), dataUrl = value.dataUrl;
  if (typeof dataUrl !== "string" || dataUrl.length > 1e6) throw new RangeError("image: encoded budget exceeded");
  let size: { readonly width: number; readonly height: number };
  if (/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(dataUrl)) size = pngSize(dataUrl);
  else if (dataUrl.startsWith(vectorPrefix)) {
    const svg = readFlowchartSvg(decodeURIComponent(dataUrl.slice(vectorPrefix.length)));
    if (dataUrl !== vectorPrefix + encodeURIComponent(svg.source)) throw new TypeError("image: noncanonical SVG source");
    size = svg;
  } else throw new TypeError("image: expected embedded PNG or static SVG");
  const width = number(value.width, 1, 4096, "image.width"), height = number(value.height, 1, 4096, "image.height");
  if (size.width !== width || size.height !== height) throw new TypeError("image: dimensions do not match source");
  const alt = text(value.alt); if (alt.length > 200) throw new RangeError("image: alternative text too long");
  const crop = value.crop === undefined ? undefined : readCrop(value.crop, width, height);
  if (value.lockAspectRatio !== undefined && typeof value.lockAspectRatio !== "boolean") throw new TypeError("image.lockAspectRatio: invalid boolean");
  return Object.freeze({ dataUrl, width, height, alt,
    ...(crop ? { crop } : {}), ...(value.fit === undefined ? {} : { fit: choice(value.fit, ["contain", "cover"] as const, "image.fit") }),
    ...(value.lockAspectRatio === undefined ? {} : { lockAspectRatio: value.lockAspectRatio as boolean }),
  });
}
/** @param input - Untrusted normalized insets. @param width - Original source width. @param height - Original source height. @returns Frozen crop retaining at least one pixel on each axis. */
function readCrop(input: unknown, width: number, height: number): FlowchartImageCrop {
  const value = record(input, ["top", "right", "bottom", "left"], "image.crop");
  const top = number(value.top, 0, 1, "image.crop.top"), right = number(value.right, 0, 1, "image.crop.right"),
    bottom = number(value.bottom, 0, 1, "image.crop.bottom"), left = number(value.left, 0, 1, "image.crop.left");
  if (width * (1 - (left + right)) < 1 - 1e-9 || height * (1 - (top + bottom)) < 1 - 1e-9) throw new RangeError("裁剪后至少保留 1 × 1 像素");
  return Object.freeze({ top, right, bottom, left });
}
/** @param source - SVG XML. @param alt - Literal description. @returns Canonical portable vector image. */
export function flowchartSvgImage(source: string, alt = ""): FlowchartImage {
  const svg = readFlowchartSvg(source);
  return readFlowchartImage({ dataUrl: vectorPrefix + encodeURIComponent(svg.source), width: svg.width, height: svg.height, alt });
}
/** @param id - Graph identity. @param image - Embedded resource. @param position - World top-left. @returns Initial image node with bounded display size. */
export function createFlowchartImageNode(id: string, image: FlowchartImage, position: FlowchartPoint): FlowchartNode {
  image = readFlowchartImage(image);
  const retained = flowchartImageSourceRect(image), longest = Math.max(retained.width, retained.height), scale = longest < 96 ? 96 / longest : Math.min(1, 240 / longest);
  return { id: identity(id), shape: "image", x: number(position.x, -1e6, 1e6, "x"), y: number(position.y, -1e6, 1e6, "y"), width: Math.max(20, retained.width * scale), height: Math.max(20, retained.height * scale), text: "", style: {}, image };
}
