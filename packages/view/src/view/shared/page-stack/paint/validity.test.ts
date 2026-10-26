import { describe, expect, it } from "vitest";
import { QuirePageSurfacePaintValidityCache } from "./validity";

describe("QuirePageSurfacePaintValidityCache", () => {
  it("requires an explicit successful commit before reusing one surface", () => {
    const cache = new QuirePageSurfacePaintValidityCache<object>();
    const surface = {};

    const first = cache.resolve(surface, "page:0|epoch:1|commands:a");
    const uncommitted = cache.resolve(surface, "page:0|epoch:1|commands:a");

    expect(first).toEqual({
      action: "refresh",
      signature: "page:0|epoch:1|commands:a"
    });
    expect(uncommitted.action).toBe("refresh");

    cache.commit(surface, first);

    expect(cache.resolve(surface, "page:0|epoch:1|commands:a")).toEqual({
      action: "reuse",
      signature: "page:0|epoch:1|commands:a"
    });
    expect(cache.snapshot()).toEqual({ hits: 1, misses: 2, stores: 1 });
  });

  it("invalidates by exact signature and keeps surfaces independent", () => {
    const cache = new QuirePageSurfacePaintValidityCache<object>();
    const firstSurface = {};
    const secondSurface = {};
    const initial = cache.resolve(firstSurface, "epoch:1");

    cache.commit(firstSurface, initial);

    expect(cache.resolve(firstSurface, "epoch:2").action).toBe("refresh");
    expect(cache.resolve(secondSurface, "epoch:1").action).toBe("refresh");
    expect(cache.snapshot()).toEqual({ hits: 0, misses: 3, stores: 1 });
  });

  it("resets stored validity and diagnostics together", () => {
    const cache = new QuirePageSurfacePaintValidityCache<object>();
    const surface = {};
    const decision = cache.resolve(surface, "stable");

    cache.commit(surface, decision);
    expect(cache.resolve(surface, "stable").action).toBe("reuse");

    cache.reset();

    expect(cache.snapshot()).toEqual({ hits: 0, misses: 0, stores: 0 });
    expect(cache.resolve(surface, "stable").action).toBe("refresh");
  });
});
