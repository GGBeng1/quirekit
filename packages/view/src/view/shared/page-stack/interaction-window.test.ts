import { describe, expect, it } from "vitest";
import { resolveMountedPageStackInteractionBlockLimit } from "./interaction-window";

describe("resolveMountedPageStackInteractionBlockLimit", () => {
  it("keeps the dirty block inside a viewport-sized prefix", () => {
    expect(resolveMountedPageStackInteractionBlockLimit({
      totalBlockCount: 205,
      firstDirtyBlockIndex: 0,
      blockWindowSize: 13
    })).toBe(13);
    expect(resolveMountedPageStackInteractionBlockLimit({
      totalBlockCount: 205,
      firstDirtyBlockIndex: 40,
      blockWindowSize: 13
    })).toBe(53);
  });

  it("keeps exact layout when no downstream remainder can be deferred", () => {
    expect(resolveMountedPageStackInteractionBlockLimit({
      totalBlockCount: 12,
      firstDirtyBlockIndex: 0,
      blockWindowSize: 13
    })).toBeUndefined();
    expect(resolveMountedPageStackInteractionBlockLimit({
      totalBlockCount: 205,
      firstDirtyBlockIndex: 200,
      blockWindowSize: 13
    })).toBeUndefined();
  });
});
