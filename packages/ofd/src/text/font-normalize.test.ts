import { readFileSync } from "node:fs";
import { createFont } from "fonteditor-core";
import { create } from "fontkit";
import * as wawoff2 from "wawoff2";
import { describe, expect, it } from "vitest";
import {
  mergeOFDFontFaces,
  normalizeOFDFont
} from "./font-normalize";

const dejavuBytes = readFixture(
  "../../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf"
);

describe("OFD font normalization", () => {
  it("copies sfnt bytes and converts WOFF plus WOFF2 into standalone fonts", async () => {
    const ttf = await normalizeOFDFont(dejavuBytes);
    const woff = await normalizeOFDFont(createContainer("woff", [65, 66]));
    const woff2 = await normalizeOFDFont(
      await wawoff2.compress(createContainer("ttf", [67, 68]))
    );

    expect(ttf).not.toBe(dejavuBytes);
    expect(ttf).toEqual(dejavuBytes);
    expectStandaloneCoverage(woff, [65, 66]);
    expectStandaloneCoverage(woff2, [67, 68]);
    expectCompactFontTables(woff);
  });

  it("deduplicates overlapping cmap mappings while merging face shards", async () => {
    const latin = createContainer("woff", [65, 66]);
    const symbols = await wawoff2.compress(
      createContainer("ttf", [65, 0x2122])
    );
    const merged = await mergeOFDFontFaces([latin, symbols]);

    expectStandaloneCoverage(merged, [65, 66, 0x2122]);
    expectUniqueUnicodeMappings(merged);
    expectCompactFontTables(merged);
  });

  it("rejects empty input and unsupported containers", async () => {
    await expect(normalizeOFDFont(Uint8Array.of(1, 2, 3)))
      .rejects.toThrow(/TTF, OTF, WOFF, or WOFF2/u);
    await expect(mergeOFDFontFaces([]))
      .rejects.toThrow(/at least one face asset/u);
  });
});

/**
 * Creates a small container with only the requested Unicode glyphs.
 *
 * @param type - Output font container.
 * @param codePoints - Unicode scalars retained in the fixture.
 * @returns Encoded font bytes.
 */
function createContainer(
  type: "ttf" | "woff",
  codePoints: readonly number[]
): Uint8Array {
  const font = createFont(toArrayBuffer(dejavuBytes), {
    type: "ttf",
    subset: [...codePoints],
    hinting: true,
    kerning: true,
    compound2simple: false
  });
  const tables = font.get() as Record<string, unknown>;
  delete tables.GPOS;
  delete tables.kern;
  delete tables.kerx;
  const data = font.write({
    type,
    toBuffer: false,
    hinting: true,
    kerning: true
  });
  return data instanceof Uint8Array
    ? data
    : new Uint8Array(data as ArrayBuffer);
}

/**
 * Asserts that a normalized font is independently readable.
 *
 * @param data - Candidate standalone sfnt bytes.
 * @param codePoints - Required Unicode coverage.
 */
function expectStandaloneCoverage(
  data: Uint8Array,
  codePoints: readonly number[]
): void {
  const font = create(data as unknown as Parameters<typeof create>[0]);
  expect("fonts" in font).toBe(false);
  if ("fonts" in font) return;
  for (const codePoint of codePoints) {
    expect(font.hasGlyphForCodePoint(codePoint)).toBe(true);
  }
}

/**
 * Asserts that an editable normalization result uses the compact table policy.
 *
 * @param data - Candidate standalone sfnt bytes.
 */
function expectCompactFontTables(data: Uint8Array): void {
  const tableTags = readSfntTableTags(data);
  for (const tag of [
    "cvt ",
    "fpgm",
    "gasp",
    "prep"
  ]) {
    expect(tableTags).not.toContain(tag);
  }
  for (const tag of [
    "GPOS",
    "kern",
    "kerx"
  ]) {
    expect(tableTags).not.toContain(tag);
  }
}

/**
 * Asserts that every encoded scalar belongs to only one glyph record.
 *
 * @param data - Candidate standalone font bytes.
 */
function expectUniqueUnicodeMappings(data: Uint8Array): void {
  const font = createFont(toArrayBuffer(data), {
    type: "ttf",
    compound2simple: true
  });
  const seen = new Set<number>();
  for (const glyph of font.get().glyf) {
    for (const codePoint of glyph.unicode ?? []) {
      expect(seen.has(codePoint), `duplicate U+${codePoint.toString(16)}`)
        .toBe(false);
      seen.add(codePoint);
    }
  }
}

/**
 * Creates an exact ArrayBuffer for one font byte view.
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

/**
 * Reads the top-level sfnt table-directory tags from one encoded font.
 *
 * @param data - Standalone TrueType bytes.
 * @returns Table tags in encoded directory order.
 */
function readSfntTableTags(data: Uint8Array): string[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint16(4, false);
  return Array.from({ length: count }, (_, index) => {
    const offset = 12 + index * 16;
    return String.fromCharCode(
      data[offset]!,
      data[offset + 1]!,
      data[offset + 2]!,
      data[offset + 3]!
    );
  });
}

/**
 * Loads one package-owned test font.
 *
 * @param relativePath - URL relative to this test module.
 * @returns Complete immutable fixture bytes.
 */
function readFixture(relativePath: string): Uint8Array {
  return Uint8Array.from(readFileSync(new URL(relativePath, import.meta.url)));
}
