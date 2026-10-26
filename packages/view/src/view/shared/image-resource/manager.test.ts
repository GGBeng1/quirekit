import { readMountedImageTransformPass, readMountedImageTransformVersion } from "./authority";
import {
  formatQuireMediaResourceKey,
  type QuireMediaAssetResolver,
  type QuireResolvedMediaAsset
} from "@quirekit/media";
import type {
  QuireDisplayList,
  QuireImageCommand
} from "@quirekit/renderer";
import { describe, expect, it, vi } from "vitest";
import { createQuireMountedImageResourceManager } from "./manager";
import type {
  QuireDecodedImageResource,
  QuireImageResourceDecoder
} from "./types";

const assetReference = { kind: "asset", assetId: "image-1" } as const;
const resourceKey = formatQuireMediaResourceKey(assetReference);
const asset: QuireResolvedMediaAsset = {
  reference: assetReference,
  kind: "image",
  mimeType: "image/png",
  bytes: new Uint8Array([1, 2, 3]),
  intrinsicSize: { width: 200, height: 100 }
};

describe("mounted image resource manager", () => {
  it("keeps portable keys unresolved without an explicit resolver", () => {
    const manager = createQuireMountedImageResourceManager({
      decoder: createDecoder()
    });

    expect(manager.transformDisplayList(createImageList()).commands[0]).toMatchObject({
      kind: "fill-rect",
      fillStyle: "#f3f4f6"
    });
    expect(manager.readState(resourceKey)).toEqual({
      key: resourceKey,
      status: "unresolved"
    });
  });

  it("preserves transformed paint bounds while an image resolves", async () => {
    const manager = createQuireMountedImageResourceManager({
      resolver: createResolver(asset),
      decoder: createDecoder()
    });
    expect(readMountedImageTransformVersion((list) => list)).toBeUndefined();
    const initialVersion = readMountedImageTransformVersion(manager.transformDisplayList)!;
    const list = createImageList({
      rect: { x: 10, y: 20, width: 40, height: 20 },
      transform: {
        rotation: 90,
        flipHorizontal: true,
        flipVertical: false
      }
    });

    expect(manager.transformDisplayList(list).commands[0]).toMatchObject({
      kind: "path",
      rect: { x: 20, y: 10, width: 20, height: 40 },
      segments: [
        { kind: "move-to", point: { x: 40, y: 50 } },
        { kind: "line-to", point: { x: 40, y: 10 } },
        { kind: "line-to", point: { x: 20, y: 10 } },
        { kind: "line-to", point: { x: 20, y: 50 } },
        { kind: "close-path" }
      ]
    });
    const loadingVersion = readMountedImageTransformVersion(manager.transformDisplayList)!;
    expect(loadingVersion).toBeGreaterThan(initialVersion);
    await vi.waitFor(() => {
      expect(manager.readState(resourceKey)?.status).toBe("resolved");
    });
    const resolvedVersion = readMountedImageTransformVersion(manager.transformDisplayList)!;
    expect(resolvedVersion).toBeGreaterThan(loadingVersion);
    expect(manager.transformDisplayList(list).commands[0]).toMatchObject({
      kind: "image",
      transform: {
        rotation: 90,
        flipHorizontal: true,
        flipVertical: false
      }
    });
    expect(readMountedImageTransformVersion(manager.transformDisplayList)).toBe(resolvedVersion);
    manager.destroy();
    expect(readMountedImageTransformVersion(manager.transformDisplayList)).toBeGreaterThan(resolvedVersion);
  });

  it("shares loading and resolved state and derives source-space crop", async () => {
    const onStateChange = vi.fn();
    const decoder = createDecoder();
    const manager = createQuireMountedImageResourceManager({
      resolver: createResolver(asset),
      decoder,
      onStateChange
    });
    const list = createImageList({
      sourceCrop: { top: 0.1, right: 0.2, bottom: 0.1, left: 0.05 }
    });

    expect(manager.transformDisplayList(list).commands[0]).toMatchObject({
      kind: "fill-rect",
      fillStyle: "#eef2ff"
    });
    await vi.waitFor(() => {
      expect(manager.readState(resourceKey)?.status).toBe("resolved");
    });
    expect(manager.transformDisplayList(list).commands[0]).toMatchObject({
      kind: "image",
      href: "blob:decoded",
      sourceSize: { width: 200, height: 100 },
      sourceRect: { x: 10, y: 10, width: 150, height: 80 },
      rect: { x: 10, y: 20, width: 120, height: 80 }
    });
    expect(decoder.decode).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith({
      key: resourceKey,
      status: "resolved"
    });
  });

  it("reports resolver misses and decoder failures as stable states", async () => {
    const unresolved = createQuireMountedImageResourceManager({
      resolver: createResolver(undefined),
      decoder: createDecoder()
    });
    unresolved.transformDisplayList(createImageList());
    await vi.waitFor(() => {
      expect(unresolved.readState(resourceKey)?.status).toBe("unresolved");
    });

    const failed = createQuireMountedImageResourceManager({
      resolver: createResolver(asset),
      decoder: {
        decode: vi.fn().mockRejectedValue(new Error("decode failed"))
      }
    });
    failed.transformDisplayList(createImageList());
    await vi.waitFor(() => {
      expect(failed.readState(resourceKey)).toMatchObject({
        status: "failed",
        error: expect.any(Error)
      });
    });
  });

  it("releases images that complete passes no longer paint beyond the idle budget", async () => {
    const releases = new Map<string, ReturnType<typeof vi.fn>>();
    const decoder: QuireImageResourceDecoder = {
      decode: vi.fn(async (resolved) => {
        const release = vi.fn();
        releases.set(resolved.reference.kind === "asset" ? resolved.reference.assetId : "", release);
        return { ...createDecoded(`blob:${releases.size}`, release), intrinsicSize: { width: 100, height: 100 } };
      })
    };
    const resolver: QuireMediaAssetResolver = { resolve: (reference) => ({ ...asset, reference }) };
    const manager = createQuireMountedImageResourceManager({ resolver, decoder, maxIdleDecodedBytes: 100 * 100 * 4 });
    const pass = readMountedImageTransformPass(manager.transformDisplayList)!;
    const keys = ["a", "b", "c"].map((assetId) => formatQuireMediaResourceKey({ kind: "asset", assetId }));
    /** @param visible - Keys painted by one complete pass. */
    const paint = (visible: readonly string[]): void => {
      pass.begin();
      manager.transformDisplayList({ bounds: { x: 0, y: 0, width: 10, height: 10 },
        commands: visible.map((key) => ({ id: key, kind: "image" as const, rect: { x: 0, y: 0, width: 10, height: 10 }, resourceKey: key })) });
      pass.end();
    };

    paint(keys);
    await vi.waitFor(() => expect(keys.every((key) => manager.readState(key)?.status === "resolved")).toBe(true));
    paint([keys[0]!]);
    // Two idle images exceed a one-image budget: the older one is released and forgotten.
    expect(releases.get("b")).toHaveBeenCalledTimes(1);
    expect(releases.get("c")).not.toHaveBeenCalled();
    expect(manager.readState(keys[1]!)).toBeUndefined();
    paint([keys[0]!]);
    expect(releases.get("c")).not.toHaveBeenCalled();
    expect(releases.get("a")).not.toHaveBeenCalled();
    paint(keys);
    expect(manager.readState(keys[1]!)?.status).toBe("loading");
    manager.destroy();
  });

  it("releases replaced, destroyed, and late decoded resources exactly once", async () => {
    const pending = createDeferred<QuireDecodedImageResource>();
    const releaseLate = vi.fn();
    const replacement = createDecoded("blob:replacement");
    const replacementReference = { kind: "asset", assetId: "image-2" } as const;
    const replacementKey = formatQuireMediaResourceKey(replacementReference);
    const resolver: QuireMediaAssetResolver = {
      resolve(reference) {
        return {
          ...asset,
          reference,
          intrinsicSize: { width: 50, height: 50 }
        };
      }
    };
    const decoder: QuireImageResourceDecoder = {
      decode: vi.fn()
        .mockImplementationOnce(() => pending.promise)
        .mockResolvedValueOnce(replacement)
    };
    const manager = createQuireMountedImageResourceManager({ resolver, decoder });

    manager.transformDisplayList(createImageList());
    await vi.waitFor(() => {
      expect(decoder.decode).toHaveBeenCalledTimes(1);
    });
    manager.transformDisplayList(createImageList({ resourceKey: replacementKey }));
    pending.resolve(createDecoded("blob:late", releaseLate));
    await vi.waitFor(() => {
      expect(releaseLate).toHaveBeenCalledTimes(1);
    });

    manager.transformDisplayList(createImageList({ resourceKey: replacementKey }));
    await vi.waitFor(() => {
      expect(manager.readState(replacementKey)?.status).toBe("resolved");
    });
    manager.destroy();
    manager.destroy();
    expect(replacement.release).toHaveBeenCalledTimes(1);
  });
});

/**
 * Creates one portable image display list.
 *
 * @param patch - Optional command overrides.
 * @returns One-command display list.
 */
function createImageList(
  patch: Partial<QuireImageCommand> = {}
): QuireDisplayList {
  return {
    bounds: { x: 0, y: 0, width: 200, height: 120 },
    commands: [{
      id: "picture-slot",
      kind: "image",
      rect: { x: 10, y: 20, width: 120, height: 80 },
      resourceKey,
      ...patch
    }]
  };
}

/**
 * Creates one explicit resolver.
 *
 * @param result - Resolver result.
 * @returns Resolver returning the supplied result.
 */
function createResolver(
  result: QuireResolvedMediaAsset | undefined
): QuireMediaAssetResolver {
  return { resolve: () => result };
}

/**
 * Creates a resolved decoded image fixture.
 *
 * @param href - Fixture object URL.
 * @param release - Optional release observer.
 * @returns Decoded resource fixture.
 */
function createDecoded(
  href = "blob:decoded",
  release = vi.fn()
): QuireDecodedImageResource {
  return {
    source: { id: href } as unknown as CanvasImageSource,
    href,
    intrinsicSize: { width: 200, height: 100 },
    release
  };
}

/**
 * Creates one decoder spy.
 *
 * @returns Decoder resolving a standard fixture.
 */
function createDecoder(): QuireImageResourceDecoder & {
  readonly decode: ReturnType<typeof vi.fn>;
} {
  return {
    decode: vi.fn().mockResolvedValue(createDecoded())
  };
}

/**
 * Creates an externally resolvable promise.
 *
 * @returns Deferred promise controls.
 */
function createDeferred<Value>(): {
  readonly promise: Promise<Value>;
  readonly resolve: (value: Value) => void;
} {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}
