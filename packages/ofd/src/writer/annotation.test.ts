import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OFDDocument, type OFDAnnotationType } from "../index";

const fontBytes = Uint8Array.of(0x00, 0x01, 0x00, 0x00);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

describe("OFD page annotations", describePageAnnotations);

/** Defines page-annotation archive and model regression coverage. */
function describePageAnnotations(): void {
  it("writes typed annotations, optional fields, and nested appearances", testAnnotationSerialization);
  it("validates required annotation metadata before serialization", testAnnotationValidation);
}

/**
 * Verifies the annotation index, stable per-page location, and static paint tree.
 *
 * @returns Promise resolved after package assertions complete.
 */
async function testAnnotationSerialization(): Promise<void> {
  const document = OFDDocument.create();
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const firstPage = document.addPage({ width: 100, height: 100 });
  const types: readonly OFDAnnotationType[] = [
    "Link",
    "Path",
    "Highlight",
    "Stamp",
    "Watermark"
  ];
  for (const [index, type] of types.entries()) {
    const annotation = firstPage.addAnnotation({
      type,
      creator: "QuireKit",
      lastModDate: "2026-07-28",
      boundary: { x: index * 10, y: 2, width: 8, height: 6 },
      subtype: `${type}-fixture`,
      visible: index % 2 === 0,
      print: true,
      noZoom: true,
      noRotate: false,
      readOnly: true,
      remark: `${type} remark`,
      parameters: { target: `page-${index}`, role: "fixture" }
    });
    if (type === "Highlight") {
      annotation.addPageBlock().drawText("注", {
        boundary: { x: 1, y: 1, width: 4, height: 4 },
        font,
        size: 4,
        codes: [{ text: "注", x: 0, y: 4 }]
      });
    }
  }
  document.addPage({ width: 100, height: 100 });

  const entries = unzipSync(await document.save());
  const documentXml = readEntry(entries, "Doc_0/Document.xml");
  const annotationsXml = readEntry(entries, "Doc_0/Annotations.xml");
  const pageAnnotationsXml = readEntry(entries, "Doc_0/Annots/Page_0.xml");

  expect(documentXml).toContain("<ofd:Annotations>Annotations.xml</ofd:Annotations>");
  expect(annotationsXml).toContain('PageID="2"');
  expect(annotationsXml).toContain("Annots/Page_0.xml");
  expect(entries["Doc_0/Annots/Page_1.xml"]).toBeUndefined();
  expect(pageAnnotationsXml.match(/<ofd:Annot /gu)).toHaveLength(5);
  for (const type of types) expect(pageAnnotationsXml).toContain(`Type="${type}"`);
  expect(pageAnnotationsXml).toContain('Creator="QuireKit"');
  expect(pageAnnotationsXml).toContain('LastModDate="2026-07-28"');
  expect(pageAnnotationsXml).toContain('Boundary="20 2 8 6"');
  expect(pageAnnotationsXml).toContain('<ofd:Remark>Highlight remark</ofd:Remark>');
  expect(pageAnnotationsXml).toContain('<ofd:Parameter Name="target">page-2</ofd:Parameter>');
  expect(pageAnnotationsXml).toContain("<ofd:Appearance");
  expect(pageAnnotationsXml).toMatch(/<ofd:PageBlock\b/u);
  expect(pageAnnotationsXml).toContain("注");
  const ids = collectIds([
    documentXml,
    pageAnnotationsXml,
    readEntry(entries, "Doc_0/Pages/Page_0/Content.xml"),
    readEntry(entries, "Doc_0/Pages/Page_1/Content.xml")
  ]);
  expect(ids).toHaveLength(new Set(ids).size);
  expect(Math.max(...ids)).toBe(Number(readElementText(documentXml, "ofd:MaxUnitID")));
  assertXmlEntriesParse(entries);
}

/**
 * Verifies malformed annotation metadata is reported through normal validation.
 *
 * @returns Void because validation is synchronous.
 */
function testAnnotationValidation(): void {
  const document = OFDDocument.create();
  const page = document.addPage({ width: 100, height: 100 });
  page.addAnnotation({
    type: "Link",
    creator: "",
    lastModDate: "not-a-date",
    boundary: { x: 0, y: 0, width: 0, height: 1 }
  });

  expect(document.validate().map((issue) => issue.code)).toEqual([
    "invalid-annotation",
    "invalid-annotation",
    "invalid-date"
  ]);
}

/**
 * Reads a required UTF-8 package entry.
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
 * Collects all numeric `ID` attributes from XML documents.
 *
 * @param documents - XML source texts.
 * @returns Ordered numeric identifier values.
 */
function collectIds(documents: readonly string[]): readonly number[] {
  return documents.flatMap((document) =>
    [...document.matchAll(/\bID="(\d+)"/gu)].map((match) => Number(match[1]))
  );
}

/**
 * Reads required text content from a simple element.
 *
 * @param xml - XML source text.
 * @param element - Qualified element name.
 * @returns Element text content.
 */
function readElementText(xml: string, element: string): string {
  const match = xml.match(new RegExp(`<${element}>([^<]+)</${element}>`, "u"));
  if (!match?.[1]) throw new Error(`Missing ${element} text.`);
  return match[1];
}

/**
 * Parses every XML entry with an independent XML parser.
 *
 * @param entries - Unzipped OFD package entries.
 */
function assertXmlEntriesParse(entries: Record<string, Uint8Array>): void {
  for (const [path, entry] of Object.entries(entries)) {
    if (!path.endsWith(".xml")) continue;
    expect(() => parser.parse(strFromU8(entry)), path).not.toThrow();
  }
}
