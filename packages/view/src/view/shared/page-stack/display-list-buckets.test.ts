import {
  filterQuireDisplayListToRect,
  type QuireDisplayCommand,
  type QuireDisplayList,
  type QuireRect
} from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { resolveQuireDisplayCommandPaintSurface } from "@quirekit/view-engine";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import {
  createQuirePageStackDisplayListsForRects,
  findQuirePageStackDisplayListChunk,
  realizeQuirePageStackDisplayOwnerChunks
} from "@quirekit/view-engine";
import type { QuirePageStackDisplayListChunkIndex } from "./types";
import type {
  QuireRetainedDisplayOwner,
  QuireRetainedDisplayOwnerChunk,
  QuireRetainedDisplayOwnerChunkIndex,
  QuireRetainedDisplayOwnerIndex,
  QuireRetainedDisplayPaintScope
} from "@quirekit/view-engine";

describe("createQuirePageStackDisplayListsForRects", () => {
  it("matches single-rect display-list filtering for text, line, and clips", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 240 },
      commands: [
        {
          id: "first",
          kind: "text",
          rect: { x: 10, y: 10, width: 30, height: 12 },
          text: "first",
          origin: { x: 10, y: 20 },
          font: "16px sans-serif",
          fillStyle: "#111"
        },
        {
          id: "divider",
          kind: "line",
          from: { x: 0, y: 98 },
          to: { x: 100, y: 98 },
          strokeStyle: "#ccc",
          lineWidth: 4
        },
        {
          id: "clip",
          kind: "clip",
          rect: { x: 0, y: 70, width: 100, height: 100 },
          commands: [
            {
              id: "clip-a",
              kind: "text",
              rect: { x: 10, y: 72, width: 30, height: 12 },
              text: "clip-a",
              origin: { x: 10, y: 82 },
              font: "16px sans-serif",
              fillStyle: "#111"
            },
            {
              id: "clip-b",
              kind: "text",
              rect: { x: 10, y: 122, width: 30, height: 12 },
              text: "clip-b",
              origin: { x: 10, y: 132 },
              font: "16px sans-serif",
              fillStyle: "#111"
            }
          ]
        }
      ]
    };
    const pageRects = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 100, width: 100, height: 100 }
    ];

    const buckets = createQuirePageStackDisplayListsForRects(displayList, pageRects);

    expect(buckets).toEqual(pageRects.map((rect) =>
      filterQuireDisplayListToRect(displayList, rect)
    ));
  });
});

describe("realizeQuirePageStackDisplayOwnerChunks", () => {
  it("realizes page lanes from explicit owner membership without observing a composite list", () => {
    const pages: readonly QuireLayoutPage[] = [page(0, 0), page(1, 100)];
    const contentOwner = retainedOwner("content-owner", "layout-content", [1]);
    const overlayOwner = retainedOwner("overlay-owner", "layer-overlay", [1]);
    const chromeOwner = retainedOwner("page-chrome", "page-chrome", [0, 1]);
    const ownerIndex: QuireRetainedDisplayOwnerIndex = {
      owners: [contentOwner, overlayOwner, chromeOwner],
      ownersByKey: {
        [contentOwner.key]: contentOwner,
        [overlayOwner.key]: overlayOwner,
        [chromeOwner.key]: chromeOwner
      },
      ownerKeysByPageIndex: {
        0: [chromeOwner.key],
        1: [contentOwner.key, overlayOwner.key, chromeOwner.key]
      },
      gaps: []
    };
    const chunks = [
      retainedOwnerChunk(contentOwner, [textCommand("content", "content", 110)], []),
      retainedOwnerChunk(overlayOwner, [], [{
          id: "overlay",
          kind: "fill-rect",
          rect: { x: 5, y: 112, width: 40, height: 12 },
          fillStyle: "#acf"
      }]),
      retainedOwnerChunk(chromeOwner, [{
          id: "background",
          kind: "fill-rect",
          rect: { x: 0, y: 0, width: 100, height: 200 },
          fillStyle: "#fff"
      }], [])
    ];
    const ownerChunks: QuireRetainedDisplayOwnerChunkIndex = {
      chunks,
      chunksByOwnerKey: Object.fromEntries(
        chunks.map((chunk) => [chunk.owner.key, chunk])
      )
    };

    const result = realizeQuirePageStackDisplayOwnerChunks({
      pages,
      ownerIndex,
      ownerChunks,
      bounds: { x: 0, y: 0, width: 100, height: 200 }
    });

    expect(result.chunksByPageIndex[0]?.contentDisplayList.commands.map((command) => command.id))
      .toEqual(["background"]);
    expect(result.chunksByPageIndex[0]?.overlayDisplayList.commands).toEqual([]);
    expect(result.chunksByPageIndex[1]?.contentDisplayList.commands.map((command) => command.id))
      .toEqual(["background", "content"]);
    expect(result.chunksByPageIndex[1]?.overlayDisplayList.commands.map((command) => command.id))
      .toEqual(["overlay"]);
  });

  it("creates retained content and overlay chunks for page-local records", () => {
    const pages: readonly QuireLayoutPage[] = [
      page(4, 0),
      page(7, 100)
    ];
    const contentDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: [
        textCommand("first", "first", 10),
        textCommand("second", "second", 120)
      ]
    };
    const overlayDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: [{
        id: "selection",
        kind: "fill-rect",
        layer: "overlay",
        rect: { x: 5, y: 115, width: 40, height: 12 },
        fillStyle: "rgba(59,130,246,0.25)"
      }]
    };

    const index = collectPageStackDisplayListChunks({
      pages,
      contentDisplayList,
      overlayDisplayList
    });

    expect(index.chunks.map((chunk) => chunk.pageIndex)).toEqual([4, 7]);
    expect(index.chunks.map((chunk) => chunk.retainedRecord.kind))
      .toEqual(["page-local", "page-local"]);
    expect(index.chunksByPageIndex[4]).toBe(index.chunks[0]);
    expect(index.chunksByPageIndex[7]).toBe(index.chunks[1]);
    expect(index.chunks[0]?.contentDirtyBounds)
      .toEqual({ x: 10, y: 10, width: 30, height: 12 });
    expect(index.chunks[1]?.overlayDirtyBounds)
      .toEqual({ x: 5, y: 115, width: 40, height: 12 });
    expect(index.chunks[0]?.contentDisplayList).toEqual(
      filterQuireDisplayListToRect(contentDisplayList, pages[0]!.pageRect)
    );
    expect(index.chunks[1]?.overlayDisplayList).toEqual(
      filterQuireDisplayListToRect(overlayDisplayList, pages[1]!.pageRect)
    );
  });

  it("builds sparse content and overlay chunks for clipped pages", () => {
    const pages: readonly QuireLayoutPage[] = [
      page(0, 0),
      page(1, 100),
      page(2, 200)
    ];
    const contentDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 300 },
      commands: [
        textCommand("first", "first", 10),
        textCommand("second", "second", 110),
        textCommand("third", "third", 210)
      ]
    };
    const overlayDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 300 },
      commands: [
        {
          id: "selection",
          kind: "fill-rect",
          layer: "overlay",
          rect: { x: 5, y: 205, width: 50, height: 12 },
          fillStyle: "rgba(59,130,246,0.25)"
        }
      ]
    };

    const index = collectPageStackDisplayListChunks({
      pages,
      contentDisplayList,
      overlayDisplayList,
      clipRects: [
        { x: 0, y: 100, width: 100, height: 200 }
      ]
    });

    expect(index.chunks.map((chunk) => chunk.pageIndex)).toEqual([1, 2]);
    expect(Object.keys(index.chunksByPageIndex)).toEqual(["1", "2"]);
    expect(index.chunksByPageIndex[1]).toBe(index.chunks[0]);
    expect(index.chunksByPageIndex[2]).toBe(index.chunks[1]);
    expect(findQuirePageStackDisplayListChunk(index, 1)?.contentDirtyBounds)
      .toEqual({ x: 10, y: 110, width: 30, height: 12 });
    expect(findQuirePageStackDisplayListChunk(index, 2)?.overlayDirtyBounds)
      .toEqual({ x: 5, y: 205, width: 50, height: 12 });
    expect(findQuirePageStackDisplayListChunk(index, 0)).toBeUndefined();
    expect(findQuirePageStackDisplayListChunk(index, 1)?.contentDisplayList).toEqual(
      filterQuireDisplayListToRect(contentDisplayList, pages[1]!.pageRect)
    );
    expect(findQuirePageStackDisplayListChunk(index, 2)?.overlayDisplayList).toEqual(
      filterQuireDisplayListToRect(overlayDisplayList, pages[2]!.pageRect)
    );
  });

  it("records page-clipped dirty bounds for cross-page commands", () => {
    const pages: readonly QuireLayoutPage[] = [
      page(0, 0),
      page(1, 100)
    ];
    const contentDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: [
        {
          id: "cross-page",
          kind: "fill-rect",
          rect: { x: 10, y: 90, width: 20, height: 30 },
          fillStyle: "#fde68a"
        }
      ]
    };
    const overlayDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: []
    };

    const index = collectPageStackDisplayListChunks({
      pages,
      contentDisplayList,
      overlayDisplayList
    });

    expect(findQuirePageStackDisplayListChunk(index, 0)?.contentDirtyBounds)
      .toEqual({ x: 10, y: 90, width: 20, height: 10 });
    expect(findQuirePageStackDisplayListChunk(index, 1)?.contentDirtyBounds)
      .toEqual({ x: 10, y: 100, width: 20, height: 20 });
    expect(findQuirePageStackDisplayListChunk(index, 0)?.overlayDirtyBounds)
      .toBeNull();
  });

  it("keeps runtime commands with unknown paint bounds in every page bucket", () => {
    const pages: readonly QuireLayoutPage[] = [
      page(0, 0),
      page(1, 100)
    ];
    const runtimeCommand = {
      id: "runtime",
      kind: "runtime-widget"
    } as unknown as QuireDisplayCommand;
    const contentDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: [runtimeCommand]
    };
    const overlayDisplayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: []
    };

    const index = collectPageStackDisplayListChunks({
      pages,
      contentDisplayList,
      overlayDisplayList
    });

    expect(findQuirePageStackDisplayListChunk(index, 0)?.contentDisplayList.commands)
      .toEqual([runtimeCommand]);
    expect(findQuirePageStackDisplayListChunk(index, 1)?.contentDisplayList.commands)
      .toEqual([runtimeCommand]);
    expect(findQuirePageStackDisplayListChunk(index, 0)?.contentDirtyBounds)
      .toEqual(pages[0]!.pageRect);
    expect(findQuirePageStackDisplayListChunk(index, 1)?.contentDirtyBounds)
      .toEqual(pages[1]!.pageRect);
  });

  it("realizes clipped page chunks from producer command lanes", () => {
    const pages: readonly QuireLayoutPage[] = [
      page(0, 0),
      page(1, 100)
    ];
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: [
        textCommand("first", "first", 10),
        {
          id: "selection",
          kind: "fill-rect",
          layer: "overlay",
          rect: { x: 4, y: 105, width: 40, height: 12 },
          fillStyle: "rgba(59,130,246,0.25)"
        },
        {
          id: "content-clip",
          kind: "clip",
          rect: { x: 0, y: 80, width: 100, height: 80 },
          commands: [
            textCommand("clip-first", "clip-first", 88),
            textCommand("clip-second", "clip-second", 120)
          ]
        }
      ]
    };
    const clipRects = [
      { x: 0, y: 0, width: 100, height: 200 }
    ];
    const contentDisplayList = {
      ...displayList,
      commands: displayList.commands.filter(
        (command) => resolveQuireDisplayCommandPaintSurface(command) === "content"
      )
    };
    const overlayDisplayList = {
      ...displayList,
      commands: displayList.commands.filter(
        (command) => resolveQuireDisplayCommandPaintSurface(command) === "overlay"
      )
    };
    const result = collectPageStackDisplayListChunks({
      pages,
      contentDisplayList,
      overlayDisplayList,
      clipRects
    });

    expect(findQuirePageStackDisplayListChunk(result, 0)?.contentDisplayList)
      .toEqual(filterQuireDisplayListToRect(contentDisplayList, pages[0]!.pageRect));
    expect(findQuirePageStackDisplayListChunk(result, 1)?.contentDisplayList)
      .toEqual(filterQuireDisplayListToRect(contentDisplayList, pages[1]!.pageRect));
    expect(findQuirePageStackDisplayListChunk(result, 1)?.overlayDisplayList)
      .toEqual(filterQuireDisplayListToRect(overlayDisplayList, pages[1]!.pageRect));
  });

  it("keeps page realization independent from generic layer ownership", () => {
    const pages: readonly QuireLayoutPage[] = [
      page(0, 0),
      page(1, 100)
    ];
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 200 },
      commands: [
        textCommand("first", "first", 10),
        {
          id: "selection",
          kind: "fill-rect",
          layer: "overlay",
          rect: { x: 4, y: 105, width: 40, height: 12 },
          fillStyle: "rgba(59,130,246,0.25)"
        },
        {
          id: "content-clip",
          kind: "clip",
          rect: { x: 0, y: 80, width: 100, height: 80 },
          commands: [
            textCommand("clip-first", "clip-first", 88),
            textCommand("clip-second", "clip-second", 120)
          ]
        }
      ]
    };
    const clipRects = [
      { x: 0, y: 0, width: 100, height: 200 }
    ];
    const contentDisplayList = {
      ...displayList,
      commands: displayList.commands.filter(
        (command) => resolveQuireDisplayCommandPaintSurface(command) === "content"
      )
    };
    const overlayDisplayList = {
      ...displayList,
      commands: displayList.commands.filter(
        (command) => resolveQuireDisplayCommandPaintSurface(command) === "overlay"
      )
    };
    const result = collectPageStackDisplayListChunks({
      pages,
      contentDisplayList,
      overlayDisplayList,
      clipRects
    });

    expect(findQuirePageStackDisplayListChunk(result, 0)?.overlayDisplayList)
      .toEqual(filterQuireDisplayListToRect(overlayDisplayList, pages[0]!.pageRect));
    expect(findQuirePageStackDisplayListChunk(result, 1)?.overlayDisplayList)
      .toEqual(filterQuireDisplayListToRect(overlayDisplayList, pages[1]!.pageRect));
  });

  it("prefers the page-index lookup over a linear chunk scan", () => {
    const chunk = {
      retainedRecord: {
        key: "page:7",
        kind: "page-local" as const,
        rect: { x: 0, y: 700, width: 100, height: 100 },
        pageIndex: 7,
        pageRect: { x: 0, y: 700, width: 100, height: 100 }
      },
      sourceOwnerKeys: ["layout-node:page-7"],
      pageIndex: 7,
      pageRect: { x: 0, y: 700, width: 100, height: 100 },
      contentDirtyBounds: null,
      overlayDirtyBounds: null,
      contentDisplayList: {
        bounds: { x: 0, y: 700, width: 100, height: 100 },
        commands: []
      },
      overlayDisplayList: {
        bounds: { x: 0, y: 700, width: 100, height: 100 },
        commands: []
      }
    };

    expect(findQuirePageStackDisplayListChunk({
      chunks: [],
      chunksByPageIndex: {
        7: chunk
      }
    }, 7)).toBe(chunk);
  });
});

/**
 * Builds a layout page at a document-space top.
 *
 * @param pageIndex - Zero-based page index.
 * @param y - Page top in document space.
 * @returns Layout page for chunk tests.
 */
function page(pageIndex: number, y: number): QuireLayoutPage {
  return {
    pageIndex,
    range: { from: pageIndex, to: pageIndex + 1 },
    pageRect: { x: 0, y, width: 100, height: 100 },
    bodyRect: { x: 10, y: y + 10, width: 80, height: 80 }
  };
}

/**
 * Builds a text command at a document-space top.
 *
 * @param id - Stable command id.
 * @param text - Text payload.
 * @param y - Text rectangle top.
 * @returns Text display command.
 */
function textCommand(
  id: string,
  text: string,
  y: number
): QuireDisplayList["commands"][number] {
  return {
    id,
    kind: "text",
    rect: { x: 10, y, width: 30, height: 12 },
    text,
    origin: { x: 10, y: y + 10 },
    font: "16px sans-serif",
    fillStyle: "#111"
  };
}

/**
 * Builds a minimal exact retained owner for page realization tests.
 *
 * @param productId - Stable retained product identity.
 * @param paintScope - Exact paint responsibility owned by the product.
 * @param pageIndexes - Pages that realize the owner.
 * @returns Exact retained display owner.
 */
function retainedOwner(
  productId: string,
  paintScope: QuireRetainedDisplayPaintScope,
  pageIndexes: readonly number[]
): QuireRetainedDisplayOwner {
  return {
    key: `${paintScope}:${productId}`,
    kind: paintScope === "page-chrome"
      ? "page-chrome"
      : paintScope.startsWith("layer-")
        ? "layer-contribution"
        : "layout-node",
    productId,
    paintScope,
    region: {
      rootId: { value: "root" },
      regionId: { value: "document" },
      kind: "body"
    },
    source: { sourceId: productId, range: { from: 0, to: 2 } },
    capabilities: {
      editable: true,
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    },
    range: { from: 0, to: 2 },
    rect: { x: 0, y: 0, width: 100, height: 200 },
    pageIndexes,
    ancestorOwnerKeys: [],
    lanes: [paintScope.endsWith("-overlay") ? "overlay" : "content"]
  };
}

/**
 * Builds one direct retained owner chunk for page realization tests.
 *
 * @param owner - Exact retained display owner.
 * @param contentCommands - Commands owned by the content lane.
 * @param overlayCommands - Commands owned by the overlay lane.
 * @returns Direct owner chunk containing both paint lanes.
 */
function retainedOwnerChunk(
  owner: QuireRetainedDisplayOwner,
  contentCommands: readonly QuireDisplayCommand[],
  overlayCommands: readonly QuireDisplayCommand[]
): QuireRetainedDisplayOwnerChunk {
  const bounds = { x: 0, y: 0, width: 100, height: 200 };
  return {
    owner,
    contentDisplayList: { bounds, commands: contentCommands },
    overlayDisplayList: { bounds, commands: overlayCommands },
    segments: [
      ...(contentCommands.length === 0 ? [] : [{
        lane: "content" as const,
        paintOrder: owner.paintScope === "page-chrome" ? 0 : 100,
        sequence: 0,
        commands: contentCommands
      }]),
      ...(overlayCommands.length === 0 ? [] : [{
        lane: "overlay" as const,
        paintOrder: 300,
        sequence: 1,
        commands: overlayCommands
      }])
    ]
  };
}

/** Inputs for collecting page-stack chunks from already split display lists. */
interface CollectPageStackDisplayListChunksOptions {
  /** Layout pages that may need page-local display lists. */
  readonly pages: readonly QuireLayoutPage[];
  /** Content display list already generated for the render result. */
  readonly contentDisplayList: QuireDisplayList;
  /** Overlay display list already generated for the render result. */
  readonly overlayDisplayList: QuireDisplayList;
  /** Optional document-space clips limiting which pages need chunks. */
  readonly clipRects?: readonly QuireRect[] | undefined;
}

/**
 * Realizes split content and overlay lists through canonical retained owners.
 *
 * @param options - Split display lists and page chunk inputs.
 * @returns Sparse page-local display-list chunk index.
 */
function collectPageStackDisplayListChunks(
  options: CollectPageStackDisplayListChunksOptions
): QuirePageStackDisplayListChunkIndex {
  const pageIndexes = options.pages.map((page) => page.pageIndex);
  const contentOwner = retainedOwner("content", "layout-content", pageIndexes);
  const overlayOwner = retainedOwner("overlay", "layer-overlay", pageIndexes);
  const chunks = [
    retainedOwnerChunk(contentOwner, options.contentDisplayList.commands, []),
    retainedOwnerChunk(overlayOwner, [], options.overlayDisplayList.commands)
  ];
  return realizeQuirePageStackDisplayOwnerChunks({
    pages: options.pages,
    ownerIndex: {
      owners: [contentOwner, overlayOwner],
      ownersByKey: {
        [contentOwner.key]: contentOwner,
        [overlayOwner.key]: overlayOwner
      },
      ownerKeysByPageIndex: Object.fromEntries(options.pages.map((page) => [
        page.pageIndex,
        [contentOwner.key, overlayOwner.key]
      ])),
      gaps: []
    },
    ownerChunks: {
      chunks,
      chunksByOwnerKey: {
        [contentOwner.key]: chunks[0]!,
        [overlayOwner.key]: chunks[1]!
      }
    },
    bounds: options.contentDisplayList.bounds,
    clipRects: options.clipRects
  });
}
