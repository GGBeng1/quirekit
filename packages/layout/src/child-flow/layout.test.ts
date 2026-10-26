import { describe, expect, it } from "vitest";
import { layoutQuireChildFlow } from "./layout";

describe("layoutQuireChildFlow", () => {
  it("produces stable consumer-neutral results for visual tracks", () => {
    const layout = layoutQuireChildFlow({
      root: {
        id: "root",
        kind: "extension-container",
        range: { from: 1, to: 9 },
        placement: {
          parentId: "source",
          rect: { x: 0, y: 0, width: 100, height: 80 },
          contentRect: { x: 0, y: 0, width: 100, height: 80 }
        },
        localRect: { x: 0, y: 0, width: 100, height: 80 },
        writingMode: "horizontal-tb",
        dependencySignature: "width:100"
      },
      items: [{
        id: "paragraph",
        sourceId: "paragraph",
        range: { from: 1, to: 9 },
        localRect: { x: 0, y: 0, width: 100, height: 40 }
      }],
      tracks: [{
        id: "page:2",
        rect: { x: 20, y: 300, width: 100, height: 40 },
        coordinateSpace: "document",
        pageIndex: 2
      }],
      sourceBand: { top: 0, bottom: 80 }
    });

    expect(layout.results).toEqual([expect.objectContaining({
      id: "root:page:2:source-flow:0-40",
      trackId: "page:2",
      localToResult: { x: 20, y: 300 },
      coordinateSpace: "document",
      fragments: [expect.objectContaining({
        id: "paragraph",
        rect: { x: 20, y: 300, width: 100, height: 40 }
      })]
    })]);
    expect(layout.results[0]).not.toHaveProperty("queryProducts");
    expect(layout.results[0]).not.toHaveProperty("viewRoot");
    expect(layout.results[0]).not.toHaveProperty("displayChunks");
    expect(layout.nextSourceFlowY).toBe(40);
    expect(layout.complete).toBe(false);
  });
});
