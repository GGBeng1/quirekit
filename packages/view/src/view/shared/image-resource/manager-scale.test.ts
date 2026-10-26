import {
  formatQuireMediaResourceKey,
  type QuireMediaAssetResolver,
  type QuireResolvedMediaAsset
} from "@quirekit/media";
import type { QuireDisplayList, QuireImageCommand } from "@quirekit/renderer";
import { describe, expect, it, vi, type Mock } from "vitest";
import { readMountedImageTransformPass } from "./authority";
import { resolveQuireImageDecodeSize } from "./decode-size";
import { createQuireMountedImageResourceManager } from "./manager";
import type {
  QuireDecodedImageResource,
  QuireImageDecodeRequest,
  QuireImageResourceDecoder
} from "./types";

const reference = { kind: "asset", assetId: "photo" } as const;
const resourceKey = formatQuireMediaResourceKey(reference);
const asset: QuireResolvedMediaAsset = {
  reference,
  kind: "image",
  mimeType: "image/png",
  bytes: new Uint8Array([1]),
  intrinsicSize: { width: 2000, height: 1000 }
};
const resolver: QuireMediaAssetResolver = { resolve: () => asset };

describe("mounted image raster-scale decoding", () => {
  it("decodes for the painted size and maps crops into bitmap pixels", async () => {
    const decoder = createLevelDecoder();
    const manager = createQuireMountedImageResourceManager({ resolver, decoder, rasterScale: 2 });
    const list = createList({ rect: { x: 0, y: 0, width: 250, height: 125 }, sourceCrop: { left: 0.5, right: 0, top: 0, bottom: 0 } });

    manager.transformDisplayList(list);
    await vi.waitFor(() => expect(manager.readState(resourceKey)?.status).toBe("resolved"));

    expect(decoder.decode.mock.calls[0]![1]).toEqual({ pixelSize: { width: 1000, height: 250 } });
    expect(manager.transformDisplayList(list).commands[0]).toMatchObject({
      sourceSize: { width: 1000, height: 500 },
      sourceRect: { x: 500, y: 0, width: 500, height: 500 }
    });
  });

  it("scales demand through clip transforms and keeps SVG-style mounts at intrinsic size", async () => {
    const decoder = createLevelDecoder();
    const manager = createQuireMountedImageResourceManager({ resolver, decoder, rasterScale: 1 });
    manager.transformDisplayList({
      bounds: { x: 0, y: 0, width: 10, height: 10 },
      commands: [{
        id: "group",
        kind: "clip",
        rect: { x: 0, y: 0, width: 10, height: 10 },
        transform: { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 },
        commands: createList({ rect: { x: 0, y: 0, width: 300, height: 150 } }).commands
      }]
    });
    await vi.waitFor(() => expect(decoder.decode).toHaveBeenCalledTimes(1));
    expect(decoder.decode.mock.calls[0]![1]).toEqual({ pixelSize: { width: 600, height: 300 } });

    const intrinsicDecoder = createLevelDecoder();
    const intrinsicManager = createQuireMountedImageResourceManager({ resolver, decoder: intrinsicDecoder });
    intrinsicManager.transformDisplayList(createList());
    await vi.waitFor(() => expect(intrinsicDecoder.decode).toHaveBeenCalledTimes(1));
    expect(intrinsicDecoder.decode.mock.calls[0]![1]).toBeUndefined();
  });

  it("re-decodes at pass end when the level changes and keeps painting the old bitmap until then", async () => {
    const decoder = createLevelDecoder();
    const onStateChange = vi.fn();
    const manager = createQuireMountedImageResourceManager({ resolver, decoder, rasterScale: 1, onStateChange });
    const pass = readMountedImageTransformPass(manager.transformDisplayList)!;
    const paint = (): QuireDisplayList => {
      pass.begin();
      try {
        return manager.transformDisplayList(createList({ rect: { x: 0, y: 0, width: 250, height: 125 } }));
      } finally {
        pass.end();
      }
    };

    paint();
    await vi.waitFor(() => expect(manager.readState(resourceKey)?.status).toBe("resolved"));
    const small = decoder.results[0]!;
    expect(small.pixelSize).toEqual({ width: 250, height: 125 });

    manager.setRasterScale(0.9);
    expect(decoder.decode).toHaveBeenCalledTimes(1);
    manager.setRasterScale(3);
    expect(decoder.decode).toHaveBeenCalledTimes(2);
    expect(paint().commands[0]).toMatchObject({ source: small.source });
    await vi.waitFor(() => expect(small.release).toHaveBeenCalledTimes(1));
    expect(paint().commands[0]).toMatchObject({ source: decoder.results[1]!.source, sourceSize: { width: 1000, height: 500 } });
    expect(onStateChange).toHaveBeenCalledTimes(2);
  });

  it("never re-decodes when the decoder ignores the demand", async () => {
    const decode = vi.fn(async (): Promise<QuireDecodedImageResource> => createDecoded(undefined));
    const manager = createQuireMountedImageResourceManager({ resolver, decoder: { decode }, rasterScale: 1 });
    const pass = readMountedImageTransformPass(manager.transformDisplayList)!;

    pass.begin();
    manager.transformDisplayList(createList());
    pass.end();
    await vi.waitFor(() => expect(manager.readState(resourceKey)?.status).toBe("resolved"));
    manager.setRasterScale(4);
    pass.begin();
    manager.transformDisplayList(createList());
    pass.end();

    expect(decode).toHaveBeenCalledTimes(1);
  });

  it("keeps loading entries but forgets settled undecoded ones a complete pass no longer paints", async () => {
    const loading = createQuireMountedImageResourceManager({
      resolver: { resolve: () => new Promise<undefined>(() => {}) },
      decoder: createLevelDecoder()
    });
    const loadingPass = readMountedImageTransformPass(loading.transformDisplayList)!;
    loading.transformDisplayList(createList());
    loadingPass.begin();
    loadingPass.end();
    // A retained page may still paint the placeholder and needs the decode result.
    expect(loading.readState(resourceKey)?.status).toBe("loading");

    const unresolved = createQuireMountedImageResourceManager({ resolver: { resolve: () => undefined }, decoder: createLevelDecoder() });
    const unresolvedPass = readMountedImageTransformPass(unresolved.transformDisplayList)!;
    unresolved.transformDisplayList(createList());
    await vi.waitFor(() => expect(unresolved.readState(resourceKey)?.status).toBe("unresolved"));
    unresolvedPass.begin();
    unresolvedPass.end();
    expect(unresolved.readState(resourceKey)).toBeUndefined();
  });
});

/**
 * Creates a one-image display list.
 *
 * @param patch - Command overrides.
 * @returns Display list with one portable image.
 */
function createList(patch: Partial<QuireImageCommand> = {}): QuireDisplayList {
  return {
    bounds: { x: 0, y: 0, width: 400, height: 400 },
    commands: [{ id: "slot", kind: "image", rect: { x: 0, y: 0, width: 100, height: 50 }, resourceKey, ...patch }]
  };
}

/**
 * Creates a decoded fixture.
 *
 * @param pixelSize - Bitmap size, or undefined for an intrinsic-size source.
 * @returns Decoded resource with a release spy.
 */
function createDecoded(pixelSize: QuireDecodedImageResource["pixelSize"]): QuireDecodedImageResource & {
  readonly release: Mock<() => void>;
} {
  return {
    source: { pixelSize } as unknown as CanvasImageSource,
    href: "blob:photo",
    intrinsicSize: asset.intrinsicSize!,
    ...(pixelSize === undefined ? {} : { pixelSize }),
    release: vi.fn<() => void>()
  };
}

/**
 * Creates a decoder that honours raster demand with power-of-two levels.
 *
 * @returns Decoder spy and every result it produced.
 */
function createLevelDecoder(): QuireImageResourceDecoder & {
  readonly decode: ReturnType<typeof vi.fn>;
  readonly results: ReturnType<typeof createDecoded>[];
} {
  const results: ReturnType<typeof createDecoded>[] = [];
  return {
    results,
    decode: vi.fn(async (_asset: QuireResolvedMediaAsset, request?: QuireImageDecodeRequest) => {
      const decoded = createDecoded(request === undefined
        ? undefined
        : resolveQuireImageDecodeSize(asset.intrinsicSize!, request.pixelSize));
      results.push(decoded);
      return decoded;
    })
  };
}
