import { readRecord, readText } from "../model/validation";
import type { MindMapTopicImage } from "./types";

/** @param source - Checked PNG data URL. @returns Intrinsic decoded pixel area from its IHDR. */
export function mindMapImagePixels(source: string): number {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let bytes = "", buffer = 0, bits = 0;
  // Only the 33-byte PNG header is decoded; image data stays opaque in the DOM-free model.
  for (const character of source.slice(22, 66)) {
    const value = alphabet.indexOf(character); if (value < 0) break;
    buffer = (buffer << 6) | value; bits += 6;
    if (bits >= 8) { bits -= 8; bytes += String.fromCharCode((buffer >>> bits) & 255); }
  }
  if (bytes.slice(0, 8) !== "\x89PNG\r\n\x1a\n" || bytes.slice(12, 16) !== "IHDR") throw new TypeError("image: invalid PNG header");
  /** @param offset - First byte in a network-order integer. @returns Unsigned 32-bit dimension. */
  function dimension(offset: number): number {
    return bytes.charCodeAt(offset) * 16777216 + bytes.charCodeAt(offset + 1) * 65536 + bytes.charCodeAt(offset + 2) * 256 + bytes.charCodeAt(offset + 3);
  }
  const width = dimension(16), height = dimension(20), pixels = width * height;
  if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= 4096) || pixels > 8e6) throw new RangeError("image: decoded pixel budget exceeded");
  return pixels;
}

/** @param input - Untrusted image. @returns Detached safe PNG projection after header and display checks. */
export function readMindMapTopicImage(input: unknown): MindMapTopicImage {
  const value = readRecord(input, ["dataUrl", "width", "height", "alt"], "image");
  if (typeof value.dataUrl !== "string" || value.dataUrl.length > 1e6 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(value.dataUrl)) throw new TypeError("image: expected bounded embedded PNG");
  mindMapImagePixels(value.dataUrl);
  if (![value.width, value.height].every(n => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 512)) throw new TypeError("image: invalid display dimensions");
  const alt = readText(value.alt, "image.alt"); if (alt.length > 200) throw new RangeError("image: alternative text too long");
  return Object.freeze({ dataUrl: value.dataUrl, width: value.width as number, height: value.height as number, alt });
}
