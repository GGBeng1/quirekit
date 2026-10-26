import { describe, expect, it } from "vitest";
import { paginateQuireMeasuredContainer } from ".";
import type { QuireMeasuredContainer } from ".";
import type { QuirePageEndInfo } from "../types";

describe("measured container pagination", () => {
  it("returns done when every measured item fits the available height", () => {
    const container = createMeasuredContainer([
      { id: "line-0", from: 1, to: 4, height: 18 },
      { id: "line-1", from: 4, to: 7, height: 18 }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 48,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toEqual({
      kind: "done",
      range: { from: 1, to: 7 },
      consumedHeight: 36,
      nextIndex: 2,
      endInfo: createPageEndInfo()
    });
  });

  it("returns spill with merged end info when the next item does not fit", () => {
    const incomingEndInfo = createPageEndInfo({
      openMarks: ["strong"]
    });
    const container = createMeasuredContainer([
      {
        id: "list-line-0",
        from: 1,
        to: 4,
        height: 20,
        endInfo: createPageEndInfo({
          openMarks: ["strong"],
          openNodes: ["list-item"],
          continuationState: { list: { counter: 2 } }
        })
      },
      { id: "list-line-1", from: 4, to: 7, height: 40 }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 48,
      isPageTop: false,
      incomingEndInfo
    })).toEqual({
      kind: "spill",
      range: { from: 1, to: 4 },
      consumedHeight: 20,
      nextIndex: 1,
      endInfo: {
        openMarks: ["strong"],
        openNodes: ["list-item"],
        continuationState: { list: { counter: 2 } }
      }
    });
  });

  it("places an oversized indivisible item when it starts at page top", () => {
    const container = createMeasuredContainer([
      {
        id: "image-0",
        from: 10,
        to: 11,
        height: 96,
        canSplit: false
      }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 48,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toEqual({
      kind: "place-and-overflow",
      range: { from: 10, to: 11 },
      consumedHeight: 96,
      nextIndex: 1,
      endInfo: createPageEndInfo()
    });
  });

  it("spills after an item with a forced page break even when more items fit", () => {
    const container = createMeasuredContainer([
      {
        id: "line-before-break",
        from: 1,
        to: 7,
        height: 18,
        breakAfter: "page"
      },
      { id: "line-after-break", from: 8, to: 13, height: 18 }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 64,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toEqual({
      kind: "spill",
      range: { from: 1, to: 7 },
      consumedHeight: 18,
      nextIndex: 1,
      endInfo: createPageEndInfo()
    });
  });

  it("spills before an item with a forced page break when previous items fit", () => {
    const container = createMeasuredContainer([
      { id: "intro-line", from: 1, to: 4, height: 18 },
      {
        id: "next-page-line",
        from: 4,
        to: 7,
        height: 18,
        breakBefore: "page"
      }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 64,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toEqual({
      kind: "spill",
      range: { from: 1, to: 4 },
      consumedHeight: 18,
      nextIndex: 1,
      endInfo: createPageEndInfo()
    });
  });

  it("moves a keep-together group to the next page when the complete group fits there", () => {
    const container = createMeasuredContainer([
      { id: "intro", from: 0, to: 1, height: 20 },
      {
        id: "line-0",
        from: 1,
        to: 2,
        height: 10,
        group: "paragraph",
        keepTogether: true
      },
      {
        id: "line-1",
        from: 2,
        to: 3,
        height: 10,
        group: "paragraph",
        keepTogether: true
      },
      {
        id: "line-2",
        from: 3,
        to: 4,
        height: 10,
        group: "paragraph",
        keepTogether: true
      }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 40,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toMatchObject({
      kind: "spill",
      range: { from: 0, to: 1 },
      consumedHeight: 20,
      nextIndex: 1
    });
  });

  it("allows an oversized keep-together group to split at page top", () => {
    const container = createMeasuredContainer([
      {
        id: "line-0",
        from: 0,
        to: 1,
        height: 20,
        group: "paragraph",
        keepTogether: true
      },
      {
        id: "line-1",
        from: 1,
        to: 2,
        height: 20,
        group: "paragraph",
        keepTogether: true
      },
      {
        id: "line-2",
        from: 2,
        to: 3,
        height: 20,
        group: "paragraph",
        keepTogether: true
      }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 40,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toMatchObject({
      kind: "spill",
      range: { from: 0, to: 2 },
      consumedHeight: 40,
      nextIndex: 2
    });
  });

  it("moves a keep-with-next paragraph when its successor's first line would spill", () => {
    const container = createMeasuredContainer([
      { id: "intro", from: 0, to: 1, height: 20 },
      {
        id: "heading",
        from: 1,
        to: 2,
        height: 10,
        group: "heading",
        keepWithNext: true
      },
      {
        id: "body-line-0",
        from: 2,
        to: 3,
        height: 20,
        group: "body"
      },
      {
        id: "body-line-1",
        from: 3,
        to: 4,
        height: 20,
        group: "body"
      }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 40,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toMatchObject({
      kind: "spill",
      range: { from: 0, to: 1 },
      consumedHeight: 20,
      nextIndex: 1
    });
  });

  it("allows an oversized keep-with-next pair to make progress at page top", () => {
    const container = createMeasuredContainer([
      {
        id: "heading",
        from: 0,
        to: 1,
        height: 30,
        group: "heading",
        keepWithNext: true
      },
      {
        id: "body-line-0",
        from: 1,
        to: 2,
        height: 30,
        group: "body"
      }
    ]);

    expect(paginateQuireMeasuredContainer({
      container,
      startIndex: 0,
      availableHeight: 40,
      isPageTop: true,
      incomingEndInfo: createPageEndInfo()
    })).toMatchObject({
      kind: "spill",
      range: { from: 0, to: 1 },
      consumedHeight: 30,
      nextIndex: 1
    });
  });
});

/** Fixture item accepted by the measured-container test helper. */
interface MeasuredItemFixture {
  /** Stable item id. */
  readonly id: string;
  /** Inclusive document start position. */
  readonly from: number;
  /** Exclusive document end position. */
  readonly to: number;
  /** Measured item height in CSS pixels. */
  readonly height: number;
  /** Whether the item may be split by future sub-item logic. */
  readonly canSplit?: boolean | undefined;
  /** Shared paragraph group used by pagination constraints. */
  readonly group?: string | undefined;
  /** Whether every item in the current group should move together when possible. */
  readonly keepTogether?: boolean | undefined;
  /** Whether the current group should remain with the successor's first item. */
  readonly keepWithNext?: boolean | undefined;
  /** Forced break requested before this item is accepted. */
  readonly breakBefore?: "page" | undefined;
  /** Forced break requested after this item is accepted. */
  readonly breakAfter?: "page" | undefined;
  /** Resume state at the end of this item. */
  readonly endInfo?: QuirePageEndInfo | undefined;
}

/**
 * Creates a measured-container fixture for pagination contract tests.
 *
 * @param items - Measured item fixtures to include.
 * @returns Measured container fixture.
 */
function createMeasuredContainer(
  items: readonly MeasuredItemFixture[]
): QuireMeasuredContainer {
  const lastItem = items[items.length - 1];

  return {
    id: "body",
    range: {
      from: items[0]?.from ?? 0,
      to: lastItem?.to ?? 0
    },
    items: items.map((item) => ({
      id: item.id,
      range: { from: item.from, to: item.to },
      height: item.height,
      canSplit: item.canSplit ?? true,
      ...(item.group === undefined ? {} : { group: item.group }),
      ...(item.keepTogether === undefined
        ? {}
        : { keepTogether: item.keepTogether }),
      ...(item.keepWithNext === undefined
        ? {}
        : { keepWithNext: item.keepWithNext }),
      ...(item.breakBefore === undefined ? {} : { breakBefore: item.breakBefore }),
      ...(item.breakAfter === undefined ? {} : { breakAfter: item.breakAfter }),
      ...(item.endInfo === undefined ? {} : { endInfo: item.endInfo })
    }))
  };
}

/**
 * Creates page end info for test fixtures.
 *
 * @param overrides - Optional properties to override.
 * @returns Page end info.
 */
function createPageEndInfo(
  overrides: Partial<QuirePageEndInfo> = {}
): QuirePageEndInfo {
  return {
    openMarks: [],
    openNodes: [],
    ...overrides
  };
}
