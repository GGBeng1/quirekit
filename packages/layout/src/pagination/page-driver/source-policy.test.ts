import { describe, expect, it } from "vitest";
import { createQuirePaginationCheckpointStore } from "../cache";
import type { QuireMeasuredContainer, QuireMeasuredContainerItem } from "../container";
import { driveQuireMeasuredContainerPages } from "../page-driver";
import { createQuirePaginationQueryIndex } from "../query-index";
import type { QuirePageFragment } from "../types";

const pageGeometry = {
  pageRect: { x: 0, y: 0, width: 100, height: 40 },
  bodyRect: { x: 10, y: 10, width: 80, height: 20 }
};

describe("page source-fragment collection policy", () => {
  it.each([125, 1250])("keeps %i page bands without reading or translating source provenance", (pageCount) => {
    let reads = 0;
    const container = createMeasuredFlow(pageCount * 2, () => { reads += 1; });
    const full = driveQuireMeasuredContainerPages({ container, pageGeometry }).fragments;
    expect(reads).toBe(pageCount * 2);
    expect(createQuirePaginationQueryIndex(full).findSourceFragmentsByPageIndex(0)).toHaveLength(2);
    reads = 0;
    const paginationCheckpointStore = createQuirePaginationCheckpointStore();
    const options = { container, pageGeometry, collectSourceFragments: false, paginationCheckpointStore };
    const first = driveQuireMeasuredContainerPages(options).fragments;
    const editedContainer = createMeasuredFlow(pageCount * 2, () => { reads += 1; }, 1);
    const second = driveQuireMeasuredContainerPages({
      ...options,
      container: editedContainer,
      dirtyRange: { from: 0, to: 1 }
    }).fragments;

    expect(reads).toBe(0);
    expect(first).toHaveLength(pageCount);
    expect(first).toEqual(full.map(withoutSourceFragments));
    expect(second).toEqual(driveQuireMeasuredContainerPages({
      container: editedContainer, pageGeometry, collectSourceFragments: false
    }).fragments);
    expect(second[1]!.range.from).toBe(first[1]!.range.from + 1);
    expect(reads).toBe(0);
    expect(paginationCheckpointStore.snapshot().suffixPagesReused).toBeGreaterThan(pageCount - 3);
    expect(first.every((page) => !Object.hasOwn(page, "sourceFragments"))).toBe(true);
  });

  it("recomputes the final widow-adjusted band without reading rejected line provenance", () => {
    let reads = 0;
    const measured = createMeasuredFlow(3, () => { reads += 1; });
    const container = {
      ...measured,
      items: measured.items.map((item) => {
        // Preserve the source getter while adding one paragraph's group policy.
        Object.defineProperty(item, "group", { value: "paragraph", enumerable: true });
        return item;
      })
    };
    const pages = driveQuireMeasuredContainerPages({
      container, pageGeometry, widows: 2, orphans: 1, collectSourceFragments: false
    }).fragments;

    expect(reads).toBe(0);
    expect(pages.map((page) => [page.range, page.sourceFlowY, page.sourceFlowHeight])).toEqual([
      [{ from: 0, to: 1 }, 0, 10],
      [{ from: 1, to: 3 }, 10, 20]
    ]);
    const omitted = driveQuireMeasuredContainerPages({
      container, pageGeometry, collectSourceFragments: false, collectSourceContextForPage: () => false
    }).fragments;
    expect(reads).toBe(0);
    expect(omitted.every((page) => page.sourceFlowY === undefined && page.sourceFragments === undefined)).toBe(true);
  });

  it.each([false, true])("isolates checkpoint source policy when switching from %s", (initialPolicy) => {
    const container = createMeasuredFlow(8);
    const paginationCheckpointStore = createQuirePaginationCheckpointStore();
    const options = { container, pageGeometry, paginationCheckpointStore, paginationGeometryKey: "caller-geometry" };
    driveQuireMeasuredContainerPages({ ...options, collectSourceFragments: initialPolicy });
    const next = driveQuireMeasuredContainerPages({
      ...options,
      collectSourceFragments: !initialPolicy,
      dirtyRange: { from: 7, to: 8 }
    });
    const fresh = driveQuireMeasuredContainerPages({ container, pageGeometry, collectSourceFragments: !initialPolicy });

    expect(next).toEqual(fresh);
    expect(paginationCheckpointStore.snapshot().prefixPagesReused).toBe(0);
  });
});

/**
 * Creates source lines with an optional character insertion in the first line.
 * @param count - Number of measured lines.
 * @param onRead - Optional provenance-read probe.
 * @param insertedCharacters - Range shift after the first line's unchanged start.
 * @returns Measured source flow with stable line identities and geometry.
 */
function createMeasuredFlow(count: number, onRead: () => void = () => {}, insertedCharacters = 0): QuireMeasuredContainer {
  return {
    id: "body", range: { from: 0, to: count + insertedCharacters },
    items: Array.from({ length: count }, (_, index): QuireMeasuredContainerItem => ({
      id: `line:${index}`, range: { from: index === 0 ? 0 : index + insertedCharacters, to: index + 1 + insertedCharacters },
      height: 10, flowTop: index * 10, flowBottom: (index + 1) * 10, canSplit: false,
      get sourceFragments(): NonNullable<QuireMeasuredContainerItem["sourceFragments"]> {
        onRead();
        return [{ kind: "textLine", ownerId: `line:${index}`, range: this.range,
          flowTop: index * 10, flowBottom: (index + 1) * 10 }];
      }
    }))
  };
}

/** @param page - Complete accepted page. @returns Identical page without optional query provenance. */
function withoutSourceFragments(page: QuirePageFragment): QuirePageFragment {
  const { sourceFragments: _fragments, ...flowPage } = page;
  return flowPage;
}
