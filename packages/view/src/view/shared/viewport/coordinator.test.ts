import { describe, expect, it } from "vitest";
import type { QuireRect } from "@quirekit/renderer";
import { createViewportCoordinator } from "./coordinator";
import type { ScrollSource } from "./types";

/** Builds a stacked, full-width page rectangle. */
function rect(y: number, height: number): QuireRect {
  return { x: 0, y, width: 100, height };
}

/** Creates a scroll source returning a fixed visible region. */
function fixedScrollSource(region: QuireRect): ScrollSource & { calls: number } {
  let calls = 0;
  return {
    get calls(): number {
      return calls;
    },
    getVisibleRegion(): QuireRect {
      return region;
    },
    subscribe(listener: () => void): () => void {
      calls += 1;
      void listener;
      return () => {
        calls -= 1;
      };
    },
    destroy(): void {
      calls = -1;
    }
  };
}

describe("createViewportCoordinator", () => {
  const pages: readonly QuireRect[] = [rect(0, 100), rect(120, 100), rect(240, 100)];

  it("resolves the visible page indices from the scroll source region", () => {
    const visibleRegion = { x: 0, y: 130, width: 100, height: 40 };
    const coordinator = createViewportCoordinator({
      scrollSource: fixedScrollSource(visibleRegion)
    });

    expect(coordinator.getVisibleRegion()).toEqual(visibleRegion);
    expect(coordinator.getVisiblePageIndices(pages)).toEqual([1]);
    expect(coordinator.getVisiblePageIndices(pages, 1)).toEqual([0, 1, 2]);
  });

  it("delegates subscribe and destroy to the scroll source", () => {
    const scrollSource = fixedScrollSource({ x: 0, y: 0, width: 100, height: 50 });
    const coordinator = createViewportCoordinator({ scrollSource });

    const unsubscribe = coordinator.subscribe(() => {});
    expect(scrollSource.calls).toBe(1);
    unsubscribe();
    expect(scrollSource.calls).toBe(0);

    coordinator.destroy();
    expect(scrollSource.calls).toBe(-1);
  });
});
