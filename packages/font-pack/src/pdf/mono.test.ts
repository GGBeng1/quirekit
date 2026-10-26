import { describe, expect, it, vi } from "vitest";
import { createQuirePortableMonoFontSources, quirePortableMonoFontAssets } from "./mono";

describe("portable monospace font preset", () => {
  it("declares four static faces that replace common code families", async () => {
    expect(quirePortableMonoFontAssets.map((asset) => [asset.weight, asset.style])).toEqual([[400, "normal"], [400, "italic"], [700, "normal"], [700, "italic"]]);
    const loadAsset = vi.fn(() => new Uint8Array([1]));
    const sources = createQuirePortableMonoFontSources({ loadAsset });
    expect(loadAsset).not.toHaveBeenCalled();
    expect(sources[0]).toMatchObject({ family: "DejaVu Sans Mono", acceptedSubstitutions: expect.arrayContaining(["Courier New", "Consolas"]) });
    await sources[3]!.data();
    expect(loadAsset).toHaveBeenCalledWith(quirePortableMonoFontAssets[3]);
  });
});
