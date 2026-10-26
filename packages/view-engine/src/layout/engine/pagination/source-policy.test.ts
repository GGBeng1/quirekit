import { describe, expect, it } from "vitest";
import {
  createQuirePaginationCheckpointStore,
  driveQuireMeasuredContainerPages,
  readQuirePreparedPaginationResult,
  writeQuirePreparedPaginationResult
} from "@quirekit/layout/pagination";
import type { QuirePageFragment } from "@quirekit/layout/pagination";
import { createLayoutDocument, createLineFragments, createPageGeometry } from "../../../../test-support/layout/pagination";
import { createQuirePaginationGeometryKey, paginateQuireLayoutDocument, prepareQuireLayoutDocumentPagination } from ".";
import { buildQuireBodyMeasuredContainer } from "./measured-source";
import { projectQuireLayoutDocumentToPages } from "./projection";

const document = createLayoutDocument([{
  id: "paragraph", from: 1, to: 25, y: 0, height: 192,
  textFragments: createLineFragments({ lineCount: 8, y: 0 })
}]);
const pageGeometry = createPageGeometry(48);

describe("canonical page source policy", () => {
  it("keeps the default key stable and distinguishes omitted page provenance", () => {
    const full = createQuirePaginationGeometryKey({ pageGeometry });
    expect(createQuirePaginationGeometryKey({ pageGeometry, collectSourceFragments: true })).toBe(full);
    expect(createQuirePaginationGeometryKey({ pageGeometry, collectSourceFragments: false })).not.toBe(full);
  });

  it("projects every window from flow bands with the same geometry and visible products", () => {
    const full = prepareQuireLayoutDocumentPagination({ document, pageGeometry });
    const phases: string[] = [];
    const flow = prepareQuireLayoutDocumentPagination({
      document, pageGeometry, collectSourceFragments: false,
      trace: (phase) => phases.push(phase.name)
    });
    expect(flow.pages).toEqual(full.pages.map(withoutSourceFragments));
    for (const pageIndex of [0, 3, 0]) {
      const clips = [flow.pages[pageIndex]!.pageRect];
      const project = projectQuireLayoutDocumentToPages({ document: flow, projectionClipRects: clips });
      const compatibility = paginateQuireLayoutDocument({ document, pageGeometry, projectionClipRects: clips });
      expect({ ...project, pages: [] }).toEqual({ ...compatibility, pages: [] });
    }
    expect(phases.filter((name) => name === "layout:paginate:drive")).toHaveLength(1);
  });

  it.each([false, true])("never mixes checkpoint modes after starting with %s", (initialPolicy) => {
    const paginationCheckpointStore = createQuirePaginationCheckpointStore();
    prepareQuireLayoutDocumentPagination({ document, pageGeometry, paginationCheckpointStore, collectSourceFragments: initialPolicy });
    const next = prepareQuireLayoutDocumentPagination({
      document, pageGeometry, paginationCheckpointStore, collectSourceFragments: !initialPolicy,
      layoutDirtyRange: {
        reason: "content", changedRange: { from: 22, to: 23 },
        firstTopLevelBlockIndex: 0, firstTopLevelBlockRange: document.children[0]!.range
      }
    });
    expect(next).toEqual(prepareQuireLayoutDocumentPagination({ document, pageGeometry, collectSourceFragments: !initialPolicy }));
    expect(paginationCheckpointStore.snapshot().prefixPagesReused).toBe(0);
  });

  it("consumes an exact full prepared result without source-list traversal or another page drive", () => {
    const paginationCheckpointStore = createQuirePaginationCheckpointStore();
    const container = buildQuireBodyMeasuredContainer(document.children);
    const geometryKey = createQuirePaginationGeometryKey({ pageGeometry });
    const full = driveQuireMeasuredContainerPages({ container, pageGeometry }).fragments;
    // Prepared output remains full for independent callers. Any iteration of its
    // page source lists during canonical consumption would reintroduce suffix work.
    const prepared = full.map((page) => Object.freeze({
      ...page,
      sourceFragments: new Proxy(page.sourceFragments!, {
        get(target, key, receiver) {
          if (key === Symbol.iterator || key === "map") {
            throw new Error("Prepared source lists must not be traversed");
          }
          return Reflect.get(target, key, receiver);
        }
      })
    }));
    Object.freeze(prepared);
    writeQuirePreparedPaginationResult(paginationCheckpointStore, container, geometryKey, prepared);
    const phases: string[] = [];
    const flow = prepareQuireLayoutDocumentPagination({
      document, pageGeometry, paginationCheckpointStore, collectSourceFragments: false,
      trace: (phase) => phases.push(phase.name)
    });

    expect(phases).not.toContain("layout:paginate:drive");
    expect(flow.pages).toEqual(full.map(withoutSourceFragments));
    expect(flow.pages.every((page) => !Object.hasOwn(page, "sourceFragments"))).toBe(true);
    expect(prepareQuireLayoutDocumentPagination({ document, pageGeometry, paginationCheckpointStore }).pages).toBe(prepared);
    expect(readQuirePreparedPaginationResult(paginationCheckpointStore, container, geometryKey)).toBe(prepared);
    expect(prepared.every((page) => page.sourceFragments.length === 2)).toBe(true);
  });
});

/** @param page - Complete accepted page. @returns Page geometry and source bands without query provenance. */
function withoutSourceFragments(page: QuirePageFragment): QuirePageFragment {
  const { sourceFragments: _fragments, ...flow } = page;
  return flow;
}
