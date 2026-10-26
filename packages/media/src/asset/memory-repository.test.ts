import { describe, expect, it } from "vitest";
import {
  QuireMediaAssetConflictError,
  QuireMediaAssetValidationError,
  type QuireMediaAssetValidationErrorCode
} from "./errors";
import { createQuireMemoryMediaRepository } from "./memory-repository";
import {
  createQuireAssetMediaReference,
  createQuireExternalMediaReference,
  formatQuireMediaResourceKey,
  parseQuireMediaResourceKey,
  parseQuireMediaReference
} from "./references";
import { createQuireMediaResolverChain } from "./resolver-chain";
import type {
  QuireMediaAssetInput,
  QuireMediaAssetResolver
} from "./types";

const baseAsset: QuireMediaAssetInput = {
  assetId: "image-1",
  kind: "image",
  mimeType: "image/png",
  bytes: new Uint8Array([137, 80, 78, 71]),
  fileName: "sample.png",
  intrinsicSize: { width: 640, height: 480 }
};

describe("in-memory media repository", () => {
  it("copies caller-owned and resolved bytes", () => {
    const inputBytes = new Uint8Array([1, 2, 3]);
    const repository = createQuireMemoryMediaRepository();
    const reference = repository.put({
      ...baseAsset,
      bytes: inputBytes
    });

    inputBytes[0] = 9;
    const first = repository.resolve(reference);
    expect(first?.bytes).toEqual(new Uint8Array([1, 2, 3]));
    if (first === undefined) {
      throw new Error("Expected the registered media asset.");
    }
    first.bytes[1] = 8;
    (first.intrinsicSize as { width: number }).width = 1;

    const second = repository.resolve(reference);
    expect(second?.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(second?.intrinsicSize).toEqual({ width: 640, height: 480 });
  });

  it("allows exact idempotent registration and rejects collisions", () => {
    const repository = createQuireMemoryMediaRepository([baseAsset]);

    expect(repository.put({ ...baseAsset })).toEqual({
      kind: "asset",
      assetId: "image-1"
    });
    expect(() =>
      repository.put({
        ...baseAsset,
        bytes: new Uint8Array([137, 80, 78, 72])
      })
    ).toThrow(QuireMediaAssetConflictError);
  });

  it("rolls back only a newly registered unaccepted asset", () => {
    const repository = createQuireMemoryMediaRepository([baseAsset]);
    const existing = repository.register({ ...baseAsset });
    const provisional = repository.register({
      ...baseAsset,
      assetId: "image-provisional"
    });

    expect(existing.rollback()).toBe(false);
    expect(repository.has("image-1")).toBe(true);
    expect(provisional.rollback()).toBe(true);
    expect(provisional.rollback()).toBe(false);
    expect(repository.has("image-provisional")).toBe(false);
  });

  it("retains an accepted authoring asset", () => {
    const repository = createQuireMemoryMediaRepository();
    const lease = repository.register(baseAsset);

    expect(lease.accept()).toBe(true);
    expect(lease.accept()).toBe(false);
    expect(lease.rollback()).toBe(false);
    expect(repository.resolve(lease.reference)?.fileName).toBe("sample.png");
  });

  it("does not reclaim a provisional asset accepted by a concurrent lease", () => {
    const repository = createQuireMemoryMediaRepository();
    const creator = repository.register(baseAsset);
    const adopter = repository.register({ ...baseAsset });

    expect(adopter.accept()).toBe(true);
    expect(creator.rollback()).toBe(false);
    expect(repository.has("image-1")).toBe(true);
  });

  it("never resolves missing or external references implicitly", () => {
    const repository = createQuireMemoryMediaRepository([baseAsset]);

    expect(
      repository.resolve(createQuireAssetMediaReference("missing"))
    ).toBeUndefined();
    expect(
      repository.resolve(
        createQuireExternalMediaReference("https://example.com/image.png")
      )
    ).toBeUndefined();
  });

  const invalidAssets: readonly [
    unknown,
    QuireMediaAssetValidationErrorCode
  ][] = [
    [{ ...baseAsset, assetId: "" }, "invalid-id"],
    [{ ...baseAsset, kind: "video" }, "invalid-kind"],
    [{ ...baseAsset, mimeType: "text/plain" }, "invalid-mime-type"],
    [{ ...baseAsset, bytes: new Uint8Array() }, "empty-data"],
    [{ ...baseAsset, fileName: " sample.png" }, "invalid-file-name"],
    [
      { ...baseAsset, intrinsicSize: { width: 0, height: 10 } },
      "invalid-intrinsic-size"
    ]
  ];

  it.each(invalidAssets)("rejects invalid complete assets", (input, code) => {
    const repository = createQuireMemoryMediaRepository();

    expect(() =>
      repository.put(input as QuireMediaAssetInput)
    ).toThrowError(
      expect.objectContaining<Partial<QuireMediaAssetValidationError>>({ code })
    );
  });
});

describe("media references and resolver composition", () => {
  it("round-trips only canonical JSON-safe references", () => {
    expect(
      parseQuireMediaReference(
        JSON.parse(
          JSON.stringify(createQuireAssetMediaReference("asset:stable"))
        )
      )
    ).toEqual({ kind: "asset", assetId: "asset:stable" });
    expect(
      parseQuireMediaReference({
        kind: "external",
        href: "https://example.com/image.png"
      })
    ).toEqual({
      kind: "external",
      href: "https://example.com/image.png"
    });
    expect(
      parseQuireMediaReference({ kind: "asset", assetId: " bad " })
    ).toBeUndefined();
  });

  it("round-trips opaque renderer keys without accepting ordinary URLs", () => {
    const references = [
      createQuireAssetMediaReference("picture:one"),
      createQuireExternalMediaReference("https://example.com/image one.png?x=1")
    ];

    for (const reference of references) {
      const key = formatQuireMediaResourceKey(reference);
      expect(key.startsWith("quirekit-media:")).toBe(true);
      expect(parseQuireMediaResourceKey(key)).toEqual(reference);
    }
    expect(
      parseQuireMediaResourceKey("https://example.com/image.png")
    ).toBeUndefined();
    expect(parseQuireMediaResourceKey("quirekit-media:asset:%")).toBeUndefined();
  });

  it("keeps external keys exact while reusing encodings past the retention budget", () => {
    const large = `data:image/png;base64,${"A+/=".repeat(600_000)}`;
    const others = Array.from({ length: 3 }, (_, index) => `${large}${index}`);
    const first = formatQuireMediaResourceKey(createQuireExternalMediaReference(large));
    for (const href of others) {
      expect(parseQuireMediaResourceKey(formatQuireMediaResourceKey(createQuireExternalMediaReference(href))))
        .toEqual(createQuireExternalMediaReference(href));
    }
    expect(formatQuireMediaResourceKey(createQuireExternalMediaReference(large))).toBe(first);
    expect(parseQuireMediaResourceKey(first)).toEqual(createQuireExternalMediaReference(large));
  });

  it("resolves in explicit order and copies the winning bytes", async () => {
    const reference = createQuireAssetMediaReference("image-1");
    const sourceBytes = new Uint8Array([4, 5, 6]);
    const misses: QuireMediaAssetResolver = {
      resolve: () => undefined
    };
    const resolves: QuireMediaAssetResolver = {
      resolve: async () => ({
        reference,
        kind: "image",
        mimeType: "image/png",
        bytes: sourceBytes
      })
    };
    const chain = createQuireMediaResolverChain([misses, resolves]);

    const result = await chain.resolve(reference);
    expect(result?.bytes).toEqual(sourceBytes);
    expect(result?.bytes).not.toBe(sourceBytes);
  });

  it("rejects a resolver result for a different reference", async () => {
    const requested = createQuireAssetMediaReference("requested");
    const resolver: QuireMediaAssetResolver = {
      resolve: () => ({
        reference: createQuireAssetMediaReference("different"),
        kind: "image",
        mimeType: "image/png",
        bytes: new Uint8Array([1])
      })
    };

    await expect(
      createQuireMediaResolverChain([resolver]).resolve(requested)
    ).rejects.toMatchObject({ code: "reference-mismatch" });
  });
});
