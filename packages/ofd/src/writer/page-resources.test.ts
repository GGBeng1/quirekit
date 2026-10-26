import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { OFDDocument } from "../document";

const pngBytes = Uint8Array.of(
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
);

describe("OFD page resources", describeOFDPageResources);

/** Defines page-local image resource serialization coverage. */
function describeOFDPageResources(): void {
  it("writes one PageRes.xml before Content and closes local image references", testPageResources);
  it("rejects page-local image handles used by another page", testPageResourceOwnership);
}

/** Verifies PageRes ordering, IDs, locations, and image resource closure. */
async function testPageResources(): Promise<void> {
  const document = OFDDocument.create();
  const page = document.addPage({ width: 210, height: 297 });
  const localImage = page.resources().addImage(pngBytes);
  page.drawImage(localImage, {
    boundary: { x: 20, y: 30, width: 40, height: 20 }
  });

  const entries = unzipSync(await document.save());
  const content = readEntry(entries, "Doc_0/Pages/Page_0/Content.xml");
  const pageRes = readEntry(entries, "Doc_0/Pages/Page_0/PageRes.xml");

  expect(content.indexOf("<ofd:Area")).toBeLessThan(content.indexOf("<ofd:PageRes"));
  expect(content.indexOf("<ofd:PageRes")).toBeLessThan(content.indexOf("<ofd:Content"));
  expect(content).toMatch(/<ofd:ImageObject[^>]*ResourceID="\d+"/u);
  expect(pageRes).toMatch(/<ofd:MultiMedia[^>]*ID="\d+"/u);
  expect(pageRes).toContain("page-image-0.png");
  expect(entries["Doc_0/Pages/Page_0/Res/Images/page-image-0.png"]).toEqual(pngBytes);
}

/** Verifies local image handles cannot cross their physical page boundary. */
function testPageResourceOwnership(): void {
  const document = OFDDocument.create();
  const first = document.addPage({ width: 210, height: 297 });
  const second = document.addPage({ width: 210, height: 297 });
  const image = first.resources().addImage(pngBytes);

  expect(() => second.drawImage(image, {
    boundary: { x: 0, y: 0, width: 10, height: 10 }
  })).toThrow("OFD page resources cannot be shared across pages.");
}

/**
 * Reads one required UTF-8 package entry.
 *
 * @param entries - Unpacked OFD package entries.
 * @param path - Required package path.
 * @returns Decoded entry XML.
 */
function readEntry(entries: Record<string, Uint8Array>, path: string): string {
  const data = entries[path];
  if (!data) throw new Error(`Missing test fixture entry: ${path}`);
  return new TextDecoder().decode(data);
}
