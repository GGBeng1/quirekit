import { createFont } from "fonteditor-core";
import {
  create,
  type Font,
  type FontCollection
} from "fontkit";

/** Complete font bytes accepted by OFD normalization. */
export type OFDFontInput = Uint8Array | ArrayBuffer;

/** Font containers accepted at the browser/Node export boundary. */
type OFDFontInputType = "otf" | "ttf" | "woff" | "woff2";

/**
 * Converts one browser or desktop font container into standalone sfnt bytes.
 *
 * TTF and OTF inputs are copied. WOFF uses `fonteditor-core`; WOFF2 uses the
 * maintained third-party WASM decoder. Every result is independently reopened
 * before it is returned.
 *
 * @param data - Complete TTF, OTF, WOFF, or WOFF2 bytes.
 * @returns Independent standalone TTF or OTF bytes.
 */
export async function normalizeOFDFont(
  data: OFDFontInput
): Promise<Uint8Array> {
  const source = copyFontBytes(data);
  const type = detectFontInputType(source);
  if (type === undefined) {
    throw new TypeError(
      "OFD font normalization requires complete TTF, OTF, WOFF, or WOFF2 bytes."
    );
  }

  let normalized: Uint8Array;
  try {
    if (type === "ttf" || type === "otf") {
      normalized = source;
    } else if (type === "woff2") {
      normalized = await decompressWoff2(source);
    } else {
      const font = createFont(toArrayBuffer(source), {
        type: "woff",
        hinting: false,
        kerning: false,
        compound2simple: true
      });
      normalized = copyFontBytes(font.write({
        type: "ttf",
        toBuffer: false,
        hinting: false,
        kerning: false
      }) as ArrayBuffer | Uint8Array);
    }
  } catch (error) {
    throw new TypeError(`The OFD ${type.toUpperCase()} font could not be normalized.`, {
      cause: error
    });
  }

  validateStandaloneFont(normalized);
  return normalized;
}

/**
 * Decompresses a WOFF2 transport face with the browser-safe WASM entry point.
 *
 * The dynamic import defers WASM initialization until an authored WOFF2 face
 * is actually requested. This entry point works in both browsers and Node and
 * resolves even when the runtime initialized before the caller attached work.
 *
 * @param data - Complete WOFF2 bytes.
 * @returns Independent standalone sfnt bytes.
 */
async function decompressWoff2(data: Uint8Array): Promise<Uint8Array> {
  const { default: decompress } = await import("woff2-encoder/decompress");
  return new Uint8Array(await decompress(data));
}

/**
 * Combines installed Unicode shards belonging to one physical face.
 *
 * @param assets - Complete face assets in deterministic provider order.
 * @returns One independently readable sfnt face covering the union of shards.
 */
export async function mergeOFDFontFaces(
  assets: Iterable<OFDFontInput>
): Promise<Uint8Array> {
  const normalized: Uint8Array[] = [];
  for (const asset of assets) {
    normalized.push(await normalizeOFDFont(asset));
  }
  if (normalized.length === 0) {
    throw new TypeError("OFD font merging requires at least one face asset.");
  }
  if (normalized.length === 1) return normalized[0]!;

  let encoded: ArrayBuffer | Uint8Array;
  try {
    const base = readEditableFont(normalized[0]!);
    // All inputs are assets of one installed face. Preserve their common em
    // scale while unioning Unicode-addressable glyphs in provider order.
    for (const shard of normalized.slice(1)) {
      base.merge(readEditableFont(shard), { scale: 1 });
    }
    deduplicateMergedUnicodeMappings(base);
    encoded = base.write({
      type: "ttf",
      toBuffer: false,
      hinting: false,
      kerning: false
    }) as ArrayBuffer | Uint8Array;
  } catch (error) {
    throw new TypeError("The installed OFD font shards could not be merged.", {
      cause: error
    });
  }

  const merged = copyFontBytes(encoded);
  validateStandaloneFont(merged);
  return merged;
}

/**
 * Removes repeated cmap assignments introduced by same-face shard merging.
 *
 * Google Fonts CJK shards repeat a small shared glyph set such as `A`, `B`,
 * and `C` even though their declared CSS Unicode ranges are otherwise
 * disjoint. `fonteditor-core` correctly rejects a font when two glyph records
 * claim the same scalar, so the first deterministic shard keeps each mapping
 * and later shard mappings become unencoded glyphs. The renderer's
 * final Unicode subset removes those unreferenced outlines.
 *
 * @param font - Merged editable face in provider order.
 */
function deduplicateMergedUnicodeMappings(
  font: ReturnType<typeof createFont>
): void {
  const seen = new Set<number>();
  for (const glyph of font.get().glyf) {
    if (!glyph.unicode) continue;
    glyph.unicode = glyph.unicode.filter((codePoint) => {
      if (seen.has(codePoint)) return false;
      seen.add(codePoint);
      return true;
    });
  }
}

/**
 * Reads one normalized face into the editable font representation.
 *
 * @param data - Normalized standalone bytes.
 * @returns Editable font.
 */
function readEditableFont(data: Uint8Array) {
  const type = detectFontInputType(data);
  if (type !== "ttf" && type !== "otf") {
    throw new TypeError("Normalized OFD font is not an sfnt face.");
  }
  return createFont(toArrayBuffer(data), {
    type,
    hinting: false,
    kerning: false,
    compound2simple: true
  });
}

/**
 * Reopens normalized bytes with an independent parser.
 *
 * @param data - Candidate standalone sfnt bytes.
 */
function validateStandaloneFont(data: Uint8Array): void {
  const type = detectFontInputType(data);
  if (type !== "ttf" && type !== "otf") {
    throw new TypeError("Normalized OFD font is not standalone TTF or OTF.");
  }

  let parsed: Font | FontCollection;
  try {
    parsed = create(data as unknown as Parameters<typeof create>[0]);
  } catch (error) {
    throw new TypeError("Normalized OFD font cannot be reopened.", {
      cause: error
    });
  }
  if ("fonts" in parsed) {
    throw new TypeError("Normalized OFD font unexpectedly contains a collection.");
  }
}

/**
 * Detects a supported font container from its byte signature.
 *
 * @param data - Candidate complete font bytes.
 * @returns Input container, or undefined.
 */
function detectFontInputType(
  data: Uint8Array
): OFDFontInputType | undefined {
  if (matchesSignature(data, [0x00, 0x01, 0x00, 0x00])) return "ttf";
  if (matchesSignature(data, [0x4f, 0x54, 0x54, 0x4f])) return "otf";
  if (matchesSignature(data, [0x77, 0x4f, 0x46, 0x46])) return "woff";
  if (matchesSignature(data, [0x77, 0x4f, 0x46, 0x32])) return "woff2";
  return undefined;
}

/**
 * Matches one leading byte signature.
 *
 * @param data - Candidate bytes.
 * @param signature - Required leading bytes.
 * @returns Whether every signature byte matches.
 */
function matchesSignature(
  data: Uint8Array,
  signature: readonly number[]
): boolean {
  return signature.every((value, index) => data[index] === value);
}

/**
 * Copies caller-owned font bytes.
 *
 * @param data - Candidate byte storage.
 * @returns Independent byte array.
 */
function copyFontBytes(data: OFDFontInput): Uint8Array {
  return data instanceof Uint8Array
    ? new Uint8Array(data)
    : new Uint8Array(data.slice(0));
}

/**
 * Creates an exact ArrayBuffer for a byte view.
 *
 * @param data - Font byte view.
 * @returns Exact independent buffer.
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;
}
