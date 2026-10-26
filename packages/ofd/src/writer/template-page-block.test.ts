import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OFDDocument } from "../index";

const fontBytes = Uint8Array.of(0x00, 0x01, 0x00, 0x00);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

describe("OFD template pages and nested page blocks", describeTemplatePagesAndBlocks);

/** Defines focused template-page and recursive PageBlock regression coverage. */
function describeTemplatePagesAndBlocks(): void {
  it("writes shared template content and ordered per-page references", testTemplatePages);
  it("assigns one document-wide ID sequence through nested page blocks", testNestedPageBlockIds);
}

/**
 * Verifies common-data template declarations and page-local Template references.
 *
 * @returns Promise resolved after package assertions complete.
 */
async function testTemplatePages(): Promise<void> {
  const document = OFDDocument.create({
    metadata: { documentId: "00000000000000000000000000000003" }
  });
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const template = document.addTemplatePage({
    width: 210,
    height: 297,
    name: "Letterhead",
    zOrder: "Background"
  });
  template.drawText("模板", {
    boundary: { x: 10, y: 10, width: 20, height: 5 },
    font,
    size: 4,
    codes: [{ text: "模板", x: 0, y: 4, deltaX: [4] }]
  });
  const page = document.addPage({ width: 210, height: 297 });
  page.addTemplate(template, { zOrder: "Foreground" });
  page.drawText("正文", {
    boundary: { x: 20, y: 20, width: 20, height: 5 },
    font,
    size: 4,
    codes: [{ text: "正文", x: 0, y: 4, deltaX: [4] }]
  });

  const entries = unzipSync(await document.save());
  const documentXml = readEntry(entries, "Doc_0/Document.xml");
  const pageXml = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");
  const templateXml = readEntry(entries, "Doc_0/Tpls/Template_0/Content.xml");
  const templateId = readAttribute(documentXml, "ofd:TemplatePage", "ID");

  expect(documentXml).toContain(
    `BaseLoc="Tpls/Template_0/Content.xml"`
  );
  expect(documentXml).toContain('Name="Letterhead" ZOrder="Background"');
  expect(templateXml).toContain("模板");
  expect(pageXml).toContain(`TemplateID="${templateId}" ZOrder="Foreground"`);
  expect(pageXml.indexOf("<ofd:Template")).toBeLessThan(pageXml.indexOf("<ofd:Area"));
  expect(pageXml.indexOf("<ofd:Area")).toBeLessThan(pageXml.indexOf("<ofd:Content"));
  assertXmlEntriesParse(entries);
}

/**
 * Verifies nested PageBlock serialization and shared document-wide ID allocation.
 *
 * @returns Promise resolved after identifier assertions complete.
 */
async function testNestedPageBlockIds(): Promise<void> {
  const document = OFDDocument.create();
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const template = document.addTemplatePage({ width: 100, height: 100 });
  const templateBlock = template.addLayer().addPageBlock();
  templateBlock.drawText("T", {
    boundary: { x: 1, y: 1, width: 5, height: 5 },
    font,
    size: 4,
    codes: [{ text: "T", x: 0, y: 4 }]
  });
  const page = document.addPage({ width: 100, height: 100 });
  page.addTemplate(template);
  const firstBlock = page.addPageBlock();
  const nestedBlock = firstBlock.addPageBlock();
  nestedBlock.drawText("B", {
    boundary: { x: 2, y: 2, width: 5, height: 5 },
    font,
    size: 4,
    codes: [{ text: "B", x: 0, y: 4 }]
  });

  const entries = unzipSync(await document.save());
  const documentXml = readEntry(entries, "Doc_0/Document.xml");
  const pageXml = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");
  const templateXml = readEntry(entries, "Doc_0/Tpls/Template_0/Content.xml");
  const allocated = collectObjectIds([documentXml, pageXml, templateXml]);
  const maximum = Number(readElementText(documentXml, "ofd:MaxUnitID"));

  expect(pageXml.match(/<ofd:PageBlock\b/gu)).toHaveLength(2);
  expect(templateXml.match(/<ofd:PageBlock\b/gu)).toHaveLength(1);
  expect(allocated).toHaveLength(new Set(allocated).size);
  expect(Math.max(...allocated)).toBe(maximum);
  expect(allocated.every((id) => id > 0 && id <= maximum)).toBe(true);
  assertXmlEntriesParse(entries);
}

/**
 * Reads one UTF-8 package entry.
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
 * Reads one required XML attribute from a tagged element.
 *
 * @param xml - XML source text.
 * @param element - Qualified element name.
 * @param attribute - Required attribute name.
 * @returns Attribute value.
 */
function readAttribute(xml: string, element: string, attribute: string): string {
  const match = xml.match(new RegExp(`<${element}[^>]*\\b${attribute}="([^"]+)"`, "u"));
  if (!match?.[1]) throw new Error(`Missing ${attribute} on ${element}.`);
  return match[1];
}

/**
 * Reads one required single-text XML element.
 *
 * @param xml - XML source text.
 * @param element - Qualified element name.
 * @returns Element text value.
 */
function readElementText(xml: string, element: string): string {
  const match = xml.match(new RegExp(`<${element}>([^<]+)</${element}>`, "u"));
  if (!match?.[1]) throw new Error(`Missing ${element} text.`);
  return match[1];
}

/**
 * Collects declared `ID` values from document, page, and template XML files.
 *
 * @param xmlDocuments - XML source texts to inspect.
 * @returns Numeric identifiers declared through `ID` attributes.
 */
function collectObjectIds(xmlDocuments: readonly string[]): readonly number[] {
  return xmlDocuments.flatMap((xml) =>
    [...xml.matchAll(/\bID="(\d+)"/gu)].map((match) => Number(match[1]))
  );
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
