// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import { createQuirePageStackManager } from "./manager";
import type { QuirePageSurfaceAdapter } from "./types";

/** Fake page surface used by page-stack manager tests. */
interface FakeSurface {
  /** Detached wrapper element owned by the fake surface. */
  readonly wrapper: HTMLElement;
  /** Number of times geometry was applied to this surface. */
  geometryCount: number;
}

/** Options for the fake page surface adapter. */
interface FakeAdapterOptions {
  /** Estimated bytes reported for every pooled fake surface. */
  readonly pooledSurfaceBytes?: number | undefined;
}

/**
 * Creates a fake page surface adapter for manager tests.
 *
 * @param events - Mutable event log.
 * @param options - Fake adapter knobs.
 * @returns Page surface adapter backed by detached div elements.
 */
function createFakeAdapter(
  events: string[],
  options: FakeAdapterOptions = {}
): QuirePageSurfaceAdapter<FakeSurface> {
  return {
    createSurface(ownerDocument) {
      events.push("create");
      return { wrapper: ownerDocument.createElement("div"), geometryCount: 0 };
    },
    applyGeometry(surface, pageIndex) {
      surface.geometryCount += 1;
      events.push(`geometry:${pageIndex}`);
    },
    attach(surface, host) {
      host.appendChild(surface.wrapper);
      events.push("attach");
    },
    detach(surface) {
      surface.wrapper.remove();
      events.push("detach");
    },
    dispose() { events.push("dispose"); },
    estimatePooledSurfaceBytes() {
      return options.pooledSurfaceBytes ?? 0;
    }
  };
}

function page(pageIndex: number): QuireLayoutPage {
  return {
    pageIndex,
    range: { from: pageIndex, to: pageIndex },
    pageRect: { x: 0, y: pageIndex * 100, width: 80, height: 100 },
    bodyRect: { x: 0, y: pageIndex * 100, width: 80, height: 100 }
  } as QuireLayoutPage;
}

describe("createQuirePageStackManager", () => {
  it("mounts only the visible set and recycles the rest", () => {
    const events: string[] = [];
    const host = document.createElement("div");
    const manager = createQuirePageStackManager({
      host,
      ownerDocument: document,
      adapter: createFakeAdapter(events)
    });

    const pages = [page(0), page(1), page(2)];
    const first = manager.sync({ pages, visiblePageIndices: [0, 1], geometryEpoch: 0 });
    expect(first.frames.map((f) => f.pageIndex)).toEqual([0, 1]);
    expect(first.mountedThisSync.map((f) => f.pageIndex)).toEqual([0, 1]);
    expect(host.childElementCount).toBe(2);

    const second = manager.sync({ pages, visiblePageIndices: [1, 2], geometryEpoch: 0 });
    expect(second.frames.map((f) => f.pageIndex)).toEqual([1, 2]);
    // page 1 already mounted at same rect/epoch -> not re-mounted; page 2 fresh.
    expect(second.mountedThisSync.map((f) => f.pageIndex)).toEqual([2]);
    expect(host.childElementCount).toBe(2);
  });

  it("re-applies geometry when the epoch changes", () => {
    const events: string[] = [];
    const manager = createQuirePageStackManager({
      host: document.createElement("div"),
      ownerDocument: document,
      adapter: createFakeAdapter(events)
    });
    const pages = [page(0)];
    manager.sync({ pages, visiblePageIndices: [0], geometryEpoch: 0 });
    const bumped = manager.sync({ pages, visiblePageIndices: [0], geometryEpoch: 1 });
    expect(bumped.mountedThisSync.map((f) => f.pageIndex)).toEqual([0]);
  });

  it("drops oldest pooled frames when the byte budget is exceeded", () => {
    const events: string[] = [];
    const host = document.createElement("div");
    const manager = createQuirePageStackManager({
      host,
      ownerDocument: document,
      adapter: createFakeAdapter(events, { pooledSurfaceBytes: 6 }),
      maxPooledFrames: 8,
      maxPooledSurfaceBytes: 10
    });
    const pages = [page(0), page(1), page(2), page(3)];

    manager.sync({ pages, visiblePageIndices: [0, 1], geometryEpoch: 0 });
    manager.sync({ pages, visiblePageIndices: [], geometryEpoch: 0 });
    manager.sync({ pages, visiblePageIndices: [2, 3], geometryEpoch: 0 });

    expect(events.filter((event) => event === "create")).toHaveLength(3);
    expect(events.filter((event) => event === "dispose")).toHaveLength(1);
    expect(host.childElementCount).toBe(2);
    manager.sync({ pages, visiblePageIndices: [2], geometryEpoch: 0 });
    manager.destroy();
    expect(events.filter((event) => event === "dispose")).toHaveLength(3);
  });

  it("destroy removes all mounted frames", () => {
    const host = document.createElement("div");
    const manager = createQuirePageStackManager({
      host,
      ownerDocument: document,
      adapter: createFakeAdapter([])
    });
    manager.sync({ pages: [page(0)], visiblePageIndices: [0], geometryEpoch: 0 });
    manager.destroy();
    expect(host.childElementCount).toBe(0);
    expect(manager.getFrames()).toEqual([]);
  });

  it("reuses recycled surfaces within a sync and keeps only the retention budget afterwards", () => {
    const events: string[] = [];
    const host = document.createElement("div");
    let retained = 0;
    const manager = createQuirePageStackManager({
      host, ownerDocument: document,
      adapter: createFakeAdapter(events, { pooledSurfaceBytes: 100 }),
      maxPooledFrames: 2, maxPooledSurfaceBytes: 1000,
      readRetainedPoolBytes: () => retained
    });
    const pages = [0, 1, 2, 3].map(page);
    manager.sync({ pages, visiblePageIndices: [0, 1], geometryEpoch: 0 });
    events.length = 0;

    // Page 0 leaves and page 2 enters in one sync: its surface is reused, not created.
    manager.sync({ pages, visiblePageIndices: [1, 2], geometryEpoch: 0 });
    expect(events.filter(event => event === "create" || event === "dispose")).toEqual([]);

    // A page leaving without one entering stays pooled only within the budget.
    manager.sync({ pages, visiblePageIndices: [2], geometryEpoch: 0 });
    expect(events.filter(event => event === "dispose")).toEqual(["dispose"]);
    retained = 100;
    events.length = 0;
    manager.sync({ pages, visiblePageIndices: [], geometryEpoch: 0 });
    expect(events.filter(event => event === "dispose")).toEqual([]);
    manager.destroy();
  });
});
