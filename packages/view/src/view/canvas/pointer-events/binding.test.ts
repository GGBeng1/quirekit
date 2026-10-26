import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { createEditor, type QuireEditor } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import type {
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";

import type { QuireViewPointerSelectionOptions } from "../../types";
import { FakeCanvasMountDocument } from "../../../../test-support/mount/canvas";
import { bindCanvasMountedPointerEvents } from "./binding";
import type {
  BindCanvasMountedPointerEventsOptions,
  CanvasMountedPointerRenderState
} from "./types";

describe("canvas mounted pointer binding", () => {
  it("stores both drag endpoint visual contexts for selection geometry", () => {
    const editor = createEditorWithParagraph("Hello world");
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const coordinateSurface = ownerDocument.createElement("canvas");
    const anchorTarget = createSelectionTarget("cell#p3", 4480);
    const headTarget = createSelectionTarget("cell#p5", 5960);
    const selectionContexts: QuireSelectionGeometryContext[] = [];

    bindCanvasMountedPointerEvents({
      mountedView: {
        status: "primary",
        editable: true,
        state: editor.state.pm,
        dispatch: (transaction: Transaction) =>
          editor.dispatchTransaction(transaction),
        dispatchEvent: () => false,
        someProp: () => undefined
      },
      canvasView: {
        hitTestPointer: (options: QuireViewPointerSelectionOptions) =>
          createPointerHitTestResult(
            options.clientPoint.clientX === 20 ? headTarget : anchorTarget
          )
      },
      elements: {
        root,
        coordinateSurface
      },
      widgetEvents: {
        dispatchPointerEvent: () => ({
          handled: false,
          defaultPrevented: false
        }),
        hitTestPoint: () => null
      },
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(),
          interactionSnapshot: createLayoutSnapshot()
        },
        surfaceState: {
          viewportRect: { x: 0, y: 0, width: 320, height: 180 },
          surfaceBounds: { x: 0, y: 0, width: 320, height: 180 }
        }
      }),
      getInputBinding: () => ({
        focus: () => {},
        resetTransientState: () => {},
        destroy: () => {}
      }),
      focus: () => {},
      renderSelection: () => {},
      setInteractionTarget: () => {},
      setSelectionGeometryContext: (
        context: QuireSelectionGeometryContext | undefined
      ) => {
        if (context !== undefined) {
          selectionContexts.push(context);
        }
      },
      onPointerHitTest: () => {}
    } as unknown as BindCanvasMountedPointerEventsOptions);

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", { clientX: 10, clientY: 10 })
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointermove", { clientX: 20, clientY: 40 })
    );

    expect(selectionContexts.at(-1)).toEqual({
      viewRegion: headTarget.region,
      queryOwner: headTarget.queryOwner,
      ownerSource: headTarget.source,
      ownerCapabilities: headTarget.capabilities,
      referenceRect: headTarget.referenceRect,
      visualContexts: [
        {
          viewRegion: anchorTarget.region,
          queryOwner: anchorTarget.queryOwner,
          ownerSource: anchorTarget.source,
          ownerCapabilities: anchorTarget.capabilities,
          referenceRect: anchorTarget.referenceRect
        },
        {
          viewRegion: headTarget.region,
          queryOwner: headTarget.queryOwner,
          ownerSource: headTarget.source,
          ownerCapabilities: headTarget.capabilities,
          referenceRect: headTarget.referenceRect
        }
      ]
    });
  });
});

/**
 * Creates a retained text selection target for one visual instance.
 *
 * @param visualInstanceId - Visual instance identity owned by the layout product.
 * @param y - Document-space top coordinate for the target reference rect.
 * @returns Retained interaction target for a selectable text position.
 */
function createSelectionTarget(
  visualInstanceId: string,
  y: number
): QuireInteractionSelectionTarget {
  const queryOwner: QuireLayoutQueryProductOwner = {
    sourceRootId: "cell:body",
    sourceFragmentId: "row-span-cell",
    coordinateSpace: "document",
    sourceCoordinateSpace: "table-cell-local",
    region: {
      rootId: { value: "root:document" },
      regionId: { value: "region:body" },
      kind: "table-cell",
      visualInstanceId
    }
  };

  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    region: queryOwner.region,
    queryOwner,
    source: {
      sourceId: `cell:${visualInstanceId}`,
      range: { from: 1, to: 12 }
    },
    capabilities: createTestCapabilities(),
    referenceRect: { x: 120, y, width: 240, height: 24 }
  };
}

/**
 * Creates an editor with one paragraph for pointer selection tests.
 *
 * @param text - Paragraph text content.
 * @returns Editor containing one paragraph.
 */
function createEditorWithParagraph(text: string): QuireEditor {
  return createEditor({
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }]
        }
      ]
    }
  });
}

/**
 * Creates a position hit-test result from a retained target.
 *
 * @param target - Target that owns the hit-test facts.
 * @returns Position hit-test result for pointer selection.
 */
function createHitTestResult(
  target: QuireInteractionSelectionTarget
): QuireHitTestResult {
  return {
    kind: "position",
    position: { pos: 4, bias: 1 },
    inside: -1,
    rect: target.referenceRect ?? { x: 0, y: 0, width: 1, height: 24 },
    queryOwner: target.queryOwner,
    ownerSource: target.source,
    ownerCapabilities: target.capabilities,
    viewRegion: target.region
  };
}

/**
 * Creates complete capabilities for retained pointer fixtures.
 *
 * @returns Complete editable capability facts.
 */
function createTestCapabilities() {
  return {
    editable: true,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: true,
    accessible: true
  } as const;
}

/**
 * Creates the pointer hit-test result returned by the canvas view facade.
 *
 * @param target - Retained target under the pointer.
 * @returns Pointer hit-test result carrying the resolved target facts.
 */
function createPointerHitTestResult(target: QuireInteractionSelectionTarget): {
  readonly geometrySnapshot: ReturnType<typeof createLayoutSnapshot>;
  readonly hitTestResult: QuireHitTestResult;
  readonly interactionTarget: QuireInteractionSelectionTarget;
} {
  return {
    geometrySnapshot: createLayoutSnapshot(),
    hitTestResult: createHitTestResult(target),
    interactionTarget: target
  };
}

/**
 * Creates the minimal layout snapshot shape needed by pointer helper options.
 *
 * @returns Layout snapshot test double.
 */
function createLayoutSnapshot(): CanvasMountedPointerRenderState["renderResult"]["layoutSnapshot"] {
  return {
    viewportRect: { x: 0, y: 0, width: 320, height: 180 }
  } as CanvasMountedPointerRenderState["renderResult"]["layoutSnapshot"];
}

/**
 * Creates a fake pointer event used by mounted pointer binding tests.
 *
 * @param type - Pointer event type.
 * @param point - Client point carried by the event.
 * @returns Pointer event test double.
 */
function createPointerEvent(
  type: string,
  point: { readonly clientX: number; readonly clientY: number }
): PointerEvent {
  return {
    type,
    button: 0,
    buttons: 1,
    clientX: point.clientX,
    clientY: point.clientY,
    ctrlKey: false,
    pointerId: 1,
    pointerType: "mouse",
    shiftKey: false,
    preventDefault: () => {}
  } as PointerEvent;
}
