import { readFileSync } from "node:fs";
import { create } from "fontkit";
import { describe, expect, it } from "vitest";
import { subsetOFDFont } from "./index";

const dejavuBytes = readFixture(
  "../../../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf"
);
const notoHansBytes = readFixture(
  "../../../node_modules/@embedpdf/fonts-sc/fonts/NotoSansHans-Regular.otf"
);

describe("OFD font subsetting", () => {
  it("creates deterministic standalone TrueType bytes with intrinsic Unicode coverage", async () => {
    const text = "Café ™ ± ∑";
    const codePoints = Array.from(text, (character) =>
      character.codePointAt(0)!
    );

    const first = await subsetOFDFont(dejavuBytes, { codePoints });
    const second = await subsetOFDFont(dejavuBytes, {
      codePoints: [...codePoints].reverse()
    });
    const face = create(first as unknown as Parameters<typeof create>[0]);

    expect(first).toEqual(second);
    expect(first.byteLength).toBeLessThan(dejavuBytes.byteLength);
    expect(Array.from(first.slice(0, 4))).toEqual([0, 1, 0, 0]);
    const tableTags = readSfntTableTags(first);
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
    expect("fonts" in face).toBe(false);
    if ("fonts" in face) return;
    for (const codePoint of new Set(codePoints)) {
      expect(face.hasGlyphForCodePoint(codePoint)).toBe(true);
    }
    expect(face.hasGlyphForCodePoint("Ж".codePointAt(0)!)).toBe(false);
  });

  it("preserves CFF title outlines in a compact OpenType subset", async () => {
    const codePoints = Array.from(
      "组成部分注册会计师确认函 QuireKit ©™±∑∞",
      (character) => character.codePointAt(0)!
    );

    const subset = await subsetOFDFont(notoHansBytes, { codePoints });
    const sourceFace = create(
      notoHansBytes as unknown as Parameters<typeof create>[0]
    );
    const face = create(subset as unknown as Parameters<typeof create>[0]);

    expect(subset.byteLength).toBeLessThan(256 * 1024);
    expect(Array.from(subset.slice(0, 4))).toEqual([
      0x4f,
      0x54,
      0x54,
      0x4f
    ]);
    const tableTags = readSfntTableTags(subset);
    for (const tag of [
      "GPOS",
      "kern",
      "kerx"
    ]) {
      expect(tableTags).not.toContain(tag);
    }
    expect("fonts" in face).toBe(false);
    expect("fonts" in sourceFace).toBe(false);
    if ("fonts" in face || "fonts" in sourceFace) return;
    for (const codePoint of new Set(codePoints)) {
      expect(face.hasGlyphForCodePoint(codePoint)).toBe(true);
      expectGlyphToMatch(sourceFace, face, codePoint);
    }
    expect(face.hasGlyphForCodePoint("龘".codePointAt(0)!)).toBe(false);
  });

  it("rejects unsupported containers and invalid Unicode scalars", async () => {
    await expect(subsetOFDFont(Uint8Array.of(1, 2, 3), {
      codePoints: [65]
    })).rejects.toThrow(/TrueType or OpenType/u);
    await expect(subsetOFDFont(dejavuBytes, {
      codePoints: [0xd800]
    })).rejects.toThrow(/Unicode scalar/u);
    await expect(subsetOFDFont(dejavuBytes, {
      codePoints: []
    })).rejects.toThrow(/at least one code point/u);
  });
});

/**
 * Proves that subsetting changed only glyph identity, not visible geometry.
 *
 * @param source - Complete source face.
 * @param subset - Final standalone subset face.
 * @param codePoint - Demanded Unicode scalar.
 */
function expectGlyphToMatch(
  source: Exclude<ReturnType<typeof create>, { fonts: unknown }>,
  subset: Exclude<ReturnType<typeof create>, { fonts: unknown }>,
  codePoint: number
): void {
  const sourceGlyph = source.glyphForCodePoint(codePoint);
  const subsetGlyph = subset.glyphForCodePoint(codePoint);
  expect(subsetGlyph.id).not.toBe(0);
  expect(subsetGlyph.advanceWidth).toBe(sourceGlyph.advanceWidth);
  expect(subsetGlyph.bbox).toEqual(sourceGlyph.bbox);
  expect(subsetGlyph.path.commands).toEqual(sourceGlyph.path.commands);
}

/**
 * Loads one package-owned test font without introducing runtime filesystem use.
 *
 * @param relativePath - URL relative to this test module.
 * @returns Complete immutable fixture bytes.
 */
function readFixture(relativePath: string): Uint8Array {
  return Uint8Array.from(readFileSync(new URL(relativePath, import.meta.url)));
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
