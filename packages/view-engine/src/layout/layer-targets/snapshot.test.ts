import { describe, expect, it } from "vitest";
import type { QuireHitTarget } from "../engine/types";
import type { QuireLayoutPage } from "../types";
import { createQuireLayoutLayerTargetIndex } from "./snapshot";

/** @param id - Target id. @param y - Top edge. @returns Minimal hit target. */
const target = (id: string, y: number) => ({ id, rect: { x: 0, y, width: 10, height: 10 } }) as unknown as QuireHitTarget;
/** @param count - Page count. @returns Stacked pages. */
const createPages = (count: number) => Array.from({ length: count }, (_, pageIndex) =>
  ({ pageIndex, pageRect: { x: 0, y: pageIndex * 100, width: 100, height: 100 } }) as unknown as QuireLayoutPage);

describe("layer target index reuse", () => {
  it("reuses the index for the same targets and buckets and rebuilds otherwise", () => {
    const targets = [target("a", 5), target("b", 150)];
    const pages = createPages(2);
    const first = createQuireLayoutLayerTargetIndex(targets, pages);
    expect(createQuireLayoutLayerTargetIndex(targets, pages)).toBe(first);
    expect(createQuireLayoutLayerTargetIndex([...targets], pages)).not.toBe(first);
    expect(createQuireLayoutLayerTargetIndex([...targets], pages)).toEqual(first);
    expect(createQuireLayoutLayerTargetIndex(targets, createPages(3))).not.toBe(first);

    const viewport = { x: 0, y: 0, width: 50, height: 50 };
    const unpaginated = createQuireLayoutLayerTargetIndex(targets, [], viewport);
    expect(createQuireLayoutLayerTargetIndex(targets, [], { ...viewport })).toBe(unpaginated);
    expect(createQuireLayoutLayerTargetIndex(targets, [], { ...viewport, height: 60 })).not.toBe(unpaginated);
  });
});
