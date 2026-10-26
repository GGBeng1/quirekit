import { createMindMapDocument } from "../outline/create";
import { parseMindMap, readMindMapDocument, serializeMindMap } from "../model/document";
import { readRecord as record, readText } from "../model/validation";
import type { MindMapEmbed, MindMapPreview, MindMapRasterSnapshot } from "./types";
import { previewAddress } from "./address";

/** @param value - Host object identity. @returns Bounded nonempty literal identity. */
function identity(value: unknown): string {
  const id = readText(value, "embed.id");
  if (!id || id.length > 128) throw new TypeError("embed: invalid identity");
  return id;
}
/** @param value - Intrinsic pixel dimension. @returns A bounded integer. */
function dimension(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 4096) throw new TypeError("preview: invalid dimensions");
  return value;
}
const maximumBytes = 16 * 1024 * 1024;
/** @param source - JSON text. @returns UTF-8 storage size without browser or Node dependencies. */
function byteLength(source: string): number {
  let bytes = 0;
  // Walk UTF-16 units instead of iterating characters, which allocates one string per character.
  for (let index = 0; index < source.length; index += 1) {
    const unit = source.charCodeAt(index);
    const pair = unit >= 0xd800 && unit <= 0xdbff && (source.charCodeAt(index + 1) & 0xfc00) === 0xdc00;
    bytes += unit < 0x80 ? 1 : unit < 0x800 ? 2 : pair ? 4 : 3;
    if (pair) index += 1;
  }
  return bytes;
}
/** @param input - Untrusted PNG projection. @param version - Envelope version; only version 2 may link.
 * @returns Immutable bounded raster or address, or an empty initial preview. */
function preview(input: unknown, version: number): MindMapPreview | null {
  if (input === null) return null;
  const linked = typeof input === "object" && !Array.isArray(input) && "url" in input;
  const value = record(input, [linked ? "url" : "dataUrl", "width", "height"], "preview");
  const width = dimension(value.width), height = dimension(value.height);
  if (linked) {
    if (version !== 2) throw new TypeError("preview: linked preview requires version 2");
    return Object.freeze({ url: previewAddress(value.url), width, height });
  }
  if (typeof value.dataUrl !== "string" || value.dataUrl.length > 12 * 1024 * 1024
    || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(value.dataUrl)) throw new TypeError("preview: expected bounded PNG");
  return Object.freeze({ dataUrl: value.dataUrl, width, height });
}
/** @param input - Untrusted portable object. @returns Detached immutable source and preview. */
export function readMindMapEmbed(input: unknown): MindMapEmbed {
  const value = record(input, ["type", "version", "id", "title", "document", "preview"], "embed");
  if (value.type !== "quirekit-mind-map-embed" || (value.version !== 1 && value.version !== 2)) throw new TypeError("embed: unsupported type/version");
  const title = readText(value.title, "embed.title"); if (title.length > 200) throw new RangeError("embed: title too long");
  const document = readMindMapDocument(value.document); serializeMindMap(document);
  const image = preview(value.preview, value.version);
  // Inline-only envelopes keep version 1 so readers older than the linked form still open them.
  const result: MindMapEmbed = Object.freeze({ type: "quirekit-mind-map-embed", version: image?.url ? 2 : 1, id: identity(value.id), title, document, preview: image });
  if (byteLength(JSON.stringify(result)) > maximumBytes) throw new RangeError("embed: JSON budget exceeded");
  return result;
}
/** @param id - Host identity. @param title - Plain accessible name. @returns Empty source without a host transaction. */
export function createMindMapEmbed(id: string, title = "思维导图"): MindMapEmbed {
  return readMindMapEmbed({ type: "quirekit-mind-map-embed", version: 1, id, title, document: createMindMapDocument({ text: title, children: [] }), preview: null });
}
/** @param source - Encoded envelope. @returns Validated content or an explicit diagnostic. */
export function parseMindMapEmbed(source: string): MindMapEmbed {
  if (source.length > maximumBytes) throw new RangeError("embed: JSON budget exceeded");
  return readMindMapEmbed(JSON.parse(source));
}
/** @param embed - Complete object. @returns Stable JSON safe inside a Markdown fence. */
export function serializeMindMapEmbed(embed: MindMapEmbed): string {
  return JSON.stringify(readMindMapEmbed(embed)).replace(/`/gu, "\\u0060");
}
/** @param original - Captured host baseline. @param snapshot - Exact source and its raster. @param title - Optional new name.
 * @returns Proposed atomic revision; only the host's synchronous commit accepts it. */
export function prepareMindMapSave(original: MindMapEmbed, snapshot: MindMapRasterSnapshot, title = original.title): MindMapEmbed {
  const document = parseMindMap(snapshot.source);
  if (document.revision !== original.document.revision) throw new Error("snapshot: revision does not match the captured mind map");
  return readMindMapEmbed({ ...original, title, document: { ...document, revision: document.revision + 1 },
    preview: { dataUrl: snapshot.dataUrl, width: snapshot.width, height: snapshot.height } });
}
