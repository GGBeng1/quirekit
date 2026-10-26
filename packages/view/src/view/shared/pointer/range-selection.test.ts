import { describe, expect, it } from "vitest";
import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import type {
  QuireViewPointerHitTestResult,
  QuireViewPointerSelectionOptions
} from "../../types";
import { resolveMountedPointerRangeEndpointHits } from "./range-selection";

describe("mounted pointer range endpoint hits", () => {
  it("keeps the resolved drag anchor while hit testing only the moving head", () => {
    const anchorHitTestResult = createPositionHit(2, 12);
    const headInteractionTarget = createTextInteractionTarget();
    const hitTestCalls: QuireViewPointerSelectionOptions[] = [];

    const endpointHits = resolveMountedPointerRangeEndpointHits({
      hitTestPointer: (options) => {
        hitTestCalls.push(options);

        return createPointerHitTestResult(
          createPositionHit(8, 80),
          headInteractionTarget
        );
      },
      anchorHitTestResult,
      headClientPoint: { clientX: 80, clientY: 18 },
      canvasClientRect: createClientRect(),
      geometrySnapshot: createLayoutSnapshot()
    });

    expect(endpointHits.anchorHitTestResult).toBe(anchorHitTestResult);
    expect(endpointHits.headHitTestResult).toEqual(createPositionHit(8, 80));
    expect(endpointHits.headInteractionTarget).toBe(headInteractionTarget);
    expect(hitTestCalls).toHaveLength(1);
    expect(hitTestCalls[0]?.clientPoint).toEqual({ clientX: 80, clientY: 18 });
  });

  it("does not move the anchor when a later render maps its old client point elsewhere", () => {
    const hitTestCalls: QuireViewPointerSelectionOptions[] = [];
    const anchorHitTestResult = createPositionHit(3, 10);

    const endpointHits = resolveMountedPointerRangeEndpointHits({
      hitTestPointer: (options) => {
        hitTestCalls.push(options);

        return createPointerHitTestResult(createPositionHit(9, 90));
      },
      anchorHitTestResult,
      headClientPoint: { clientX: 90, clientY: 18 },
      canvasClientRect: createClientRect(),
      geometrySnapshot: createLayoutSnapshot()
    });

    expect(endpointHits).toEqual({
      anchorHitTestResult,
      headHitTestResult: createPositionHit(9, 90),
      headInteractionTarget: null
    });
    expect(hitTestCalls.map((call) => call.clientPoint)).toEqual([
      { clientX: 90, clientY: 18 }
    ]);
  });

});

/**
 * Creates a position hit-test result for endpoint resolution tests.
 *
 * @param pos - Document position represented by the hit.
 * @param x - Horizontal document-space coordinate for the hit rectangle.
 * @returns Position hit-test result.
 */
function createPositionHit(pos: number, x: number): QuireHitTestResult {
  return {
    kind: "position",
    position: { pos, bias: 1 },
    inside: pos,
    rect: { x, y: 10, width: 4, height: 20 }
  };
}

/**
 * Creates a pointer hit-test result around one resolved hit.
 *
 * @param hitTestResult - Resolved hit-test result.
 * @returns Pointer hit-test result for the shared range endpoint helper.
 */
function createPointerHitTestResult(
  hitTestResult: QuireHitTestResult,
  interactionTarget: QuireInteractionSelectionTarget | null = null
): QuireViewPointerHitTestResult {
  return {
    geometrySnapshot: createLayoutSnapshot(),
    hitTestResult,
    interactionTarget
  };
}

/**
 * Creates a selectable text target for endpoint-retention coverage.
 *
 * @returns Selectable interaction target retained with a pointer hit.
 */
function createTextInteractionTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    pointerPolicy: { kind: "select" }
  };
}

/**
 * Creates a minimal layout snapshot used by pointer selection options.
 *
 * @returns Layout snapshot test double.
 */
function createLayoutSnapshot(): QuireLayoutSnapshot {
  return {
    viewportRect: { x: 0, y: 0, width: 120, height: 80 }
  } as QuireLayoutSnapshot;
}

/**
 * Creates a DOMRect-like client rectangle for pointer projection tests.
 *
 * @returns Client rectangle test double.
 */
function createClientRect(): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    top: 0,
    right: 120,
    bottom: 80,
    left: 0,
    toJSON: () => ({})
  } as DOMRect;
}
