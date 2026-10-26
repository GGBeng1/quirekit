import { unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  assertOFDPackage,
  createOFDArchive,
  OFDDocument,
  OFDPackageVerificationError,
  verifyOFDPackage
} from "../index";
import type { OFDPackageVerificationIssue } from "./types";
import { parseOFDPackageXmlEntries } from "./xml";

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

describe("OFD package verification", describeOFDPackageVerification);

/** Defines focused serialized-package verification coverage. */
function describeOFDPackageVerification(): void {
  it("accepts a complete document and closes all package references", testValidPackage);
  it("reports unresolved document and attachment locations", testLocationClosure);
  it("reports missing text and image resource references", testResourceReferences);
  it("rejects malformed document-open actions and unresolved targets", testDocumentOpenActionReferences);
  it("reports duplicate IDs and MaxUnitID mismatches", testIdDomain);
  it("accepts string IDs outside the ST_ID domain", testStringIdsOutsideStIdDomain);
  it("enforces declared archive entry and total unpacked limits", testArchiveEntryLimits);
  it("parses ordinary XML entities with restricted parser options", testSafeXmlEntityParsing);
  it("rejects unsafe ZIP entry paths and throws in strict mode", testArchiveSafetyAndStrictMode);
}

/**
 * Verifies that all entry-point, resource, page, and attachment links resolve.
 *
 * @returns Promise resolved after verifying a complete package.
 */
async function testValidPackage(): Promise<void> {
  const result = verifyOFDPackage(await createCompletePackage());

  expect(result).toMatchObject({ valid: true, issues: [] });
  expect(result.entryPaths).toEqual([
    "Doc_0/Attachments.xml",
    "Doc_0/Attachments/0-evidence.bin",
    "Doc_0/Document.xml",
    "Doc_0/DocumentRes.xml",
    "Doc_0/Pages/Page_0/Content.xml",
    "Doc_0/PublicRes.xml",
    "Doc_0/Res/Fonts/font-0.ttf",
    "Doc_0/Res/Images/image-0.png",
    "OFD.xml"
  ]);
}

/**
 * Verifies document-resource and attachment locations cannot escape or miss.
 *
 * @returns Promise resolved after checking invalid resource locations.
 */
async function testLocationClosure(): Promise<void> {
  const entries = unzipSync(await createCompletePackage());
  const documentXml = decodeRequired(entries, "Doc_0/Document.xml")
    .replace("PublicRes.xml", "missing-public-res.xml");
  const attachmentsXml = decodeRequired(entries, "Doc_0/Attachments.xml")
    .replace("Attachments/0-evidence.bin", "../escape.bin");
  const result = verifyOFDPackage(rebuildArchive(entries, {
    "Doc_0/Attachments.xml": attachmentsXml,
    "Doc_0/Document.xml": documentXml
  }));

  expect(result.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "location-missing" }),
    expect.objectContaining({ code: "location-invalid" })
  ]));
}

/**
 * Verifies text and image objects must reference declared resources.
 *
 * @returns Promise resolved after checking dangling object references.
 */
async function testResourceReferences(): Promise<void> {
  const entries = unzipSync(await createCompletePackage());
  const pageXml = decodeRequired(entries, "Doc_0/Pages/Page_0/Content.xml")
    .replace(/Font="\d+"/u, 'Font="999"')
    .replace(/ResourceID="\d+"/u, 'ResourceID="998"');
  const result = verifyOFDPackage(rebuildArchive(entries, {
    "Doc_0/Pages/Page_0/Content.xml": pageXml
  }));

  expect(result.issues.filter((issue) =>
    issue.code === "resource-reference-missing"
  )).toHaveLength(2);
}

/**
 * Verifies document-open action events, target kinds, and target references.
 *
 * @returns Promise resolved after checking serialized action mutations.
 */
async function testDocumentOpenActionReferences(): Promise<void> {
  const entries = unzipSync(await createCompletePackage());
  const documentXml = decodeRequired(entries, "Doc_0/Document.xml")
    .replace("</ofd:Pages>", `</ofd:Pages>
      <ofd:Actions>
        <ofd:Action Event="PO"><ofd:URI URI="https://example.test"/></ofd:Action>
        <ofd:Action Event="DO"><ofd:Goto><ofd:Dest Type="Fit" PageID="999"/></ofd:Goto></ofd:Action>
      </ofd:Actions>`);
  const result = verifyOFDPackage(rebuildArchive(entries, {
    "Doc_0/Document.xml": documentXml
  }));

  expect(result.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "action-invalid" }),
    expect.objectContaining({ code: "action-reference-missing", id: "999" })
  ]));
}

/**
 * Verifies the numeric ID domain is globally unique and exactly bounded.
 *
 * @returns Promise resolved after checking invalid document identifiers.
 */
async function testIdDomain(): Promise<void> {
  const entries = unzipSync(await createCompletePackage());
  const documentXml = decodeRequired(entries, "Doc_0/Document.xml")
    .replace(/<ofd:MaxUnitID>\d+<\/ofd:MaxUnitID>/u, "<ofd:MaxUnitID>1</ofd:MaxUnitID>");
  const pageXml = decodeRequired(entries, "Doc_0/Pages/Page_0/Content.xml")
    .replace(/<ofd:Layer ID="\d+"/u, '<ofd:Layer ID="1"');
  const result = verifyOFDPackage(rebuildArchive(entries, {
    "Doc_0/Document.xml": documentXml,
    "Doc_0/Pages/Page_0/Content.xml": pageXml
  }));

  expect(result.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "id-duplicate", id: "1" }),
    expect.objectContaining({ code: "max-unit-id-mismatch", id: "1" })
  ]));
}

/**
 * Verifies non-`ST_ID` elements retain their independent string ID domains.
 *
 * @returns Promise resolved after checking string identifier fields.
 */
async function testStringIdsOutsideStIdDomain(): Promise<void> {
  const entries = unzipSync(await createCompletePackage());
  const attachmentsXml = decodeRequired(entries, "Doc_0/Attachments.xml")
    .replace(/(<ofd:Attachment ID=")\d+"/u, '$1attachment-evidence"');
  const result = verifyOFDPackage(rebuildArchive(entries, {
    "Doc_0/Attachments.xml": attachmentsXml,
    "Doc_0/Signatures.xml": `<?xml version="1.0" encoding="UTF-8"?>
      <ofd:Signatures xmlns:ofd="http://www.ofdspec.org/2016">
        <ofd:Signature ID="signature-primary"><ofd:StampAnnot ID="stamp-annot-primary" /></ofd:Signature>
        <ofd:OFDEntries ID="entry-primary" />
      </ofd:Signatures>`,
    "Doc_0/Versions.xml": `<?xml version="1.0" encoding="UTF-8"?>
      <ofd:Versions xmlns:ofd="http://www.ofdspec.org/2016">
        <ofd:Version ID="version-current"><ofd:DocVersion ID="document-version-current">
          <ofd:File ID="version-file">Document.xml</ofd:File>
        </ofd:DocVersion></ofd:Version>
      </ofd:Versions>`
  }));

  expect(result).toMatchObject({ valid: true, issues: [] });
}

/**
 * Verifies ZIP metadata limits reject entries before their compressed data is read.
 *
 * @returns Promise resolved after checking declared archive entry sizes.
 */
async function testArchiveEntryLimits(): Promise<void> {
  const oversized = corruptFirstZipFilePayload(zipSync({
    "oversized.bin": [Uint8Array.from({ length: 512 }, (_, index) => index), { level: 6 }]
  }));
  const oversizedResult = verifyOFDPackage(oversized, {
    limits: { maxEntryBytes: 128 }
  });
  const totalResult = verifyOFDPackage(zipSync({
    "first.bin": Uint8Array.of(1, 2, 3, 4),
    "second.bin": Uint8Array.of(5, 6, 7, 8)
  }), {
    limits: { maxTotalEntryBytes: 6 }
  });

  expect(oversizedResult.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({
      code: "archive-limit-exceeded",
      entryPath: "oversized.bin"
    })
  ]));
  expect(oversizedResult.issues).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "archive-invalid" })
  ]));
  expect(totalResult.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "archive-limit-exceeded" })
  ]));
}

/**
 * Verifies the bounded parser retains ordinary predefined XML entity support.
 */
function testSafeXmlEntityParsing(): void {
  const issues: OFDPackageVerificationIssue[] = [];
  const entries = parseOFDPackageXmlEntries(new Map([
    ["Entity.xml", new TextEncoder().encode(
      '<?xml version="1.0" encoding="UTF-8"?><Entity><Value>A&amp;B</Value></Entity>'
    )]
  ]), new TextDecoder(), issues);

  expect(issues).toEqual([]);
  expect(entries.get("Entity.xml")?.value).toMatchObject({
    Entity: { Value: "A&B" }
  });
}

/**
 * Verifies ZIP path safety and explicit strict-mode failures.
 *
 * @returns Promise resolved after checking unsafe and malformed archives.
 */
async function testArchiveSafetyAndStrictMode(): Promise<void> {
  const unsafe = zipSync({ "../escape.bin": Uint8Array.of(1) });
  const result = verifyOFDPackage(unsafe);

  expect(result.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "archive-path-unsafe" }),
    expect.objectContaining({ code: "required-entry-missing" })
  ]));
  await expect(Promise.resolve().then(() => assertOFDPackage(unsafe)))
    .rejects.toBeInstanceOf(OFDPackageVerificationError);
}

/**
 * Creates a complete standalone package spanning pages, resources, and attachments.
 *
 * @returns Complete serialized OFD package bytes.
 */
async function createCompletePackage(): Promise<Uint8Array> {
  const document = OFDDocument.create({
    metadata: { documentId: "00000000000000000000000000000004" }
  });
  const font = document.embedFont(fontBytes, { fontName: "Fixture Sans" });
  const image = document.embedImage(pngBytes);
  const page = document.addPage({ width: 210, height: 297 });
  document.addBookmark({ name: "start", destination: { page, type: "Fit" } });
  document.setOpenActions([
    { type: "goto", destination: { page, type: "Fit" } },
    { type: "goto-bookmark", bookmark: "start" }
  ]);
  page.drawText("AB", {
    boundary: { x: 10, y: 10, width: 8, height: 4 },
    codes: [{ text: "AB", x: 0, y: 3, deltaX: [4] }],
    font,
    size: 4
  });
  page.drawImage(image, { boundary: { x: 20, y: 20, width: 10, height: 10 } });
  document.addAttachment(Uint8Array.of(1, 2, 3), {
    format: "application/octet-stream",
    name: "evidence.bin"
  });
  return document.save();
}

/**
 * Reassembles archive entries after replacing selected UTF-8 XML entries.
 *
 * @param entries - Original unpacked entries.
 * @param replacements - Replacement entry text keyed by package path.
 * @returns Deterministic ZIP bytes containing the replacements.
 */
function rebuildArchive(
  entries: Record<string, Uint8Array>,
  replacements: Readonly<Record<string, string>>
): Uint8Array {
  const archive = new Map<string, string | Uint8Array>();
  for (const [path, bytes] of Object.entries(entries)) {
    archive.set(path, replacements[path] ?? bytes);
  }
  for (const [path, replacement] of Object.entries(replacements)) {
    if (!archive.has(path)) archive.set(path, replacement);
  }
  return createOFDArchive(archive);
}

/**
 * Corrupts the compressed bytes for the first ZIP entry without changing its metadata.
 *
 * @param archive - Valid ZIP bytes with a compressed first entry.
 * @returns Copy with an invalid first compressed payload.
 */
function corruptFirstZipFilePayload(archive: Uint8Array): Uint8Array {
  const corrupted = archive.slice();
  const nameLength = readZipUint16(corrupted, 26);
  const extraLength = readZipUint16(corrupted, 28);
  const compressedSize = readZipUint32(corrupted, 18);
  const compression = readZipUint16(corrupted, 8);
  if (compression !== 8 || compressedSize === 0) {
    throw new Error("Expected the test ZIP fixture to use DEFLATE compression.");
  }
  const payloadStart = 30 + nameLength + extraLength;
  corrupted.fill(0xff, payloadStart, payloadStart + compressedSize);
  return corrupted;
}

/**
 * Reads one unsigned little-endian 16-bit ZIP header field.
 *
 * @param bytes - ZIP bytes containing the field.
 * @param offset - Field byte offset.
 * @returns Parsed unsigned 16-bit value.
 */
function readZipUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset]! | (bytes[offset + 1]! << 8);
}

/**
 * Reads one unsigned little-endian 32-bit ZIP header field.
 *
 * @param bytes - ZIP bytes containing the field.
 * @param offset - Field byte offset.
 * @returns Parsed unsigned 32-bit value.
 */
function readZipUint32(bytes: Uint8Array, offset: number): number {
  return readZipUint16(bytes, offset) | (readZipUint16(bytes, offset + 2) << 16);
}

/**
 * Decodes a required UTF-8 archive entry.
 *
 * @param entries - Unpacked OFD archive entries.
 * @param path - Required package path.
 * @returns Decoded entry text.
 */
function decodeRequired(entries: Record<string, Uint8Array>, path: string): string {
  const data = entries[path];
  if (!data) throw new Error(`Missing test fixture entry: ${path}`);
  return new TextDecoder().decode(data);
}
