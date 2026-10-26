import { describe, expect, it } from "vitest";
import { paginateQuireMeasuredContainer } from "./paginate";
import type { QuireMeasuredContainerItem } from "./types";

/** @param index - Source position. @param patch - Pagination constraints. @returns Ten-pixel measured line. */
function line(index: number, patch: Partial<QuireMeasuredContainerItem> = {}): QuireMeasuredContainerItem {
  return { id: String(index), range: { from: index, to: index + 1 }, height: 10, canSplit: false, ...patch };
}

/** @param body - Successor constraints. @param pageHeight - Available page height. @returns First page result. */
function paginate(body: Partial<QuireMeasuredContainerItem>, pageHeight = 35) {
  const items = [line(0), line(1, { group: "heading", keepWithNext: true }),
    ...[2, 3, 4].map(index => line(index, { group: "body", ...body }))];
  return paginateQuireMeasuredContainer({ container: { id: "body", range: { from: 0, to: 5 }, items },
    startIndex: 0, availableHeight: pageHeight, isPageTop: true, incomingEndInfo: { openNodes: [], openMarks: [] } });
}

describe("keep-with-next successor constraints", () => {
  it("moves the heading with an unsplittable successor when their pair fits a fresh page", () => {
    expect(paginate({ keepTogether: true }, 45)).toMatchObject({ kind: "spill", nextIndex: 1, consumedHeight: 10 });
  });
  it("reserves the successor's orphan minimum instead of just its first line", () => {
    expect(paginate({ groupOrphans: 2 })).toMatchObject({ kind: "spill", nextIndex: 1, consumedHeight: 10 });
  });
  it("keeps explicit page breaks authoritative", () => {
    expect(paginate({ keepTogether: true, breakBefore: "page" }, 45)).toMatchObject({ kind: "spill", nextIndex: 2 });
  });
  it("does not endlessly move a pair that cannot fit even on an empty page", () => {
    expect(paginate({ keepTogether: true }, 35)).toMatchObject({ kind: "spill", nextIndex: 2 });
  });
  it("moves a complete body/signature/date chain before accepting the body ending", () => {
    const items = [line(0), line(1, { keepWithNext: true, keepTogether: true }),
      line(2, { keepWithNext: true, keepTogether: true }), line(3, { keepTogether: true })];
    expect(paginateQuireMeasuredContainer({ container: { id: "chain", range: { from: 0, to: 4 }, items },
      startIndex: 0, availableHeight: 35, isPageTop: true, incomingEndInfo: { openNodes: [], openMarks: [] }
    })).toMatchObject({ kind: "spill", nextIndex: 1, consumedHeight: 10 });
  });
  it("stops a keep chain at an explicit break", () => {
    const items = [line(0), line(1, { keepWithNext: true }),
      line(2, { keepWithNext: true, breakAfter: "page" }), line(3)];
    expect(paginateQuireMeasuredContainer({ container: { id: "chain", range: { from: 0, to: 4 }, items },
      startIndex: 0, availableHeight: 35, isPageTop: true, incomingEndInfo: { openNodes: [], openMarks: [] }
    })).toMatchObject({ kind: "spill", nextIndex: 3, consumedHeight: 30 });
  });
  it("lets an oversized chain advance and keeps its fitting tail together", () => {
    const items = [line(0), line(1, { keepWithNext: true }), line(2, { keepWithNext: true }), line(3)];
    const options = { container: { id: "chain", range: { from: 0, to: 4 }, items },
      startIndex: 0, availableHeight: 25, isPageTop: true, incomingEndInfo: { openNodes: [], openMarks: [] } };
    expect(paginateQuireMeasuredContainer(options)).toMatchObject({ kind: "spill", nextIndex: 2 });
    expect(paginateQuireMeasuredContainer({ ...options, startIndex: 2 })).toMatchObject({ kind: "done", nextIndex: 4 });
  });
  it("resolves a long keep chain iteratively with linear height reads", () => {
    let reads = 0;
    const count = 4096;
    const items = Array.from({ length: count }, (_, index) => ({ ...line(index), keepWithNext: index < count - 1,
      /** @returns Counted measured line height. */
      get height() { reads += 1; return 1; }
    }));
    expect(paginateQuireMeasuredContainer({ container: { id: "chain", range: { from: 0, to: count }, items },
      startIndex: 0, availableHeight: count, isPageTop: true, incomingEndInfo: { openNodes: [], openMarks: [] }
    })).toMatchObject({ kind: "done", nextIndex: count });
    expect(reads).toBeLessThan(count * 7);
  });
});
