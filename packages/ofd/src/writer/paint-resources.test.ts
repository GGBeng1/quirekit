import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OFDDocument } from "../index";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

describe("OFD color spaces and drawing parameters", describePaintResources);

/** Defines paint-resource serialization and ownership validation coverage. */
function describePaintResources(): void {
  it("writes device color spaces, palettes, inherited DrawParams, and references", testPaintResourceSerialization);
  it("reports foreign and malformed paint-resource references", testPaintResourceValidation);
}

/**
 * Verifies PublicRes paint resources and text, path, and image references.
 *
 * @returns Promise resolved after package assertions complete.
 */
async function testPaintResourceSerialization(): Promise<void> {
  const document = OFDDocument.create();
  const gray = document.registerColorSpace({
    type: "DeviceGray",
    palette: [[0], [255]]
  });
  const rgb = document.registerColorSpace({
    type: "DeviceRGB",
    bitsPerComponent: 8,
    palette: [[16, 32, 48], [64, 128, 255]]
  });
  const cmyk = document.registerColorSpace({
    type: "DeviceCMYK",
    palette: [[0, 0, 0, 255]]
  });
  const base = document.registerDrawParam({
    lineWidth: 0.25,
    lineJoin: "Round",
    lineCap: "Square",
    fillColor: { colorSpace: rgb, index: 1 },
    strokeColor: { colorSpace: cmyk, value: [1, 2, 3, 4], alpha: 200 }
  });
  const derived = document.registerDrawParam({
    relative: base,
    dashOffset: 1,
    dashPattern: [2, 1],
    miterLimit: 4,
    fillColor: { colorSpace: gray, value: [128] }
  });
  const font = document.embedFont(undefined, { fontName: "Fixture Sans" });
  const image = document.embedImage(Uint8Array.of(0x89, 0x50, 0x4e, 0x47));
  const page = document.addPage({ width: 100, height: 100 });
  page.drawText("T", {
    boundary: { x: 1, y: 1, width: 5, height: 5 },
    font,
    size: 4,
    codes: [{ text: "T", x: 0, y: 4 }],
    drawParam: base
  });
  page.drawPath({
    boundary: { x: 10, y: 1, width: 5, height: 5 },
    commands: [{ type: "move", x: 0, y: 0 }],
    drawParam: derived
  });
  page.drawImage(image, {
    boundary: { x: 20, y: 1, width: 5, height: 5 },
    drawParam: base
  });

  const entries = unzipSync(await document.save({ verify: false }));
  const publicResXml = readEntry(entries, "Doc_0/PublicRes.xml");
  const pageXml = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");
  const colorSpaceIds = collectAttributes(publicResXml, "ofd:ColorSpace", "ID");
  const drawParamIds = collectAttributes(publicResXml, "ofd:DrawParam", "ID");

  expect(publicResXml).toContain('Type="GRAY"');
  expect(publicResXml).toContain('Type="RGB" BitsPerComponent="8"');
  expect(publicResXml).toContain('Type="CMYK"');
  expect(publicResXml).toContain('<ofd:CV>64 128 255</ofd:CV>');
  expect(publicResXml).toContain(`Relative="${drawParamIds[0]}"`);
  expect(publicResXml).toContain(`Index="1" ColorSpace="${colorSpaceIds[1]}"`);
  expect(publicResXml).toContain(`ColorSpace="${colorSpaceIds[2]}" Alpha="200"`);
  expect(pageXml.match(new RegExp(`DrawParam="${drawParamIds[0]}"`, "gu"))).toHaveLength(2);
  expect(pageXml).toContain(`DrawParam="${drawParamIds[1]}"`);
  assertXmlEntriesParse(entries);
}

/**
 * Verifies resource ownership and palette component validation before writing.
 *
 * @returns Void because validation is synchronous.
 */
function testPaintResourceValidation(): void {
  const foreign = OFDDocument.create();
  const foreignDrawParam = foreign.registerDrawParam({});
  const document = OFDDocument.create();
  const invalidSpace = document.registerColorSpace({
    type: "DeviceCMYK",
    palette: [[0, 0, 0]]
  });
  document.registerDrawParam({
    fillColor: { colorSpace: invalidSpace, index: 1 }
  });
  const page = document.addPage({ width: 100, height: 100 });
  page.drawPath({
    boundary: { x: 1, y: 1, width: 5, height: 5 },
    commands: [{ type: "move", x: 0, y: 0 }],
    drawParam: foreignDrawParam
  });

  const codes = document.validate().map((issue) => issue.code);
  expect(codes).toContain("invalid-color");
  expect(codes).toContain("foreign-resource");
}

/**
 * Reads one required UTF-8 package entry.
 *
 * @param entries - Unzipped OFD package entries.
 * @param path - Required package path.
 * @returns Decoded entry text.
 */
function readEntry(entries: Record<string, Uint8Array>, path: string): string {
  const entry = entries[path];
  if (!entry) throw new Error(`Missing OFD package entry: ${path}`);
  return strFromU8(entry);
}

/**
 * Collects one attribute from matching XML elements in document order.
 *
 * @param xml - XML source text.
 * @param element - Qualified element name.
 * @param attribute - Required attribute name.
 * @returns Collected attribute values.
 */
function collectAttributes(
  xml: string,
  element: string,
  attribute: string
): readonly string[] {
  return [...xml.matchAll(new RegExp(
    `<${element}[^>]*\\b${attribute}="([^"]+)"`,
    "gu"
  ))].map((match) => match[1]!);
}

/**
 * Parses every XML entry through an independent XML parser.
 *
 * @param entries - Unzipped OFD package entries.
 */
function assertXmlEntriesParse(entries: Record<string, Uint8Array>): void {
  for (const [path, entry] of Object.entries(entries)) {
    if (!path.endsWith(".xml")) continue;
    expect(() => parser.parse(strFromU8(entry)), path).not.toThrow();
  }
}
