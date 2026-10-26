import { describe, expect, it } from "vitest";
import { docx, type DocxRoundTripMetadata, type LitAstNode } from "@quirekit/lit-docx-contract";
import { createMindMapEmbed, serializeMindMapEmbed } from "@quirekit/mind-map";
import { projectMindMap, recoverMindMap } from "./projection";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
const source = createMindMapEmbed("recovery", "保留源"), serialized = serializeMindMapEmbed(source);
const image: LitAstNode = { type: "image", attrs: { src: png } };
/** @param metadata - Untrusted semantic payload. @param children - Already decoded visible content.
 * @returns Tagged projection through the public authoring API. */
function control(metadata: DocxRoundTripMetadata, children: readonly LitAstNode[] = [image]): LitAstNode {
  return docx.roundTrip.taggedBlock({ tag: "quirekit:mind-map:1", metadata, children: [...children] });
}

describe("mind map metadata validation", () => {
  it.each([
    { version: 2, data: { source: serialized, width: 1, height: 1 } },
    { version: 1, data: { source: "invalid", width: 1, height: 1 } },
    { version: 1, data: { source: serialized, width: 1, height: 0 } },
    { version: 1, data: { source: serialized, width: 1.5, height: 1 } },
    { version: 1, data: { source: serialized, width: 4097, height: 1 } },
    { version: 1, data: { source: serialized, width: 1, height: 1, extra: true } },
    { version: 1, data: { source: JSON.stringify({ ...source, version: 99 }), width: 1, height: 1 } },
    { version: 1, data: { source: JSON.stringify({ ...source, preview: { dataUrl: png, width: 1, height: 1 } }), width: 1, height: 1 } },
  ])("declines unsupported or inconsistent metadata without restoring stale source", metadata => {
    expect(recoverMindMap(control(metadata), docx)).toBeNull();
  });
  it("rejects absent or ambiguous images and does not mistake them for an outline", () => {
    const metadata = { version: 1, data: { source: serialized, width: 1, height: 1 } };
    expect(recoverMindMap(control(metadata, []), docx)).toBeNull();
    expect(recoverMindMap(control(metadata, [image, image]), docx)).toBeNull();
    expect(recoverMindMap(control({ ...metadata, data: { ...metadata.data, width: 0, height: 0 } }, [image, image]), docx)).toBeNull();
  });
  it("does not mutate the accepted model or duplicate PNG bytes in metadata", () => {
    const saved = { ...source, preview: { dataUrl: png, width: 32, height: 24 } };
    const before = JSON.stringify(saved), projection = projectMindMap(saved, docx, () => {}, {});
    expect(JSON.stringify(saved)).toBe(before);
    expect(JSON.stringify(docx.roundTrip.readMetadata(projection))).not.toContain("data:image");
    expect(recoverMindMap(projection, docx)).toEqual(saved);
  });
});
