import { describe, expect, it } from "vitest";
import {
  createQuireViewLayerTargetDecision,
  normalizeQuireViewInteractionHitLayerFacts,
  shouldResolveQuireViewLayerTargetAsSelection,
  listQuireViewLayerStackPlaneDescriptors,
  quireViewEditorLayerStack,
  readQuireViewLayerTargetFacts,
  resolveQuireViewLayerPaintSurface,
  resolveQuireViewLayerPlaneDescriptor,
  resolveQuireViewLayerTargetFacts,
  shouldRouteQuireViewLayerTarget
} from "./stack";
import type { QuireViewInteractionHit } from "../types";

describe("view graph editor layer stack", () => {
  it("describes editor planes with display order, hit order, and default pointer policy", () => {
    expect(
      quireViewEditorLayerStack.planes.map((descriptor) => ({
        plane: descriptor.plane,
        displayOrder: descriptor.displayOrder,
        hitTestOrder: descriptor.hitTestOrder,
        pointerPolicy: descriptor.defaultPointerPolicy.kind
      }))
    ).toEqual([
      {
        plane: "page-background",
        displayOrder: 0,
        hitTestOrder: 0,
        pointerPolicy: "pass-through"
      },
      {
        plane: "drawing-behind-content",
        displayOrder: 5,
        hitTestOrder: 5,
        pointerPolicy: "select"
      },
      {
        plane: "content",
        displayOrder: 10,
        hitTestOrder: 10,
        pointerPolicy: "select"
      },
      {
        plane: "page-chrome",
        displayOrder: 20,
        hitTestOrder: 20,
        pointerPolicy: "select"
      },
      {
        plane: "selection",
        displayOrder: 30,
        hitTestOrder: 30,
        pointerPolicy: "pass-through"
      },
      {
        plane: "annotation",
        displayOrder: 40,
        hitTestOrder: 40,
        pointerPolicy: "select"
      },
      {
        plane: "drawing",
        displayOrder: 50,
        hitTestOrder: 50,
        pointerPolicy: "select"
      },
      {
        plane: "controls",
        displayOrder: 60,
        hitTestOrder: 60,
        pointerPolicy: "dispatch"
      },
      {
        plane: "dom-proxy",
        displayOrder: 70,
        hitTestOrder: 70,
        pointerPolicy: "dispatch"
      },
      {
        plane: "floating-ui",
        displayOrder: 80,
        hitTestOrder: 80,
        pointerPolicy: "dispatch"
      }
    ]);
  });

  it("filters planes by consumer without inventing backend-specific stacks", () => {
    expect(
      listQuireViewLayerStackPlaneDescriptors("interactive").map(
        (descriptor) => descriptor.plane
      )
    ).toEqual([
      "page-background",
      "drawing-behind-content",
      "content",
      "page-chrome",
      "selection",
      "annotation",
      "drawing",
      "controls",
      "dom-proxy",
      "floating-ui"
    ]);
    expect(
      listQuireViewLayerStackPlaneDescriptors("print").map(
        (descriptor) => descriptor.plane
      )
    ).toEqual([
      "page-background",
      "drawing-behind-content",
      "content",
      "page-chrome",
      "annotation",
      "drawing"
    ]);
    expect(
      listQuireViewLayerStackPlaneDescriptors("accessibility").map(
        (descriptor) => descriptor.plane
      )
    ).toEqual([
      "drawing-behind-content",
      "content",
      "page-chrome",
      "annotation",
      "drawing",
      "controls"
    ]);
  });

  it("resolves a plane descriptor for pointer and compositor consumers", () => {
    expect(resolveQuireViewLayerPlaneDescriptor("floating-ui")).toMatchObject({
      plane: "floating-ui",
      hitTestOrder: 80,
      defaultPointerPolicy: {
        kind: "dispatch"
      }
    });
  });

  it("maps editor layer planes to interactive paint surfaces without backend-specific branches", () => {
    expect(
      quireViewEditorLayerStack.planes.map((descriptor) => ({
        plane: descriptor.plane,
        paintSurface: resolveQuireViewLayerPaintSurface({
          layer: { plane: descriptor.plane }
        })
      }))
    ).toEqual([
      { plane: "page-background", paintSurface: "content" },
      { plane: "drawing-behind-content", paintSurface: "content" },
      { plane: "content", paintSurface: "content" },
      { plane: "page-chrome", paintSurface: "content" },
      { plane: "selection", paintSurface: "overlay" },
      { plane: "annotation", paintSurface: "overlay" },
      { plane: "drawing", paintSurface: "content" },
      { plane: "controls", paintSurface: "overlay" },
      { plane: "dom-proxy", paintSurface: "overlay" },
      { plane: "floating-ui", paintSurface: "overlay" }
    ]);
  });

  it("routes retained targets through the canonical layer stack policy", () => {
    expect(
      shouldRouteQuireViewLayerTarget({
        ...createCandidate("content-fallback", "content", "select"),
        hasInteractionHit: false
      })
    ).toBe(false);
    expect(
      shouldRouteQuireViewLayerTarget({
        ...createCandidate("content-target", "content", "select"),
        hasInteractionHit: true
      })
    ).toBe(true);
    expect(
      shouldRouteQuireViewLayerTarget({
        ...createCandidate("selection-overlay", "selection", "pass-through"),
        hasInteractionHit: false
      })
    ).toBe(true);
    expect(
      shouldRouteQuireViewLayerTarget({
        ...createCandidate("control-handle", "controls", "dispatch"),
        hasInteractionHit: false
      })
    ).toBe(true);
  });

  it("resolves retained target layer facts in one canonical fallback order", () => {
    expect(resolveQuireViewLayerTargetFacts({})).toEqual({
      layer: { plane: "content" },
      pointerPolicy: {
        kind: "select",
        shouldFocusEditor: true,
        shouldPreventDefault: true
      }
    });
    expect(
      resolveQuireViewLayerTargetFacts({
        interactionHit: {
          layer: { plane: "controls" },
          pointerPolicy: { kind: "focus-only" }
        }
      })
    ).toEqual({
      layer: { plane: "controls" },
      pointerPolicy: { kind: "focus-only" }
    });
    expect(
      resolveQuireViewLayerTargetFacts({
        layer: { plane: "annotation" },
        pointerPolicy: { kind: "pass-through" },
        interactionHit: {
          layer: { plane: "controls" },
          pointerPolicy: { kind: "dispatch" }
        }
      })
    ).toEqual({
      layer: { plane: "annotation" },
      pointerPolicy: { kind: "pass-through" }
    });
  });

  it("reads declared layer facts without materializing anonymous defaults", () => {
    expect(readQuireViewLayerTargetFacts({})).toBeUndefined();
    expect(
      readQuireViewLayerTargetFacts({
        layer: { plane: "annotation" }
      })
    ).toEqual({
      layer: { plane: "annotation" },
      pointerPolicy: {
        kind: "select",
        shouldFocusEditor: true,
        shouldPreventDefault: true
      }
    });
  });

  it("normalizes concrete interaction hits with inherited layer facts", () => {
    const hit = createTextInteractionHit();
    const normalized = normalizeQuireViewInteractionHitLayerFacts(hit, {
      layer: { plane: "annotation" },
      pointerPolicy: { kind: "pass-through" }
    });

    expect(normalized).toMatchObject({
      kind: "text",
      layer: { plane: "annotation" },
      pointerPolicy: { kind: "pass-through" }
    });
    expect(
      normalizeQuireViewInteractionHitLayerFacts(
        {
          ...hit,
          layer: { plane: "controls" },
          pointerPolicy: { kind: "dispatch" }
        },
        {
          layer: { plane: "annotation" },
          pointerPolicy: { kind: "pass-through" }
        }
      )
    ).toMatchObject({
      layer: { plane: "controls" },
      pointerPolicy: { kind: "dispatch" }
    });
  });

  it("creates target-chain decisions from canonical pointer policy kinds", () => {
    expect(
      createQuireViewLayerTargetDecision(
        createCandidate("selection-overlay", "selection", "pass-through")
      )
    ).toMatchObject({
      targetId: "selection-overlay",
      decision: "pass-through"
    });
    expect(
      createQuireViewLayerTargetDecision(
        createCandidate("control-handle", "controls", "dispatch")
      )
    ).toMatchObject({
      targetId: "control-handle",
      decision: "target-dispatch"
    });
    expect(
      createQuireViewLayerTargetDecision(
        createCandidate("content-target", "content", "select")
      )
    ).toMatchObject({
      targetId: "content-target",
      decision: "selected"
    });
    expect(
      createQuireViewLayerTargetDecision(
        createCandidate("dom-focus", "dom-proxy", "focus-only")
      )
    ).toMatchObject({
      targetId: "dom-focus",
      decision: "focus-only"
    });
  });

  it("classifies which retained targets should resolve text selection geometry", () => {
    expect(
      shouldResolveQuireViewLayerTargetAsSelection(
        createCandidate("content-target", "content", "select")
      )
    ).toBe(true);
    expect(
      shouldResolveQuireViewLayerTargetAsSelection(
        createCandidate("control-handle", "controls", "dispatch")
      )
    ).toBe(false);
    expect(
      shouldResolveQuireViewLayerTargetAsSelection(
        createCandidate("selection-overlay", "selection", "pass-through")
      )
    ).toBe(false);
  });
});

/**
 * Creates one layer hit candidate for layer-stack tests.
 *
 * @param targetId - Stable target id represented by the candidate.
 * @param plane - Layer plane that owns the candidate.
 * @param policyKind - Pointer policy kind active for the candidate.
 * @returns Layer hit candidate for tests.
 */
function createCandidate(
  targetId: string,
  plane: Parameters<typeof resolveQuireViewLayerPlaneDescriptor>[0],
  policyKind: ReturnType<typeof resolveQuireViewLayerPlaneDescriptor>[
    "defaultPointerPolicy"
  ]["kind"]
) {
  return {
    targetId,
    layer: {
      plane
    },
    pointerPolicy: {
      kind: policyKind
    },
    rect: { x: 0, y: 0, width: 10, height: 10 }
  };
}

/**
 * Creates a retained text interaction hit for layer-stack tests.
 *
 * @returns Text interaction hit with minimal retained ownership facts.
 */
function createTextInteractionHit(): QuireViewInteractionHit {
  const region = {
    rootId: { value: "root:body" },
    regionId: { value: "region:body" },
    kind: "body"
  } as const;

  return {
    kind: "text",
    region,
    anchor: {
      rootId: region.rootId,
      regionId: region.regionId,
      position: { pos: 0, bias: 0 },
      affinity: "after"
    },
    source: {
      sourceId: "doc:body",
      range: { from: 0, to: 4 }
    }
  };
}
