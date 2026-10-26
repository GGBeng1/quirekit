import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { describe, expect, it } from "vitest";
import type { QuireDecorationLanes } from "@quirekit/view-engine";
import type { QuireSelectionGeometry } from "@quirekit/view-engine";

import type {
  QuireLayoutSnapshot,
  QuireRetainedLayerContribution,
  QuireRetainedLayoutSnapshot
} from "@quirekit/view-engine";
import { retainQuireLayoutSnapshotForTest } from "../../../test-support/layout";
import { createEditor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import { buildQuireRenderInteractionSnapshot } from "./builder";

const region: QuireLayoutRegionRef = {
  rootId: { value: "root:body" },
  regionId: { value: "region:body" },
  kind: "body"
};

const capabilities: QuireLayoutCapabilitySet = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
};
const source = { sourceId: "fixture:region:body", range: { from: 0, to: 12 } };

const selectionGeometry: QuireSelectionGeometry = {
  carets: [],
  ranges: []
};

const selectionQueryOwner: QuireLayoutQueryProductOwner = {
  sourceRootId: "table-cell:semantic:r0:c0:g0:1",
  sourceFragmentId: "cell#p5:line-2",
  coordinateSpace: "document",
  sourceCoordinateSpace: "table-cell-local",
  region: {
    rootId: { value: "root:table-cell:semantic:r0:c0:g0:1" },
    regionId: { value: "region:table-cell:semantic:r0:c0:g0:1" },
    kind: "table-cell",
    visualInstanceId: "cell#p5"
  }
};

const decorationLane: QuireDecorationLanes = {
  interactionTargets: [],
  backgrounds: [],
  textStyles: [],
  nodes: [],
  pointMarkers: [],
  widgets: [],
  diagnostics: []
};

describe("render interaction snapshot", () => {
  it("indexes typed decoration controls above text selection", () => {
    const snapshot = buildQuireRenderInteractionSnapshot({
      layoutSnapshot: createLayoutSnapshot(),
      selectionGeometry,
      decorationLane: {
        interactionTargets: [{
          id: "decoration-interaction:checkbox",
          nodePath: "decoration-interaction/checkbox",
          range: { from: 7, to: 8 },
          rect: { x: 24, y: 30, width: 18, height: 18 },
          role: "checkbox",
          part: "control-body",
          owner: { kind: "content-control", id: "content-control:8" },
          pointerEvents: "auto",
          cursor: "pointer",
          events: { click: { handler: "word.checkbox.toggle" } }
        }],
        backgrounds: [],
        textStyles: [],
        nodes: [],
        pointMarkers: [],
        widgets: [],
        diagnostics: []
      }
    });

    expect(snapshot.hitTargets).toContainEqual(expect.objectContaining({
      id: "decoration-widget:decoration-interaction:checkbox",
      range: { from: 7, to: 8 },
      rect: { x: 24, y: 30, width: 18, height: 18 },
      layer: { plane: "controls" },
      pointerPolicy: expect.objectContaining({ kind: "dispatch" }),
      interactionHit: expect.objectContaining({
        kind: "content-control",
        controlId: "content-control:8"
      })
    }));
  });

  it("indexes zero-width annotation markers without widening their source range", () => {
    const snapshot = buildQuireRenderInteractionSnapshot({
      layoutSnapshot: createLayoutSnapshot(),
      selectionGeometry,
      decorationLane: {
        ...decorationLane,
        pointMarkers: [{
          id: "comment-point:8:marker",
          decorationId: "comment-point:8",
          range: { from: 8, to: 8 },
          rect: { x: 40, y: 20, width: 12, height: 12 },
          color: "rgba(37, 99, 235, 0.42)",
          lineWidth: 1.25
        }]
      }
    });

    expect(snapshot.hitTargets).toContainEqual(expect.objectContaining({
      id: "annotation:point-marker:comment-point:8:marker",
      range: { from: 8, to: 8 },
      rect: { x: 40, y: 20, width: 12, height: 12 },
      layer: { plane: "annotation" },
      pointerPolicy: expect.objectContaining({ kind: "pass-through" })
    }));
  });

  it("indexes render-time DOM overlays as dom-proxy layer targets", () => {
    const snapshot = buildQuireRenderInteractionSnapshot({
      layoutSnapshot: createLayoutSnapshot(),
      selectionGeometry,
      decorationLane,
      domOverlays: [
        {
          id: "comment-widget:dom-overlay",
          range: { from: 4, to: 4 },
          rect: { x: 20, y: 30, width: 80, height: 24 },
          node: { nodeType: 1 }
        }
      ]
    });

    expect(snapshot.hitTargets).toEqual([
      expect.objectContaining({
        id: "render-dom-overlay:comment-widget:dom-overlay",
        layer: { plane: "dom-proxy" },
        pointerPolicy: {
          kind: "dispatch",
          shouldFocusEditor: true,
          shouldPreventDefault: true
        },
        interactionHit: expect.objectContaining({
          kind: "control",
          controlId: "comment-widget:dom-overlay",
          region,
          source,
          capabilities
        })
      })
    ]);
    expect(snapshot.layerTargetIndex?.targetCount).toBe(1);
    expect(snapshot.layerTargetIndex?.buckets).toEqual([
      {
        bucketId: "viewport:snapshot",
        rect: { x: 0, y: 0, width: 300, height: 200 },
        targetIds: ["render-dom-overlay:comment-widget:dom-overlay"]
      }
    ]);
    expect(snapshot.layerTargetIndex?.unbucketedTargetIds).toEqual([]);
  });

  it("preserves selection and caret query owners on render-time layer targets", () => {
    const snapshot = buildQuireRenderInteractionSnapshot({
      layoutSnapshot: createLayoutSnapshot(),
      selectionGeometry: {
        ranges: [
          {
            range: { from: 5720, to: 5890 },
            rect: { x: 173, y: 5960, width: 266, height: 48 },
            queryOwner: selectionQueryOwner
          }
        ],
        carets: [
          {
            position: { pos: 5890, bias: 1 },
            rect: { x: 439, y: 5984, width: 1, height: 24 },
            queryOwner: selectionQueryOwner
          }
        ]
      },
      decorationLane
    });

    expect(snapshot.hitTargets).toEqual([
      expect.objectContaining({
        id: "selection:range:0",
        layer: expect.objectContaining({ plane: "selection" }),
        pointerPolicy: expect.objectContaining({ kind: "pass-through" }),
        queryOwner: selectionQueryOwner
      }),
      expect.objectContaining({
        id: "selection:caret:0",
        layer: expect.objectContaining({ plane: "selection" }),
        pointerPolicy: expect.objectContaining({ kind: "pass-through" }),
        queryOwner: selectionQueryOwner
      })
    ]);
  });

  it("lets active drawing text geometry replace its full object hit surface", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "drawing story text" }]
        }]
      }
    });
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.pm.doc, 4)
    ));
    const objectRegion: QuireLayoutRegionRef = {
      rootId: { value: "root:drawing" },
      regionId: { value: "region:drawing" },
      kind: "floating-object",
      visualInstanceId: "page:0:drawing"
    };
    const objectSource = {
      sourceId: "drawing:anchor",
      range: { from: 0, to: 1 }
    };
    const objectTarget = {
      id: "object:drawing",
      range: objectSource.range,
      rect: { x: 20, y: 30, width: 120, height: 80 },
      viewRegion: objectRegion,
      source: objectSource,
      capabilities,
      interactionHit: {
        kind: "object" as const,
        objectId: "drawing",
        region: objectRegion,
        source: objectSource,
        capabilities
      }
    };
    const detachedSnapshot = retainQuireLayoutSnapshotForTest({
      state: editor.state,
      documentRect: { x: 0, y: 0, width: 300, height: 200 },
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      domOverlays: [],
      hitTargets: [objectTarget],
      layerContributions: [createDrawingControlsContribution(
        objectRegion,
        objectSource
      )],
      root: {
        id: "doc",
        kind: "block",
        range: { from: 0, to: editor.state.pm.doc.content.size },
        rect: { x: 0, y: 0, width: 300, height: 200 },
        children: []
      }
    });
    const storyRegion: QuireLayoutRegionRef = {
      rootId: { value: "root:drawing-text" },
      regionId: { value: "region:word-drawing-text:drawing" },
      kind: "drawing-text",
      visualInstanceId: "page:0:drawing:text"
    };
    const snapshot: QuireRetainedLayoutSnapshot = {
      ...detachedSnapshot,
      viewGraph: {
        ...detachedSnapshot.viewGraph,
        regions: [{
          ref: storyRegion,
          source: {
            sourceId: "word-story:drawing",
            range: { from: 2, to: 10 }
          },
          rect: { x: 25, y: 35, width: 110, height: 70 },
          coordinateSpace: "document",
          capabilities
        }]
      }
    };

    const interactionSnapshot = buildQuireRenderInteractionSnapshot({
      layoutSnapshot: snapshot,
      selectionGeometry,
      decorationLane
    });

    expect(interactionSnapshot.hitTargets.some(
      (target) => target.id === objectTarget.id
    )).toBe(false);
    expect(interactionSnapshot.hitTargets.some(
      (target) => target.id.includes("resize-east")
    )).toBe(true);
    expect(interactionSnapshot.hitTargets).toContainEqual(
      expect.objectContaining({
        id: "active-nested-story:drawing-controls",
        range: { from: 2, to: 10 },
        rect: { x: 25, y: 35, width: 110, height: 70 },
        layer: { plane: "drawing" },
        pointerPolicy: expect.objectContaining({ kind: "select" }),
        viewRegion: storyRegion,
        source: expect.objectContaining({
          sourceId: "word-story:drawing"
        })
      })
    );
  });

  it("keeps header-anchored objects out of hit testing until the header owns selection", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "body text" }] },
          { type: "paragraph", content: [{ type: "text", text: "header story" }] }
        ]
      }
    });
    const headerScope = {
      region: {
        rootId: { value: "root:header" },
        regionId: { value: "region:header" },
        kind: "header" as const
      },
      source: { sourceId: "header:default", range: { from: 11, to: 25 } },
      capabilities
    };
    const objectRegion: QuireLayoutRegionRef = {
      rootId: { value: "root:watermark" },
      regionId: { value: "region:watermark" },
      kind: "floating-object"
    };
    const objectSource = { sourceId: "watermark", range: { from: 12, to: 13 } };
    const objectTarget = {
      id: "object:watermark",
      range: objectSource.range,
      rect: { x: 40, y: 40, width: 200, height: 100 },
      interactionScope: headerScope,
      viewRegion: objectRegion,
      source: objectSource,
      capabilities,
      interactionHit: {
        kind: "object" as const,
        objectId: "watermark",
        region: objectRegion,
        source: objectSource,
        capabilities
      }
    };
    const createSnapshot = () => retainQuireLayoutSnapshotForTest({
      state: editor.state,
      documentRect: { x: 0, y: 0, width: 300, height: 200 },
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      domOverlays: [],
      hitTargets: [objectTarget],
      root: {
        id: "doc",
        kind: "block",
        range: { from: 0, to: editor.state.pm.doc.content.size },
        rect: { x: 0, y: 0, width: 300, height: 200 },
        children: []
      }
    });
    const hasObjectTarget = () => buildQuireRenderInteractionSnapshot({
      layoutSnapshot: createSnapshot(),
      selectionGeometry,
      decorationLane
    }).hitTargets.some((target) => target.id === objectTarget.id);

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.pm.doc, 3)
    ));
    expect(hasObjectTarget()).toBe(false);

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(
      TextSelection.create(editor.state.pm.doc, 15)
    ));
    expect(hasObjectTarget()).toBe(true);
  });
});

/**
 * Creates selected drawing controls tied to one independently editable story.
 *
 * @param objectRegion - Exact retained owner region.
 * @param objectSource - Exact retained owner source.
 * @returns Conditional controls contribution for the object occurrence.
 */
function createDrawingControlsContribution(
  objectRegion: QuireLayoutRegionRef,
  objectSource: {
    readonly sourceId: string;
    readonly range: { readonly from: number; readonly to: number };
  }
): QuireRetainedLayerContribution {
  const root = {
    id: objectRegion.rootId,
    kind: "block-container" as const,
    source: objectSource,
    capabilities
  };

  return {
    contributionId: "drawing-controls",
    owner: {
      root,
      region: objectRegion,
      source: objectSource,
      capabilities
    },
    range: objectSource.range,
    rect: { x: 20, y: 30, width: 120, height: 80 },
    coordinateSpace: "document",
    layer: { plane: "controls" },
    paintSurface: "overlay",
    activation: {
      kind: "selected-owner",
      relatedRange: { from: 2, to: 10 }
    },
    commands: [],
    domOverlays: [],
    targets: [{
      id: "resize-east",
      nodePath: "0",
      rect: { x: 136, y: 66, width: 8, height: 8 },
      part: "resize-east",
      pointerEvents: "auto",
      events: {}
    }]
  };
}

/**
 * Creates a minimal layout snapshot fixture with retained owner facts.
 *
 * @returns Layout snapshot fixture.
 */
function createLayoutSnapshot(): QuireRetainedLayoutSnapshot {
  return retainQuireLayoutSnapshotForTest({
    state: { tag: "state" } as unknown as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 300, height: 200 },
    viewportRect: { x: 0, y: 0, width: 300, height: 200 },
    domOverlays: [],
    hitTargets: [],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 12 },
      rect: { x: 0, y: 0, width: 300, height: 200 },
      viewRegion: region,
      viewCapabilities: capabilities,
      layoutOwner: { region, source, capabilities },
      children: []
    }
  });
}
