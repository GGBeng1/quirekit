import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OFDDocument } from "../document";
import {
  createOFDTextCode,
  measureOFDText
} from "./layout";

const require = createRequire(import.meta.url);

describe("OFD embedded-font text layout", () => {
  it("derives mixed-script DeltaX values from real code-point advances", () => {
    const bytes = loadNotoSansHansBytes();
    const document = OFDDocument.create();
    const font = document.embedFont(bytes, { fontName: "Noto Sans Hans" });
    const text = "A中 B、©™±∑∞";
    const measurement = measureOFDText(text, font, { size: 8 });
    const code = createOFDTextCode(text, font, {
      x: 1,
      y: 9,
      size: 8
    });

    expect(measurement.advances).toHaveLength(Array.from(text).length);
    expect(code.deltaX).toHaveLength(Array.from(text).length - 1);
    expect(code.deltaX?.[0]).toBeCloseTo(4.856);
    expect(code.deltaX?.[1]).toBeCloseTo(8);
    expect(code.deltaX?.[2]).toBeCloseTo(1.792);
    expect(new Set(code.deltaX).size).toBeGreaterThan(1);
    expect(measurement.width).toBeGreaterThan(60);
  });

  it("keeps Unicode code-point counts and authored letter spacing", () => {
    const bytes = loadNotoSansHansBytes();
    const document = OFDDocument.create();
    const font = document.embedFont(bytes, { fontName: "Noto Sans Hans" });
    const code = createOFDTextCode("中 A", font, {
      x: 0,
      y: 5,
      size: 5,
      letterSpacing: -0.25
    });

    expect(code.deltaX?.[0]).toBeCloseTo(4.75);
    expect(code.deltaX?.[1]).toBeCloseTo(0.87);
  });

  it("rejects logical fonts and missing glyphs instead of inventing spacing", () => {
    const bytes = loadNotoSansHansBytes();
    const document = OFDDocument.create();
    const embedded = document.embedFont(bytes, { fontName: "Noto Sans Hans" });
    const logical = document.embedFont(undefined, { fontName: "Logical Sans" });

    expect(() => measureOFDText("A", logical, { size: 5 }))
      .toThrow("requires explicit TextCode placement");
    expect(() => measureOFDText("😀", embedded, { size: 5 }))
      .toThrow("does not contain U+1F600");
  });

  it("lets drawText derive explicit placement without caller-written deltas", async () => {
    const bytes = loadNotoSansHansBytes();
    const document = OFDDocument.create();
    const font = document.embedFont(bytes, { fontName: "Noto Sans Hans" });
    const page = document.addPage({ width: 210, height: 297 });
    page.drawText("A中 B", {
      boundary: { x: 20, y: 20, width: 60, height: 10 },
      font,
      size: 8,
      origin: { x: 0, y: 8 }
    });

    const entries = unzipSync(await document.save());
    const pageXml = new TextDecoder().decode(
      entries["Doc_0/Pages/Page_0/Content.xml"]
    );

    expect(pageXml).toContain(
      'DeltaX="4.856 8 1.792"'
    );
  });
});

/**
 * Loads the OFL-licensed Simplified Chinese font fixture.
 *
 * @returns Complete OpenType font bytes.
 */
function loadNotoSansHansBytes(): Uint8Array {
  const packageEntry = require.resolve("@embedpdf/fonts-sc");
  return readFileSync(resolve(
    dirname(packageEntry),
    "../fonts/NotoSansHans-Regular.otf"
  ));
}
