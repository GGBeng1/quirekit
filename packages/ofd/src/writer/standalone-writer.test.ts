import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  createOFDArchive,
  OFDDocument,
  OFDValidationError,
  type OFDDocument as OFDDocumentType
} from "../index";

const decoder = new TextDecoder();
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});
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

describe("standalone OFD writer", describeStandaloneOfdWriter);

/** Defines focused package-level writer regression coverage. */
function describeStandaloneOfdWriter(): void {
  it("writes a minimal document whose package XML is parseable", testMinimalDocument);
  it("retains CJK text, literal spaces, and explicit DeltaX placement", testTextPlacement);
  it("preserves object-local clip geometry", testObjectLocalClips);
  it("closes font, image, and attachment resources inside the package", testResourceClosure);
  it("writes navigation, permission, and viewer-preference semantics", testDocumentSemantics);
  it("produces byte-identical output for an unchanged document", testDeterminism);
  it("rejects unsafe archive paths and invalid document models", testStrictValidation);
}

/**
 * Verifies the smallest valid document graph and XML parseability.
 *
 * @returns Promise resolved after package assertions complete.
 */
async function testMinimalDocument(): Promise<void> {
  const document = OFDDocument.create({
    metadata: { title: "Control\u0001safe" }
  });
  document.addPage({ width: 210, height: 297 });

  const entries = unzipSync(await document.save());

  expect(Object.keys(entries).sort()).toEqual([
    "Doc_0/Document.xml",
    "Doc_0/Pages/Page_0/Content.xml",
    "OFD.xml"
  ]);
  expect(readEntry(entries, "OFD.xml")).toContain("Doc_0/Document.xml");
  expect(readEntry(entries, "OFD.xml")).toMatch(
    /<ofd:DocID>[0-9a-f]{32}<\/ofd:DocID>/u
  );
  expect(readEntry(entries, "OFD.xml")).toContain("Control\\0001safe");
  expect(readEntry(entries, "Doc_0/Document.xml")).toContain(
    "<ofd:PhysicalBox>0 0 210 297</ofd:PhysicalBox>"
  );
  assertXmlEntriesParse(entries);
}

/**
 * Verifies that authored Unicode positioning does not rely on reader relayout.
 *
 * @returns Promise resolved after text XML assertions complete.
 */
async function testTextPlacement(): Promise<void> {
  const document = OFDDocument.create();
  const font = document.embedFont(fontBytes, { fontName: "Fixture CJK" });
  const page = document.addPage({ width: 210, height: 297 });
  page.drawText("你好 世界", {
    boundary: { x: 20, y: 30, width: 40, height: 8 },
    font,
    size: 4,
    codes: [{
      text: "你好 世界",
      x: 0,
      y: 4,
      deltaX: [4, 4, 2, 4]
    }],
    glyphTransforms: [{
      codePosition: 0,
      codeCount: 5,
      glyphs: [11, 12, 3, 13, 14]
    }],
    fillColor: { value: [0, 0, 0] }
  });

  const entries = unzipSync(await document.save());
  const pageXml = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");

  expect(pageXml).toContain('DeltaX="4 4 2 4"');
  expect(pageXml).toContain(
    '<ofd:CGTransform CodePosition="0" CodeCount="5" GlyphCount="5">'
  );
  expect(pageXml).toContain("<ofd:Glyphs>11 12 3 13 14</ofd:Glyphs>");
  expect(pageXml).toContain("你好 世界");
  expect(pageXml).not.toContain("\\0020");
  assertXmlEntriesParse(entries);
}

/**
 * Verifies clip coordinates remain local to the decorated graphic boundary.
 *
 * @returns Promise resolved after clip XML assertions complete.
 */
async function testObjectLocalClips(): Promise<void> {
  const document = OFDDocument.create();
  const font = document.embedFont(fontBytes, { fontName: "Fixture CJK" });
  const page = document.addPage({ width: 210, height: 297 });
  page.drawText("裁剪文字", {
    boundary: { x: 24, y: 36, width: 40, height: 8 },
    font,
    size: 4,
    codes: [{
      text: "裁剪文字",
      x: 0,
      y: 4,
      deltaX: [4, 4, 4]
    }],
    clips: [{
      boundary: { x: -4, y: -6, width: 64, height: 32 },
      commands: [
        { type: "move", x: 0, y: 0 },
        { type: "line", x: 64, y: 0 },
        { type: "line", x: 64, y: 32 },
        { type: "line", x: 0, y: 32 },
        { type: "close" }
      ]
    }]
  });

  const entries = unzipSync(await document.save());
  const pageXml = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");

  expect(pageXml).toMatch(
    /<ofd:TextObject ID="\d+" Boundary="24 36 40 8"/u
  );
  expect(pageXml).toContain('<ofd:Clips TransFlag="false">');
  expect(pageXml).toContain(
    '<ofd:Path Boundary="-4 -6 64 32" Stroke="false" Fill="true">'
  );
  assertXmlEntriesParse(entries);
}

/**
 * Verifies every declared binary resource has a document reference and entry.
 *
 * @returns Promise resolved after resource closure assertions complete.
 */
async function testResourceClosure(): Promise<void> {
  const document = createRichDocument();
  const entries = unzipSync(await document.save());

  expect(entries["Doc_0/Res/Fonts/font-0.ttf"]).toEqual(fontBytes);
  expect(entries["Doc_0/Res/Images/image-0.png"]).toEqual(pngBytes);
  expect(entries["Doc_0/Attachments/0-evidence.bin"]).toEqual(
    Uint8Array.of(1, 2, 3)
  );
  expect(readEntry(entries, "Doc_0/PublicRes.xml")).toContain(
    "Fonts/font-0.ttf"
  );
  expect(readEntry(entries, "Doc_0/DocumentRes.xml")).toContain(
    "Images/image-0.png"
  );
  expect(readEntry(entries, "Doc_0/Attachments.xml")).toContain(
    "Attachments/0-evidence.bin"
  );
  expect(readEntry(entries, "Doc_0/Attachments.xml")).toContain(
    'CreationDate="2026-07-28T04:34:56"'
  );
  expect(readEntry(entries, "Doc_0/Document.xml")).toContain(
    "Attachments.xml"
  );
  assertXmlEntriesParse(entries);
}

/**
 * Verifies document-level navigation and reader settings retain their values.
 *
 * @returns Promise resolved after semantic XML assertions complete.
 */
async function testDocumentSemantics(): Promise<void> {
  const document = createRichDocument();
  const entries = unzipSync(await document.save());
  const documentXml = readEntry(entries, "Doc_0/Document.xml");
  const entryXml = readEntry(entries, "OFD.xml");

  expect(documentXml).toContain('<ofd:Bookmarks>');
  expect(documentXml).toContain('Name="Start"');
  expect(documentXml).toContain('<ofd:Outlines>');
  expect(documentXml).toContain('Title="目录"');
  expect(documentXml).toContain('<ofd:Permissions>');
  expect(documentXml).toContain('<ofd:Edit>false</ofd:Edit>');
  expect(documentXml).toContain('Printable="true" Copies="2"');
  expect(documentXml).toContain('<ofd:VPreferences>');
  expect(documentXml).toContain('<ofd:PageMode>UseOutlines</ofd:PageMode>');
  expect(documentXml).toContain('<ofd:Zoom>1.25</ofd:Zoom>');
  expect(entryXml).toContain('<ofd:DocUsage>Magzine</ofd:DocUsage>');
  expect(entryXml).toContain('<ofd:CreationDate>2026-07-28</ofd:CreationDate>');
  expect(documentXml).toMatch(/Title="目录" Count="1"/u);
  assertXmlEntriesParse(entries);
}

/**
 * Verifies deterministic IDs, XML, resource paths, and ZIP metadata.
 *
 * @returns Promise resolved after byte comparison completes.
 */
async function testDeterminism(): Promise<void> {
  const document = createRichDocument();

  expect(await document.save()).toEqual(await document.save());
}

/**
 * Verifies untrusted archive paths and invalid models fail before emission.
 *
 * @returns Promise resolved after failure assertions complete.
 */
async function testStrictValidation(): Promise<void> {
  expect(() => createOFDArchive(new Map([
    ["../escape.xml", "not allowed"]
  ]))).toThrow('Unsafe OFD package path');
  expect(() => createOFDArchive(new Map([
    ["Doc_0\\escape.xml", "not allowed"]
  ]))).toThrow('Unsafe OFD package path');

  const document = OFDDocument.create();
  const page = document.addPage({ width: 210, height: 297 });
  const font = document.embedFont(undefined, { fontName: "Logical Font" });
  page.drawText("AB", {
    boundary: { x: 10, y: 10, width: 10, height: 4 },
    font,
    size: 4,
    codes: [{ text: "AB", x: 0, y: 3 }]
  });

  await expect(document.save()).rejects.toMatchObject({
    name: OFDValidationError.name,
    issues: [expect.objectContaining({ code: "invalid-text-placement" })]
  });

  const invalidMetadata = OFDDocument.create({
    metadata: {
      documentId: "not-a-uuid",
      creationDate: "2026-07-28T12:34:56"
    }
  });
  invalidMetadata.addPage({ width: 210, height: 297 });
  await expect(invalidMetadata.save()).rejects.toMatchObject({
    name: OFDValidationError.name,
    issues: expect.arrayContaining([
      expect.objectContaining({ code: "invalid-document-id" }),
      expect.objectContaining({ code: "invalid-date" })
    ])
  });
}

/**
 * Creates one document containing binary resources and document semantics.
 *
 * @returns Fully authored standalone OFD document.
 */
function createRichDocument(): OFDDocumentType {
  const document = OFDDocument.create({
    metadata: {
      documentId: "00000000000000000000000000000002",
      title: "OFD fixture",
      creationDate: "2026-07-28",
      modificationDate: "2026-07-29",
      usage: "Magzine"
    }
  });
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const image = document.embedImage(pngBytes);
  expect(document.embedFont(fontBytes, { fontName: "Fixture Sans" })).toBe(font);
  expect(document.embedImage(pngBytes)).toBe(image);
  const page = document.addPage({ width: 210, height: 297 });
  page.drawText("A", {
    boundary: { x: 10, y: 10, width: 8, height: 4 },
    font,
    size: 4,
    codes: [{ text: "A", x: 0, y: 3 }]
  });
  page.drawImage(image, {
    boundary: { x: 20, y: 20, width: 10, height: 10 }
  });
  document.addAttachment(Uint8Array.of(1, 2, 3), {
    name: "evidence.bin",
    format: "application/octet-stream",
    creationDate: "2026-07-28T12:34:56.789+08:00"
  });
  document.addBookmark({
    name: "Start",
    destination: { page, type: "XYZ", left: 10, top: 10, zoom: 1 }
  });
  document.addOutline({
    title: "目录",
    destination: { page, type: "FitH", top: 10 },
    expanded: true,
    children: [{
      title: "Child",
      destination: { page, type: "Fit" },
      children: [{ title: "Leaf", destination: { page, type: "Fit" } }]
    }]
  });
  document.setPermissions({ edit: false, export: true, print: true, printCopies: 2 });
  document.setViewerPreferences({
    pageMode: "UseOutlines",
    pageLayout: "OneColumn",
    zoomScale: 1.25
  });
  return document;
}

/**
 * Decodes a required UTF-8 package entry.
 *
 * @param entries - Unzipped OFD package entries.
 * @param path - Required archive path.
 * @returns Decoded entry text.
 */
function readEntry(entries: Record<string, Uint8Array>, path: string): string {
  const entry = entries[path];
  if (!entry) throw new Error(`Missing OFD fixture entry: ${path}`);
  return decoder.decode(entry);
}

/**
 * Parses every XML archive entry with an independent parser.
 *
 * @param entries - Unzipped OFD package entries.
 */
function assertXmlEntriesParse(entries: Record<string, Uint8Array>): void {
  for (const [path, entry] of Object.entries(entries)) {
    if (!path.endsWith(".xml")) continue;
    expect(() => parser.parse(strFromU8(entry)), path).not.toThrow();
  }
}
