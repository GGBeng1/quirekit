import { describe, expect, it, vi } from "vitest";
import { createQuireBrowserFontRegistry } from "./registry";
import type {
  QuireInstalledWebFontAsset,
  QuireWebFontFamilyManifest
} from "../types";

describe("browser font registry", () => {
  it("loads every face before atomically adding the family", async () => {
    const events: string[] = [];
    class FakeFontFace {
      constructor(
        readonly family: string,
        readonly source: ArrayBuffer,
        readonly descriptors: FontFaceDescriptors
      ) {}

      async load(): Promise<FakeFontFace> {
        events.push(`load:${this.descriptors.weight}`);
        return this;
      }
    }
    const fontSet = {
      add(face: FontFace): void {
        events.push(`add:${(face as unknown as FakeFontFace).descriptors.weight}`);
      },
      delete: vi.fn(() => true),
      ready: Promise.resolve()
    };
    const registry = createQuireBrowserFontRegistry({
      fontSet: fontSet as unknown as FontFaceSet,
      FontFace: FakeFontFace as unknown as typeof FontFace
    });

    await registry.register(manifest, installedAssets());

    expect(events).toEqual(["load:400", "load:700", "add:400", "add:700"]);
    expect(registry.hasFamily("noto sans sc")).toBe(true);
  });

  it("adds no partial family when one face fails to parse", async () => {
    class RejectingFontFace {
      constructor(
        readonly family: string,
        readonly source: ArrayBuffer,
        readonly descriptors: FontFaceDescriptors
      ) {}

      async load(): Promise<RejectingFontFace> {
        if (this.descriptors.weight === "700") throw new Error("bad face");
        return this;
      }
    }
    const add = vi.fn();
    const registry = createQuireBrowserFontRegistry({
      fontSet: {
        add,
        delete: vi.fn(() => true),
        ready: Promise.resolve()
      } as unknown as FontFaceSet,
      FontFace: RejectingFontFace as unknown as typeof FontFace
    });

    await expect(registry.register(manifest, installedAssets())).rejects.toMatchObject({
      code: "font-parse"
    });
    expect(add).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)("releases pending faces on destruction when font readiness will %s", async (settlement) => {
    class LoadedFontFace {
      /** @returns A face whose parsing has already completed. */
      async load(): Promise<LoadedFontFace> { return this; }
    }
    const faces = new Set<FontFace>();
    let completeReady!: () => void;
    let rejectReady!: (reason: Error) => void;
    let allAdded: (() => void) | undefined;
    let ready: Promise<void> = Promise.resolve();
    const fontSet = {
      /** @param face - Newly registered face. */
      add(face: FontFace): void {
        faces.add(face);
        if (faces.size === 2) allAdded?.();
      },
      /** @param face - Owned face to release. @returns Whether it was present. */
      delete(face: FontFace): boolean { return faces.delete(face); },
      /** Readiness of the active registration. */
      get ready(): Promise<void> { return ready; }
    };
    const registry = createQuireBrowserFontRegistry({
      fontSet: fontSet as unknown as FontFaceSet,
      FontFace: LoadedFontFace as unknown as typeof FontFace
    });
    // Replacement must neither retain its new faces nor resurrect the old family.
    await registry.register(manifest, installedAssets());
    const replacementAdded = new Promise<void>(resolve => { allAdded = resolve; });
    ready = new Promise<void>((resolve, reject) => {
      completeReady = resolve;
      rejectReady = reject;
    });
    const registration = registry.register(manifest, installedAssets()).then(
      () => undefined,
      (error: unknown) => error
    );
    await replacementAdded;
    registry.destroy();
    const remainingAfterDestroy = faces.size;
    if (settlement === "resolve") completeReady();
    else rejectReady(new Error("font readiness failed"));
    const error = await registration;

    expect(remainingAfterDestroy).toBe(0);
    expect(faces.size).toBe(0);
    expect(registry.hasFamily(manifest.family)).toBe(false);
    expect(error).toMatchObject({ code: "destroyed" });
  });

  it("drops one rejected Unicode shard while atomically registering the usable face", async () => {
    class PartiallyRejectingFontFace {
      constructor(
        readonly family: string,
        readonly source: ArrayBuffer,
        readonly descriptors: FontFaceDescriptors
      ) {}

      async load(): Promise<PartiallyRejectingFontFace> {
        if (this.source.byteLength === 8) throw new Error("bad optional shard");
        return this;
      }
    }
    const shardedManifest: QuireWebFontFamilyManifest = {
      providerId: "fixture",
      family: "Sharded Serif",
      version: "1",
      license: { name: "Fixture license", url: "https://example.test/license" },
      faces: [{
        id: "regular",
        weight: "400",
        assets: [
          {
            id: "common",
            unicodeRange: "U+4E00-9FFF",
            sources: [{ url: "https://example.test/common.woff2" }]
          },
          {
            id: "private-use",
            unicodeRange: "U+E000-F8FF",
            sources: [{ url: "https://example.test/private-use.woff2" }]
          }
        ]
      }]
    };
    const shardedAssets = shardedManifest.faces[0]!.assets.map((asset, index) => ({
      face: shardedManifest.faces[0]!,
      asset,
      data: new ArrayBuffer(index === 0 ? 4 : 8),
      digest: `sha256-${asset.id}`,
      sourceUrl: asset.sources[0]!.url,
      fromCache: false,
      persistent: true
    }));
    const add = vi.fn();
    const registry = createQuireBrowserFontRegistry({
      fontSet: {
        add,
        delete: vi.fn(() => true),
        ready: Promise.resolve()
      } as unknown as FontFaceSet,
      FontFace: PartiallyRejectingFontFace as unknown as typeof FontFace
    });

    const registered = await registry.register(shardedManifest, shardedAssets);

    expect(add).toHaveBeenCalledTimes(1);
    expect(registered.assets.map(({ asset }) => asset.id)).toEqual(["common"]);
    expect(registered.manifest.faces[0]?.assets.map(({ id }) => id)).toEqual(["common"]);
    expect(registry.hasFamily("sharded serif")).toBe(true);
  });
});

const manifest: QuireWebFontFamilyManifest = {
  providerId: "fixture",
  family: "Noto Sans SC",
  version: "1",
  license: { name: "Fixture license", url: "https://example.test/license" },
  faces: [
    {
      id: "regular",
      weight: "400",
      assets: [{ id: "regular", sources: [{ url: "https://example.test/400" }] }]
    },
    {
      id: "bold",
      weight: "700",
      assets: [{ id: "bold", sources: [{ url: "https://example.test/700" }] }]
    }
  ]
};

/** @returns Installed bytes corresponding to the registry fixture manifest. */
function installedAssets(): readonly QuireInstalledWebFontAsset[] {
  return manifest.faces.map((face) => ({
    face,
    asset: face.assets[0]!,
    data: new ArrayBuffer(4),
    digest: "sha256-fixture",
    sourceUrl: face.assets[0]!.sources[0]!.url,
    fromCache: false,
    persistent: false
  }));
}
