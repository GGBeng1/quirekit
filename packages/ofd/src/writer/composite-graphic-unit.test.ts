import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OFDDocument } from "../document";

const fontBytes = Uint8Array.of(0x00, 0x01, 0x00, 0x00, 0x51, 0x4b);
const pngBytes = Uint8Array.of(
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a
);

describe("OFD composite graphic units", describeOFDCompositeGraphicUnits);

/** Defines composite-resource serialization and ownership coverage. */
function describeOFDCompositeGraphicUnits(): void {
  it("writes composite resources and page references with shared IDs", testCompositeSerialization);
  it("rejects foreign composite thumbnails and invalid dimensions", testCompositeValidation);
}

/** Verifies composite content, thumbnail, DrawParam, and page references close. */
async function testCompositeSerialization(): Promise<void> {
  const document = OFDDocument.create();
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const image = document.embedImage(pngBytes);
  const drawParam = document.registerDrawParam({ lineWidth: 0.5 });
  const composite = document.registerCompositeGraphicUnit({
    height: 12,
    thumbnail: image,
    width: 24
  });
  composite.drawText("CG", {
    boundary: { x: 0, y: 0, width: 10, height: 4 },
    codes: [{ text: "CG", x: 0, y: 3, deltaX: [4] }],
    drawParam,
    font,
    size: 4
  });
  composite.addPageBlock().drawPath({
    boundary: { x: 1, y: 5, width: 8, height: 4 },
    commands: [{ type: "move", x: 0, y: 0 }, { type: "line", x: 8, y: 4 }],
    drawParam
  });
  const page = document.addPage({ width: 210, height: 297 });
  page.drawComposite(composite, {
    boundary: { x: 20, y: 30, width: 24, height: 12 },
    drawParam
  });

  const entries = unzipSync(await document.save());
  const documentRes = readEntry(entries, "Doc_0/DocumentRes.xml");
  const publicRes = readEntry(entries, "Doc_0/PublicRes.xml");
  const pageXml = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");

  expect(documentRes).toContain("<ofd:CompositeGraphicUnit");
  expect(documentRes).toContain('Width="24"');
  expect(documentRes).toContain('Height="12"');
  expect(documentRes).toContain("Thumbnail=");
  expect(documentRes).toContain("<ofd:PageBlock");
  expect(publicRes).toContain("<ofd:DrawParam");
  expect(pageXml).toContain("<ofd:CompositeObject");
  expect(pageXml).toContain("ResourceID=");
}

/** Verifies resource ownership and composite dimensions are validated. */
function testCompositeValidation(): void {
  const owner = OFDDocument.create();
  const foreign = OFDDocument.create();
  const foreignImage = foreign.embedImage(pngBytes);

  expect(() => owner.registerCompositeGraphicUnit({
    height: 10,
    thumbnail: foreignImage,
    width: 10
  })).toThrow("OFD resources cannot be shared across documents.");

  owner.registerCompositeGraphicUnit({ height: 10, width: Number.NaN });
  expect(owner.validate()).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "invalid-geometry",
      message: "OFD CompositeGraphicUnit has invalid Width or Height."
    })
  ]));
}

/**
 * Reads one required UTF-8 package entry.
 *
 * @param entries - Unpacked OFD entries.
 * @param path - Required package path.
 * @returns Entry text.
 */
function readEntry(entries: Record<string, Uint8Array>, path: string): string {
  const data = entries[path];
  if (!data) throw new Error(`Missing test fixture entry: ${path}`);
  return new TextDecoder().decode(data);
}
