import { createFlowchart } from "../model/create";
import { parseFlowchart, readFlowchart, serializeFlowchart } from "../model/document";
import { identity, number, record, text } from "../model/validation";
import type { FlowchartEmbed, FlowchartPreview, FlowchartRasterSnapshot } from "./types";
import { previewAddress } from "./address";

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
function preview(input: unknown, version: number): FlowchartPreview | null {
  if (input === null) return null;
  const linked = typeof input === "object" && !Array.isArray(input) && "url" in input;
  const value = record(input, [linked ? "url" : "dataUrl", "width", "height"], "preview");
  const width = number(value.width, 1, 4096, "preview.width"), height = number(value.height, 1, 4096, "preview.height");
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new TypeError("preview: expected integer dimensions");
  if (linked) {
    if (version !== 2) throw new TypeError("preview: linked preview requires version 2");
    return Object.freeze({ url: previewAddress(value.url), width, height });
  }
  if (typeof value.dataUrl !== "string" || value.dataUrl.length > 12 * 1024 * 1024
    || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/u.test(value.dataUrl)) throw new TypeError("preview: expected bounded PNG");
  return Object.freeze({ dataUrl: value.dataUrl, width, height });
}
/** @param input - Untrusted portable object. @returns Detached immutable source and preview. */
export function readFlowchartEmbed(input: unknown): FlowchartEmbed {
  const value = record(input, ["type", "version", "id", "title", "document", "preview"], "embed");
  if (value.type !== "quirekit-flowchart-embed" || (value.version !== 1 && value.version !== 2)) throw new TypeError("embed: unsupported type/version");
  const title = text(value.title); if (title.length > 200) throw new RangeError("embed: title too long");
  const document = readFlowchart(value.document); serializeFlowchart(document);
  const image = preview(value.preview, value.version);
  // Inline-only envelopes keep version 1 so readers older than the linked form still open them.
  const result: FlowchartEmbed = Object.freeze({ type: "quirekit-flowchart-embed", version: image?.url ? 2 : 1, id: identity(value.id), title, document, preview: image });
  if (byteLength(JSON.stringify(result)) > maximumBytes) throw new RangeError("embed: JSON budget exceeded");
  return result;
}
/** @param id - Host identity. @param title - Plain accessible name. @returns Empty source without a host transaction. */
export function createFlowchartEmbed(id: string, title = "流程图"): FlowchartEmbed {
  return readFlowchartEmbed({ type: "quirekit-flowchart-embed", version: 1, id, title, document: createFlowchart(), preview: null });
}
/** @param source - Encoded envelope. @returns Validated content or an explicit diagnostic. */
export function parseFlowchartEmbed(source: string): FlowchartEmbed {
  if (source.length > maximumBytes) throw new RangeError("embed: JSON budget exceeded");
  return readFlowchartEmbed(JSON.parse(source));
}
/** @param embed - Complete object. @returns Stable JSON safe inside a Markdown fence. */
export function serializeFlowchartEmbed(embed: FlowchartEmbed): string {
  return JSON.stringify(readFlowchartEmbed(embed)).replace(/`/gu, "\\u0060");
}
/** @param original - Captured host baseline. @param snapshot - Exact source and its raster. @param title - Optional new name.
 * @returns Proposed atomic revision; only the host's synchronous commit accepts it. */
export function prepareFlowchartSave(original: FlowchartEmbed, snapshot: FlowchartRasterSnapshot, title = original.title): FlowchartEmbed {
  const document = parseFlowchart(snapshot.source);
  if (document.revision !== original.document.revision) throw new Error("snapshot: revision does not match the captured graph");
  return readFlowchartEmbed({ ...original, title, document: { ...document, revision: document.revision + 1 },
    preview: { dataUrl: snapshot.dataUrl, width: snapshot.width, height: snapshot.height } });
}
