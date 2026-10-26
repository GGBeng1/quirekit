import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { createEditor, type QuireEditor } from "@quirekit/core";
import type { Transaction } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import type {
  QuireInteractionSelectionTarget,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";

import { FakeCanvasMountDocument } from "@quirekit/view/test-support/canvas-mount";
import { bindHtmlMountedPointerEvents } from "./binding";
import type {
  BindHtmlMountedPointerEventsOptions,
  HtmlMountedPointerRenderState
} from "./types";

describe("HTML mounted pointer binding", () => {
  it("uses the shared editable-text cursor for retained DOM text hits", () => {
    const editor = createEditorWithParagraph("Hello world");
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const contentSurface = ownerDocument.createElement("div");
    const target = createSelectionTarget("body", 0);

    bindHtmlMountedPointerEvents({
      mountedView: {
        status: "primary",
        editable: true,
        state: editor.state.pm,
        dispatch: (transaction: Transaction) =>
          editor.dispatchTransaction(transaction),
        dispatchEvent: () => false,
        someProp: () => undefined
      },
      elements: {
        root,
        contentSurface
      },
      widgetEvents: {
        dispatchPointerEvent: () => ({
          handled: false,
          defaultPrevented: false
        }),
        hitTestPoint: () => null
      },
      measurementProvider: {
        posAtClientPoint: () => ({
          pos: 4,
          inside: -1,
          descriptorId: "html:text",
          source: target.source,
          rootId: "html:root",
          regionId: "html:body"
        }),
        coordsAtPos: () => ({
          left: 0,
          right: 1,
          top: 0,
          bottom: 20,
          descriptorId: "html:text",
          source: target.source,
          rootId: "html:root",
          regionId: "html:body"
        })
      },
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(editor),
          interactionSnapshot: createLayoutSnapshot(editor)
        },
        surfaceState: {
          viewportRect: { x: 0, y: 0, width: 320, height: 180 },
          surfaceBounds: { x: 0, y: 0, width: 320, height: 180 }
        }
      }),
      getInputBinding: () => undefined,
      focus: () => {},
      stopEvent: () => false,
      renderSelection: () => {},
      setInteractionTarget: () => {},
      setSelectionGeometryContext: () => {},
      onPointerHitTest: () => {}
    } as unknown as BindHtmlMountedPointerEventsOptions);

    contentSurface.dispatchEvent(
      createPointerEvent("pointermove", { clientX: 10, clientY: 10 })
    );

    expect(root.style.cursor).toBe("text");
  });

  it("stores both drag endpoint visual contexts from resolved endpoint hits", () => {
    const editor = createEditorWithParagraph("Hello world");
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const contentSurface = ownerDocument.createElement("div");
    const anchorTarget = createSelectionTarget("cell#p3", 4480);
    const headTarget = createSelectionTarget("cell#p5", 5960);
    const selectionContexts: QuireSelectionGeometryContext[] = [];

    bindHtmlMountedPointerEvents({
      mountedView: {
        status: "primary",
        editable: true,
        state: editor.state.pm,
        dispatch: (transaction: Transaction) =>
          editor.dispatchTransaction(transaction),
        dispatchEvent: () => false,
        someProp: () => undefined
      },
      elements: {
        root,
        contentSurface
      },
      widgetEvents: {
        dispatchPointerEvent: () => ({
          handled: false,
          defaultPrevented: false
        }),
        hitTestPoint: () => null
      },
      measurementProvider: {
        posAtClientPoint: (left: number) => ({
          pos: 4,
          inside: -1,
          descriptorId: left === 20 ? "html:head" : "html:anchor",
          source: left === 20 ? headTarget.source : anchorTarget.source,
          rootId: "html:root",
          regionId: left === 20 ? "html:head" : "html:anchor"
        }),
        coordsAtPos: () => ({
          left: 0,
          right: 1,
          top: 0,
          bottom: 20,
          descriptorId: "html:point",
          source: anchorTarget.source,
          rootId: "html:root",
          regionId: "html:body"
        })
      },
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(editor),
          interactionSnapshot: createLayoutSnapshot(editor)
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
      stopEvent: () => false,
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
    } as unknown as BindHtmlMountedPointerEventsOptions);

    contentSurface.dispatchEvent(
      createPointerEvent("pointerdown", { clientX: 10, clientY: 10 })
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointermove", { clientX: 20, clientY: 40 })
    );

    expect(selectionContexts.at(-1)).toEqual({
      viewRegion: {
        rootId: { value: "html:root" },
        regionId: { value: "html:head" },
        kind: "body"
      },
      ownerSource: headTarget.source,
      ownerCapabilities: headTarget.capabilities,
      visualContexts: [
        {
          viewRegion: {
            rootId: { value: "html:root" },
            regionId: { value: "html:anchor" },
            kind: "body"
          },
          ownerSource: anchorTarget.source,
          ownerCapabilities: anchorTarget.capabilities,
          referenceRect: { x: 0, y: 0, width: 1, height: 20 }
        },
        {
          viewRegion: {
            rootId: { value: "html:root" },
            regionId: { value: "html:head" },
            kind: "body"
          },
          ownerSource: headTarget.source,
          ownerCapabilities: headTarget.capabilities,
          referenceRect: { x: 0, y: 0, width: 1, height: 20 }
        }
      ],
      referenceRect: { x: 0, y: 0, width: 1, height: 20 }
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
 * Creates the minimal layout snapshot shape needed by pointer helper options.
 *
 * @param editor - Canonical document used to resolve hit semantics.
 * @returns Layout snapshot test double.
 */
function createLayoutSnapshot(editor: QuireEditor): HtmlMountedPointerRenderState["renderResult"]["layoutSnapshot"] {
  return {
    state: editor.state,
    viewportRect: { x: 0, y: 0, width: 320, height: 180 }
  } as HtmlMountedPointerRenderState["renderResult"]["layoutSnapshot"];
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
