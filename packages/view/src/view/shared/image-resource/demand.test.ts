import { formatQuireMediaResourceKey, type QuireResolvedMediaAsset } from "@quirekit/media";
import type { QuireDisplayList } from "@quirekit/renderer";
import { describe, expect, it, vi } from "vitest";
import { readMountedImageTransformPage } from "./authority";
import { createQuireMountedImageResourceManager } from "./manager";

/** @param id - Asset id. @returns Resource key of that asset. */
const keyOf = (id: string) => formatQuireMediaResourceKey({ kind: "asset", assetId: id });

/**
 * @param ids - Asset ids, one image command each.
 * @returns Page chunk painting those images.
 */
function chunk(...ids: string[]): QuireDisplayList {
  return {
    commands: ids.map(id => ({
      kind: "image" as const, id: `slot-${id}`, resourceKey: keyOf(id),
      rect: { x: 0, y: 0, width: 100, height: 50 }, sourceSize: { width: 200, height: 100 }
    }))
  } as unknown as QuireDisplayList;
}

/** @returns Manager whose resolver and decoder record each asset they handle. */
function createManager() {
  const resolved: string[] = [];
  const onStateChange = vi.fn();
  const manager = createQuireMountedImageResourceManager({
    resolver: {
      resolve: reference => {
        const assetId = (reference as { assetId: string }).assetId;
        resolved.push(assetId);
        return { reference, kind: "image", mimeType: "image/png", bytes: new Uint8Array([1]), intrinsicSize: { width: 200, height: 100 } } as QuireResolvedMediaAsset;
      }
    },
    decoder: { decode: vi.fn(async () => ({ source: {} as CanvasImageSource, href: "blob:x", intrinsicSize: { width: 200, height: 100 }, release: vi.fn() })) },
    onStateChange
  });
  const transformPage = readMountedImageTransformPage(manager.transformDisplayList)!;
  return { manager, transformPage, resolved, onStateChange };
}

describe("image decoding limited to mounted pages", () => {
  it("decodes every page without a window, as surfaces that report no pages do", () => {
    const { transformPage, resolved } = createManager();
    transformPage(chunk("near"), 0);
    transformPage(chunk("far"), 20);
    expect(resolved).toEqual(["near", "far"]);
  });

  it("defers images of pages outside the window until the page is mounted", async () => {
    const { manager, transformPage, resolved, onStateChange } = createManager();
    manager.setDemandPages([0, 1]);
    transformPage(chunk("near"), 0);
    expect(transformPage(chunk("far"), 20).commands[0]).toMatchObject({ kind: "fill-rect" });
    expect(resolved).toEqual(["near"]);
    expect(manager.readState(keyOf("far"))).toBeUndefined();

    manager.setDemandPages([19, 20]);
    expect(resolved).toEqual(["near", "far"]);
    await vi.waitFor(() => expect(manager.readState(keyOf("far"))?.status).toBe("resolved"));
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ key: keyOf("far"), status: "resolved" }));
    // The repaint the state change requests now draws the image.
    expect(transformPage(chunk("far"), 20).commands[0]).toMatchObject({ kind: "image", href: "blob:x" });
  });

  it("keeps drawing images a far page shares with mounted ones, and re-records a page on each transform", async () => {
    const { manager, transformPage, resolved } = createManager();
    manager.setDemandPages([0]);
    transformPage(chunk("shared"), 0);
    await vi.waitFor(() => expect(manager.readState(keyOf("shared"))?.status).toBe("resolved"));
    expect(transformPage(chunk("shared", "only-far"), 9).commands.map(command => command.kind)).toEqual(["image", "fill-rect"]);

    // The page no longer paints "only-far" in its latest chunk, so mounting it decodes nothing new.
    transformPage(chunk("shared"), 9);
    manager.setDemandPages([9]);
    expect(resolved).toEqual(["shared"]);
  });
});
