import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireInlineTextRun } from "@quirekit/layout/inline";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../types";
import { defineQuireLazyLayoutSignature } from "@quirekit/layout/block-flow";
import { markQuireTextFragmentsSortedByLineTop } from "@quirekit/layout/text";
import type { QuireLayoutBoxSubLayoutFragment } from "../../../sub-layout";
import { createQuireTestSubLayoutProjection } from "../../../../../../test-support/layout/sub-layout-projection";
import { splitQuireLayoutBoxAcrossPages } from "./project";
import type { QuirePageBodyProjection } from "../types";

describe("split layout box across pages", () => {
  it("splits leaf text fragments by measured source-flow page bands", () => {
    const boxes = splitQuireLayoutBoxAcrossPages(
      {
        id: "leaf",
        range: { from: 1, to: 10 },
        rect: { x: 10, y: 10, width: 100, height: 60 },
        inlineLayoutRect: { x: 10, y: 10, width: 100, height: 60 },
        paragraphDecoration: {
          fillStyle: "#F0F4FA",
          inlineOffset: 12,
          inlineSize: 76,
          top: { style: "single", lineWidth: 1, space: 0 },
          bottom: { style: "single", lineWidth: 1, space: 0 },
          firstFragment: true,
          lastFragment: true
        },
        textFragments: [
          createFragment({
            id: "line-a",
            range: { from: 1, to: 5 },
            y: 10,
            baseline: 18
          }),
          createFragment({
            id: "line-b",
            range: { from: 5, to: 10 },
            y: 60,
            baseline: 68
          })
        ]
      },
      [
        createProjection({ pageIndex: 0, pageY: 0, sourceFlowY: 0 }),
        createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 50 })
      ],
      () => []
    );

    expect(boxes.map((box) => box.id)).toEqual(["leaf#p0", "leaf#p1"]);
    expect(boxes.map((box) => box.range)).toEqual([
      { from: 1, to: 5 },
      { from: 5, to: 10 }
    ]);
    expect(boxes.map((box) => box.rect)).toEqual([
      { x: 110, y: 10, width: 100, height: 10 },
      { x: 110, y: 210, width: 100, height: 10 }
    ]);
    expect(boxes.map((box) => box.inlineLayoutRect)).toEqual([
      { x: 110, y: 10, width: 100, height: 10 },
      { x: 110, y: 210, width: 100, height: 10 }
    ]);
    expect(boxes.map((box) => box.paragraphDecoration)).toEqual([
      {
        fillStyle: "#F0F4FA",
        inlineOffset: 12,
        inlineSize: 76,
        top: { style: "single", lineWidth: 1, space: 0 },
        bottom: { style: "single", lineWidth: 1, space: 0 },
        firstFragment: true,
        lastFragment: false
      },
      {
        fillStyle: "#F0F4FA",
        inlineOffset: 12,
        inlineSize: 76,
        top: { style: "single", lineWidth: 1, space: 0 },
        bottom: { style: "single", lineWidth: 1, space: 0 },
        firstFragment: false,
        lastFragment: true
      }
    ]);
  });

  it("keeps ordered measured text leaf splitting page-local", () => {
    const fragments = markQuireTextFragmentsSortedByLineTop([
      createFragment({
        id: "line-a",
        range: { from: 1, to: 5 },
        y: 10,
        baseline: 18
      }),
      createFragment({
        id: "line-b",
        range: { from: 5, to: 10 },
        y: 60,
        baseline: 68
      })
    ]);
    const boxes = splitQuireLayoutBoxAcrossPages(
      {
        id: "leaf",
        range: { from: 1, to: 10 },
        rect: { x: 10, y: 10, width: 100, height: 60 },
        inlineLayoutRect: { x: 10, y: 10, width: 100, height: 60 },
        textRuns: [
          createTextRun({ text: "abcd", range: { from: 1, to: 5 } }),
          createTextRun({ text: "efghi", range: { from: 5, to: 10 } })
        ],
        textFragments: fragments
      },
      [
        createProjection({ pageIndex: 0, pageY: 0, sourceFlowY: 0 }),
        createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 50 })
      ],
      () => []
    );

    expect(boxes.map((box) => ({
      id: box.id,
      range: box.range,
      rect: box.rect,
      inlineLayoutRect: box.inlineLayoutRect,
      textRuns: box.textRuns?.map((run) => ({
        text: run.text,
        range: run.range
      })),
      fragmentIds: box.textFragments?.map((fragment) => fragment.id)
    }))).toEqual([
      {
        id: "leaf#p0",
        range: { from: 1, to: 5 },
        rect: { x: 110, y: 10, width: 100, height: 10 },
        inlineLayoutRect: { x: 110, y: 10, width: 100, height: 10 },
        textRuns: [{ text: "abcd", range: { from: 1, to: 5 } }],
        fragmentIds: ["line-a"]
      },
      {
        id: "leaf#p1",
        range: { from: 5, to: 10 },
        rect: { x: 110, y: 210, width: 100, height: 10 },
        inlineLayoutRect: { x: 110, y: 210, width: 100, height: 10 },
        textRuns: [{ text: "efghi", range: { from: 5, to: 10 } }],
        fragmentIds: ["line-b"]
      }
    ]);
  });

  it("unions ordered measured text leaf bounds once per page bucket", () => {
    const fragments = markQuireTextFragmentsSortedByLineTop([
      createFragment({
        id: "line-a",
        range: { from: 1, to: 5 },
        y: 10,
        baseline: 18
      }),
      createFragment({
        id: "line-b",
        range: { from: 5, to: 11 },
        y: 30,
        baseline: 38
      }),
      createFragment({
        id: "line-c",
        range: { from: 11, to: 16 },
        y: 70,
        baseline: 78
      })
    ]);
    const boxes = splitQuireLayoutBoxAcrossPages(
      {
        id: "leaf",
        range: { from: 1, to: 16 },
        rect: { x: 10, y: 10, width: 100, height: 70 },
        textFragments: fragments
      },
      [
        createProjection({ pageIndex: 0, pageY: 0, sourceFlowY: 0 }),
        createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 50 })
      ],
      () => []
    );

    expect(boxes.map((box) => ({
      id: box.id,
      range: box.range,
      rect: box.rect,
      fragmentIds: box.textFragments?.map((fragment) => fragment.id)
    }))).toEqual([
      {
        id: "leaf#p0",
        range: { from: 1, to: 11 },
        rect: { x: 110, y: 10, width: 80, height: 30 },
        fragmentIds: ["line-a", "line-b"]
      },
      {
        id: "leaf#p1",
        range: { from: 11, to: 16 },
        rect: { x: 110, y: 220, width: 80, height: 10 },
        fragmentIds: ["line-c"]
      }
    ]);
  });

  it("does not materialize lazy source layout signatures while splitting ordered leaves", () => {
    const fragments = markQuireTextFragmentsSortedByLineTop([
      createFragment({
        id: "line-a",
        range: { from: 1, to: 5 },
        y: 10,
        baseline: 18
      }),
      createFragment({
        id: "line-b",
        range: { from: 5, to: 10 },
        y: 60,
        baseline: 68
      })
    ]);
    let materializedSignature = false;
    const box = defineQuireLazyLayoutSignature(
      {
        id: "leaf",
        range: { from: 1, to: 10 },
        rect: { x: 10, y: 10, width: 100, height: 60 },
        textFragments: fragments
      },
      () => {
        materializedSignature = true;
        return "same-local-lines";
      }
    );

    const boxes = splitQuireLayoutBoxAcrossPages(
      box,
      [
        createProjection({ pageIndex: 0, pageY: 0, sourceFlowY: 0 }),
        createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 50 })
      ],
      () => []
    );

    expect(boxes.map((item) => item.id)).toEqual(["leaf#p0", "leaf#p1"]);
    expect(materializedSignature).toBe(false);
  });

  it("buckets already-projected container children by visual page rect before range", () => {
    const projectedChild = createBox({
      id: "child#p1",
      range: { from: 1, to: 10 },
      rect: { x: 120, y: 220, width: 80, height: 20 }
    });
    const [container] = splitQuireLayoutBoxAcrossPages(
      createContainer({
        id: "parent",
        range: { from: 1, to: 40 },
        rect: { x: 10, y: 0, width: 100, height: 120 },
        children: [
          createBox({
            id: "child",
            range: { from: 1, to: 10 },
            rect: { x: 10, y: 0, width: 80, height: 20 }
          })
        ]
      }),
      [
        createProjection({ pageIndex: 0, pageY: 0, sourceFlowY: 0 }),
        createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 50 })
      ],
      () => [projectedChild]
    );

    expect(container?.id).toBe("parent#p1");
    expect(container?.range).toEqual({ from: 1, to: 10 });
    expect(container?.rect).toEqual(projectedChild.rect);
    expect((container as QuireLayoutContainer | undefined)?.children).toEqual([
      projectedChild
    ]);
  });

  it("projects retained sub-layout results into page-local owners", () => {
    const firstSourceBox = createBox({
      id: "child:first",
      range: { from: 1, to: 5 },
      rect: { x: 20, y: 10, width: 80, height: 20 },
      textFragments: [createFragment({
        id: "line:first",
        range: { from: 1, to: 5 },
        y: 10,
        baseline: 18
      })]
    });
    const secondSourceBox = createBox({
      id: "child:second",
      range: { from: 6, to: 10 },
      rect: { x: 20, y: 60, width: 80, height: 20 },
      textFragments: [createFragment({
        id: "line:second",
        range: { from: 6, to: 10 },
        y: 60,
        baseline: 68
      })]
    });
    const sourceOwner = {
      id: "owner",
      range: { from: 1, to: 10 },
      rect: { x: 10, y: 0, width: 100, height: 100 },
      subLayoutFragments: [
        createSubLayoutFragment({
          fragmentId: "sub:first",
          sourceBox: firstSourceBox,
          sourceY: 10,
          sourceRange: { from: 1, to: 5 }
        }),
        createSubLayoutFragment({
          fragmentId: "sub:second",
          sourceBox: secondSourceBox,
          sourceY: 60,
          sourceRange: { from: 6, to: 10 }
        })
      ]
    } as QuireLayoutBox & {
      readonly subLayoutFragments: readonly QuireLayoutBoxSubLayoutFragment[];
    };

    const boxes = splitQuireLayoutBoxAcrossPages(
      sourceOwner,
      [
        createProjection({ pageIndex: 0, pageY: 0, sourceFlowY: 0 }),
        createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 50 })
      ],
      () => []
    );

    expect(boxes).toHaveLength(2);
    expect(boxes.map((box) => ({ id: box.id, rect: box.rect }))).toEqual([
      {
        id: "owner#p0",
        rect: { x: 110, y: 0, width: 100, height: 50 }
      },
      {
        id: "owner#p1",
        rect: { x: 110, y: 200, width: 100, height: 50 }
      }
    ]);

    const pageResults = boxes.map((box) =>
      (box as typeof sourceOwner).subLayoutFragments
        .map((fragment) => fragment.subLayout)
    );
    expect(pageResults.map((results) => results.map((result) => ({
      fragmentId: result.geometry.id,
      sourceIds: result.geometry.fragments.map((child) => child.sourceId),
      sourceBoxRects: result.view.fragmentSources.map((source) => source.sourceBox.rect),
      childRects: result.geometry.fragments.map((child) => child.rect),
      selectionRects: result.view.queryProducts.selectionRects.map((entry) => entry.rect),
      caretRects: result.view.queryProducts.caretStops.map((entry) => entry.rect),
      hitRects: result.view.queryProducts.hitTargets.map((target) => target.rect),
      inputRects: result.view.queryProducts.inputAnchors.map((entry) => entry.rect),
      visualInstanceId: result.view.queryProducts.hitTargets[0]
        ?.viewRegion?.visualInstanceId
    })))).toEqual([
      [{
        fragmentId: "sub:first:page:0",
        sourceIds: ["child:first"],
        sourceBoxRects: [{ x: 120, y: 10, width: 80, height: 20 }],
        childRects: [{ x: 120, y: 10, width: 80, height: 20 }],
        selectionRects: [{ x: 120, y: 12, width: 40, height: 10 }],
        caretRects: [{ x: 120, y: 12, width: 1, height: 10 }],
        hitRects: [{ x: 120, y: 10, width: 80, height: 20 }],
        inputRects: [{ x: 120, y: 12, width: 1, height: 10 }],
        visualInstanceId: "sub:first:page:0"
      }],
      [{
        fragmentId: "sub:second:page:1",
        sourceIds: ["child:second"],
        sourceBoxRects: [{ x: 120, y: 210, width: 80, height: 20 }],
        childRects: [{ x: 120, y: 210, width: 80, height: 20 }],
        selectionRects: [{ x: 120, y: 212, width: 40, height: 10 }],
        caretRects: [{ x: 120, y: 212, width: 1, height: 10 }],
        hitRects: [{ x: 120, y: 210, width: 80, height: 20 }],
        inputRects: [{ x: 120, y: 212, width: 1, height: 10 }],
        visualInstanceId: "sub:second:page:1"
      }]
    ]);

    const fragmentIds = pageResults.flatMap((results) =>
      results.map((result) => result.geometry.id)
    );
    const visualInstanceIds = pageResults.flatMap((results) =>
      results.map((result) =>
        result.view.queryProducts.hitTargets[0]?.viewRegion?.visualInstanceId
      )
    );
    expect(new Set(fragmentIds).size).toBe(fragmentIds.length);
    expect(new Set(visualInstanceIds).size).toBe(visualInstanceIds.length);
  });

  it("omits retained sub-layout owners when the measured window accepts no fragments", () => {
    const sourceBox = createBox({
      id: "outside-child",
      range: { from: 1, to: 5 },
      rect: { x: 20, y: 10, width: 80, height: 20 },
      textFragments: [createFragment({
        id: "outside-line", range: { from: 1, to: 5 }, y: 10, baseline: 18
      })]
    });
    const sourceOwner = {
      id: "outside-owner",
      range: { from: 1, to: 5 },
      rect: { x: 10, y: 0, width: 100, height: 50 },
      subLayoutFragments: [createSubLayoutFragment({
        fragmentId: "outside-sub", sourceBox, sourceY: 10,
        sourceRange: { from: 1, to: 5 }
      })]
    };

    expect(splitQuireLayoutBoxAcrossPages(
      sourceOwner,
      [createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 100 })],
      () => []
    )).toEqual([]);
    expect(sourceBox.textFragments?.[0]?.rect.y).toBe(10);
  });

  it("keeps sub-layout occurrence geometry even when its origin range belongs elsewhere", () => {
    const sourceBox = createBox({
      id: "continued-child",
      range: { from: 1, to: 5 },
      rect: { x: 20, y: 10, width: 80, height: 20 },
      textFragments: [createFragment({
        id: "continued-line", range: { from: 1, to: 5 }, y: 10, baseline: 18
      })]
    });
    const projection = createProjection({ pageIndex: 1, pageY: 200, sourceFlowY: 0 });
    const sourceOwner = {
      id: "continued-owner",
      range: { from: 1, to: 5 },
      rect: { x: 10, y: 0, width: 100, height: 50 },
      subLayoutFragments: [createSubLayoutFragment({
        fragmentId: "continued-sub", sourceBox, sourceY: 10,
        sourceRange: { from: 1, to: 5 }
      })]
    };
    const projected = splitQuireLayoutBoxAcrossPages(sourceOwner, [{
      ...projection,
      page: { ...projection.page, range: { from: 30, to: 50 } }
    }], () => []);

    expect(projected).toHaveLength(1);
    expect(projected[0]).toMatchObject({
      id: "continued-owner#p1", range: { from: 1, to: 5 },
      rect: { x: 110, y: 200, width: 100, height: 50 }
    });
    expect(projected[0]?.subLayoutFragments?.[0]?.subLayout.view.queryProducts.hitTargets[0]
      ?.rect).toEqual({ x: 120, y: 210, width: 80, height: 20 });
  });
});

/**
 * Creates one retained sub-layout fragment with matching query products.
 *
 * @param options - Fragment identity, source box, and source-flow placement.
 * @returns Retained sub-layout fragment fixture.
 */
function createSubLayoutFragment(options: {
  /** Stable source sub-layout fragment id. */
  readonly fragmentId: string;
  /** Source child box retained by the sub-layout child fragment. */
  readonly sourceBox: QuireLayoutBox;
  /** Source-flow y coordinate of the child. */
  readonly sourceY: number;
  /** Source document range represented by the child. */
  readonly sourceRange: QuireLayoutBox["range"];
}): QuireLayoutBoxSubLayoutFragment {
  const rect = options.sourceBox.rect;
  const productRect = {
    x: rect.x,
    y: options.sourceY + 2,
    width: 40,
    height: 10
  };
  const region = {
    rootId: { value: `root:${options.fragmentId}` },
    regionId: { value: `region:${options.fragmentId}` },
    kind: "block-container" as const
  };
  const root = {
    id: `root:${options.fragmentId}`,
    kind: "extension-container" as const,
    range: options.sourceRange,
    placement: {
      parentId: "owner",
      rect: { x: 10, y: options.sourceY, width: 100, height: 40 },
      contentRect: { x: 20, y: options.sourceY, width: 80, height: 40 },
      clipRect: { x: 20, y: options.sourceY, width: 80, height: 40 }
    },
    localRect: { x: 0, y: options.sourceY, width: 80, height: 40 },
    writingMode: "horizontal-tb" as const,
    dependencySignature: `signature:${options.fragmentId}`
  };
  const child = {
    id: options.sourceBox.id,
    sourceId: options.sourceBox.id,
    range: options.sourceRange,
    rect,
    localRect: rect
  };
  const source = {
    sourceId: `source:${options.fragmentId}`,
    range: options.sourceRange
  };
  const capabilities = {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  };

  return {
    subLayout: createQuireTestSubLayoutProjection({
      root,
      resultId: options.fragmentId,
      acceptedBand: { top: options.sourceY, bottom: options.sourceY + 40 },
      fragments: [child],
      localToResult: { x: 0, y: 0 },
      contentClip: { x: 10, y: options.sourceY, width: 100, height: 40 },
      interactionClip: { x: 10, y: options.sourceY, width: 100, height: 40 },
      viewRoot: {
        ownership: {
          status: "resolved",
          root: {
            id: { value: root.id },
            kind: "block-container",
            source,
            capabilities
          },
          owner: { region, source, capabilities }
        }
      },
      fragmentSources: [{
        fragmentId: child.id,
        sourceBox: options.sourceBox
      }],
      queryProducts: {
        selectionRects: [{
          textFragmentId: `${options.fragmentId}:text`,
          range: options.sourceRange,
          rect: productRect
        }],
        caretStops: [{
          textFragmentId: `${options.fragmentId}:text`,
          position: { pos: options.sourceRange.from, bias: 1 },
          rect: { ...productRect, width: 1 },
          fragmentId: options.fragmentId
        }],
        hitTargets: [{
          id: `${options.fragmentId}:hit`,
          range: options.sourceRange,
          rect
        }],
        inputAnchors: [{
          position: { pos: options.sourceRange.from, bias: 1 },
          rect: { ...productRect, width: 1 },
          role: "caret"
        }]
      },
      continuation: null,
      dependencySignature: root.dependencySignature
    })
  };
}

/**
 * Creates a measured text fragment fixture.
 *
 * @param options - Fragment identity, range, source-flow y position, and baseline.
 * @returns Text fragment fixture.
 */
function createFragment(options: {
  /** Stable fragment id. */
  readonly id: string;
  /** Source document range represented by the fragment. */
  readonly range: QuireTextFragment["range"];
  /** Source-flow top y coordinate. */
  readonly y: number;
  /** Source-flow baseline y coordinate. */
  readonly baseline: number;
}): QuireTextFragment {
  return {
    id: options.id,
    text: "line",
    range: options.range,
    rect: { x: 10, y: options.y, width: 80, height: 10 },
    font: "12px test",
    lineHeight: 10,
    baseline: options.baseline,
    caretStops: []
  };
}

/**
 * Creates a logical inline text run fixture.
 *
 * @param options - Run text and source document range.
 * @returns Logical inline text run fixture.
 */
function createTextRun(options: {
  /** Text content owned by the run. */
  readonly text: string;
  /** Source document range represented by the run. */
  readonly range: QuireInlineTextRun["range"];
}): QuireInlineTextRun {
  return {
    text: options.text,
    range: options.range,
    font: "12px test",
    marks: []
  };
}

/**
 * Creates a layout box fixture.
 *
 * @param options - Box id, range, and rectangle.
 * @returns Layout box fixture.
 */
function createBox(options: {
  /** Stable box id. */
  readonly id: string;
  /** Document range represented by the box. */
  readonly range: QuireLayoutBox["range"];
  /** Box rectangle. */
  readonly rect: QuireLayoutBox["rect"];
  /** Optional measured text fragments retained by the box. */
  readonly textFragments?: QuireLayoutBox["textFragments"];
}): QuireLayoutBox {
  return {
    id: options.id,
    range: options.range,
    rect: options.rect,
    ...(options.textFragments === undefined
      ? {}
      : { textFragments: options.textFragments })
  };
}

/**
 * Creates a layout container fixture.
 *
 * @param options - Container identity, range, rectangle, and children.
 * @returns Layout container fixture.
 */
function createContainer(options: {
  /** Stable container id. */
  readonly id: string;
  /** Document range represented by the container. */
  readonly range: QuireLayoutBox["range"];
  /** Container rectangle. */
  readonly rect: QuireLayoutBox["rect"];
  /** Container children. */
  readonly children: readonly QuireLayoutBox[];
}): QuireLayoutContainer {
  return {
    id: options.id,
    range: options.range,
    rect: options.rect,
    children: options.children
  };
}

/**
 * Creates a page-body projection fixture.
 *
 * @param options - Page index, page y coordinate, and accepted source-flow top.
 * @returns Page-body projection fixture.
 */
function createProjection(options: {
  /** Page index. */
  readonly pageIndex: number;
  /** Page-local y coordinate of the body rect. */
  readonly pageY: number;
  /** Accepted source-flow y coordinate. */
  readonly sourceFlowY: number;
}): QuirePageBodyProjection {
  return {
    page: {
      pageIndex: options.pageIndex,
      range: {
        from: options.pageIndex * 20 + 1,
        to: options.pageIndex * 20 + 20
      },
      pageRect: { x: 0, y: options.pageY, width: 300, height: 100 },
      bodyRect: { x: 100, y: options.pageY, width: 200, height: 100 },
      rect: { x: 100, y: options.pageY, width: 200, height: 100 },
      sourceFlowY: options.sourceFlowY,
      sourceFlowHeight: 50,
      endInfo: { openMarks: [], openNodes: [] }
    },
    dx: 100,
    dy: options.pageY - options.sourceFlowY
  };
}
