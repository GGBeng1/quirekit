import { describe, expect, it, vi } from "vitest";
import { createQuirePaginationCheckpointStore } from "./checkpoint-store";
import {
  readQuirePreparedPaginationResult,
  writeQuirePreparedPaginationResult
} from "./prepared-result";
import type { QuireMeasuredContainer } from "../container";
import type { QuirePageFragment } from "../types";

const container: QuireMeasuredContainer = {
  id: "body",
  range: { from: 0, to: 4 },
  items: [{ id: "line:0", range: { from: 0, to: 4 }, height: 20 }]
};
const fragments: readonly QuirePageFragment[] = [{
  pageIndex: 0,
  range: { from: 0, to: 4 },
  pageRect: { x: 0, y: 0, width: 100, height: 120 },
  bodyRect: { x: 10, y: 10, width: 80, height: 100 },
  rect: { x: 10, y: 10, width: 80, height: 20 },
  endInfo: { openMarks: [], openNodes: [] }
}];

describe("prepared pagination result cache", () => {
  it("reuses only exact measured input and geometry", () => {
    const store = createQuirePaginationCheckpointStore();
    writeQuirePreparedPaginationResult(store, container, "geometry:a", fragments);

    expect(readQuirePreparedPaginationResult(store, { ...container }, "geometry:a"))
      .toBe(fragments);
    expect(readQuirePreparedPaginationResult(store, {
      ...container,
      items: [{ ...container.items[0]!, height: 21 }]
    }, "geometry:a")).toBeUndefined();
    expect(readQuirePreparedPaginationResult(store, container, "geometry:b"))
      .toBeUndefined();
  });

  it("rejects a container with another source range without serializing it", () => {
    const store = createQuirePaginationCheckpointStore();
    writeQuirePreparedPaginationResult(store, container, "geometry:a", fragments);
    const stringify = vi.spyOn(JSON, "stringify");
    try {
      expect(readQuirePreparedPaginationResult(store, {
        ...container,
        range: { from: 0, to: 5 },
        items: [{ ...container.items[0]!, range: { from: 0, to: 5 } }]
      }, "geometry:a")).toBeUndefined();
      expect(stringify).not.toHaveBeenCalled();
    } finally {
      stringify.mockRestore();
    }
  });

  it("scopes prepared streams to one checkpoint authority", () => {
    const store = createQuirePaginationCheckpointStore();
    const otherStore = createQuirePaginationCheckpointStore();
    writeQuirePreparedPaginationResult(store, container, "geometry:a", fragments);

    expect(readQuirePreparedPaginationResult(otherStore, container, "geometry:a"))
      .toBeUndefined();
  });
});
