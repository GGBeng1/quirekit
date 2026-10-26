import { XMLParser } from "fast-xml-parser";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OFDDocument, type OFDDocumentOpenAction } from "../index";

const fontBytes = Uint8Array.of(0x00, 0x01, 0x00, 0x00);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

describe("OFD typed actions", describeTypedActions);

/** Defines action serialization and ownership validation coverage. */
function describeTypedActions(): void {
  it("writes page, graphic, and outline actions with resolved IDs", testActionSerialization);
  it("reports invalid action targets through standard validation", testActionValidation);
  it("writes only typed document-open actions in standard document order", testDocumentOpenActions);
}

/**
 * Verifies every supported target and its owning XML action context.
 *
 * @returns Promise resolved after package assertions complete.
 */
async function testActionSerialization(): Promise<void> {
  const document = OFDDocument.create();
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const attachment = document.addAttachment(Uint8Array.of(1, 2, 3), {
    name: "fixture.txt",
    format: "text/plain"
  });
  const firstPage = document.addPage({ width: 100, height: 100 });
  const secondPage = document.addPage({ width: 100, height: 100 });
  document.addBookmark({
    name: "target-bookmark",
    destination: { page: secondPage, left: 4, top: 5 }
  });
  firstPage.addAction({
    type: "goto",
    destination: { page: secondPage, type: "FitR", left: 1, top: 2, zoom: 2 }
  });
  firstPage.drawPath({
    boundary: { x: 1, y: 1, width: 10, height: 10 },
    commands: [
      { type: "move", x: 0, y: 0 },
      { type: "line", x: 10, y: 10 }
    ],
    actions: [
      { type: "uri", uri: "guide.html", base: "https://example.test/ofd/" },
      { type: "goto-attachment", attachment, newWindow: true }
    ]
  });
  secondPage.drawText("书签", {
    boundary: { x: 2, y: 2, width: 10, height: 5 },
    font,
    size: 4,
    codes: [{ text: "书签", x: 0, y: 4, deltaX: [4] }],
    actions: [{ type: "goto-bookmark", bookmark: "target-bookmark" }]
  });
  document.addOutline({
    title: "Action outline",
    actions: [{ type: "uri", uri: "https://example.test/outline" }]
  });

  const entries = unzipSync(await document.save({ verify: false }));
  const documentXml = readEntry(entries, "Doc_0/Document.xml");
  const firstPageXml = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");
  const secondPageXml = readEntry(entries, "Doc_0/Pages/Page_1/Content.xml");
  const targetPageId = readAttribute(documentXml, "ofd:Page", "ID", 1);
  const attachmentId = readAttribute(
    readEntry(entries, "Doc_0/Attachments.xml"),
    "ofd:Attachment",
    "ID"
  );

  expect(firstPageXml).toContain('<ofd:Action Event="PO">');
  expect(firstPageXml).toContain(`Type="FitR" PageID="${targetPageId}"`);
  expect(firstPageXml).toContain("<ofd:Left>1</ofd:Left>");
  expect(firstPageXml).toContain("<ofd:Zoom>2</ofd:Zoom>");
  expect(firstPageXml).toContain('<ofd:Action Event="CLICK">');
  expect(firstPageXml).toContain('URI="guide.html" Base="https://example.test/ofd/"');
  expect(firstPageXml).toContain(`AttachID="${attachmentId}" NewWindow="true"`);
  expect(secondPageXml).toContain('<ofd:Bookmark Name="target-bookmark"/>');
  expect(documentXml).toContain('URI="https://example.test/outline"');
  assertXmlEntriesParse(entries);
}

/**
 * Verifies foreign and missing action targets are rejected before serialization.
 *
 * @returns Void because validation is synchronous.
 */
function testActionValidation(): void {
  const foreign = OFDDocument.create();
  const foreignPage = foreign.addPage({ width: 100, height: 100 });
  const foreignAttachment = foreign.addAttachment(Uint8Array.of(1), {
    name: "foreign.bin"
  });
  const document = OFDDocument.create();
  const page = document.addPage({ width: 100, height: 100 });
  page.addAction({ type: "goto", destination: { page: foreignPage } });
  page.addAction({ type: "goto-bookmark", bookmark: "missing" });
  page.drawPath({
    boundary: { x: 1, y: 1, width: 10, height: 10 },
    commands: [{ type: "move", x: 0, y: 0 }],
    actions: [
      { type: "uri", uri: "" },
      { type: "goto-attachment", attachment: foreignAttachment }
    ]
  });

  expect(document.validate().map((issue) => issue.code)).toEqual([
    "foreign-page",
    "invalid-action",
    "invalid-action",
    "foreign-resource"
  ]);
}

/**
 * Verifies document-open actions own the `DO` event and reject raw context
 * fields or unsupported target kinds.
 *
 * @returns Promise resolved after package assertions complete.
 */
async function testDocumentOpenActions(): Promise<void> {
  const foreign = OFDDocument.create();
  const foreignPage = foreign.addPage({ width: 100, height: 100 });
  const document = OFDDocument.create();
  const page = document.addPage({ width: 100, height: 100 });
  document.addBookmark({ name: "target", destination: { page } });
  document.setPermissions({ edit: false });
  document.setOpenActions([
    { type: "goto", destination: { page, type: "Fit" } },
    { type: "goto-bookmark", bookmark: "target" }
  ]);
  document.setViewerPreferences({ zoomMode: "FitWidth" });

  const entries = unzipSync(await document.save({ verify: false }));
  const xml = readEntry(entries, "Doc_0/Document.xml");
  expect(xml).toContain('<ofd:Action Event="DO">');
  expect(xml).toContain('<ofd:Dest Type="Fit" PageID="1"/>');
  expect(xml).toContain('<ofd:Bookmark Name="target"/>');
  expect(xml.indexOf("<ofd:Permissions>")).toBeLessThan(xml.indexOf("<ofd:Actions>"));
  expect(xml.indexOf("<ofd:Actions>")).toBeLessThan(xml.indexOf("<ofd:VPreferences>"));

  const invalid = OFDDocument.create();
  invalid.addPage({ width: 100, height: 100 });
  invalid.setOpenActions([
    { type: "goto", destination: { page: foreignPage } },
    { type: "goto-bookmark", bookmark: "missing" }
  ]);
  expect(invalid.validate().map((issue) => issue.code)).toEqual([
    "foreign-page",
    "invalid-action"
  ]);
  expect(() => document.setOpenActions([{
    type: "goto",
    destination: { page },
    event: "PO"
  } as unknown as OFDDocumentOpenAction])).toThrow("cannot set event");
  expect(() => document.setOpenActions([{
    type: "uri",
    uri: "https://example.test"
  } as unknown as OFDDocumentOpenAction])).toThrow("only goto and goto-bookmark");
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
 * Reads an attribute from a selected occurrence of one XML element.
 *
 * @param xml - XML source text.
 * @param element - Qualified element name.
 * @param attribute - Required attribute name.
 * @param occurrence - Zero-based matching element occurrence.
 * @returns Attribute value.
 */
function readAttribute(
  xml: string,
  element: string,
  attribute: string,
  occurrence = 0
): string {
  const matches = [...xml.matchAll(new RegExp(
    `<${element}[^>]*\\b${attribute}="([^"]+)"`,
    "gu"
  ))];
  const value = matches[occurrence]?.[1];
  if (!value) throw new Error(`Missing ${attribute} on ${element}.`);
  return value;
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
