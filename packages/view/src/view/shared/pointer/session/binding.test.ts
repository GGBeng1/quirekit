import { createEditor } from "@quirekit/core";
import { type Transaction } from "@quirekit/pm";
import type { QuireViewDispatchResult } from "@quirekit/renderer";
import type {
  QuireInteractionSelectionTarget,
  QuireRetainedLayoutSnapshot
} from "@quirekit/view-engine";
import { describe, expect, it, vi } from "vitest";
import { FakeCanvasMountDocument } from "../../../../../test-support/mount/canvas";
import type {
  CreateMountedPointerAutoScrollControllerOptions,
  MountedPointerAutoScrollController
} from "../auto-scroll";
import type { MountedWidgetPointerEventOptions } from "../../widget-events";
import { bindMountedPointerSession } from "./binding";
import type { BindMountedPointerSessionOptions } from "./types";

describe("shared mounted pointer session", () => {
  it("coalesces selection moves and flushes the pointerup coordinate", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }]
        }]
      }
    });
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const coordinateSurface = ownerDocument.createElement("canvas");
    coordinateSurface.width = 320;
    coordinateSurface.height = 180;
    const frameCallbacks = new Map<number, FrameRequestCallback>();
    const hitClientXs: number[] = [];
    const renderSelection = vi.fn();
    const dispatchEvent = vi.fn<(event: Event) => boolean>(() => false);
    let nextFrameHandle = 1;
    const textTarget = createTextInteractionTarget();

    const destroy = bindMountedPointerSession({
      mountedView: {
        status: "primary",
        editable: true,
        get state() {
          return editor.state.pm;
        },
        dispatch: (transaction: Transaction) =>
          editor.dispatchTransaction(transaction),
        dispatchEvent,
        someProp: () => undefined
      } as unknown as BindMountedPointerSessionOptions["mountedView"],
      root: root as unknown as HTMLElement,
      coordinateSurface: coordinateSurface as unknown as HTMLElement,
      cursorSurface: coordinateSurface as unknown as HTMLElement,
      eventTargets: [coordinateSurface as unknown as EventTarget],
      leaveTarget: root as unknown as EventTarget,
      widgetEvents: {
        dispatchPointerEvent: () => ({
          handled: false,
          defaultPrevented: false
        }),
        hitTestPoint: () => null
      } as unknown as BindMountedPointerSessionOptions["widgetEvents"],
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(0),
          interactionSnapshot: createLayoutSnapshot(0)
        },
        surfaceState: {
          surfaceBounds: { x: 0, y: 0, width: 320, height: 180 }
        }
      } as unknown as ReturnType<BindMountedPointerSessionOptions["getRenderState"]>),
      getInputBinding: () => undefined,
      getInteractionTarget: () => null,
      focus: () => {},
      renderSelection,
      setInteractionTarget: () => {},
      setSelectionGeometryContext: () => {},
      hitTestPointer: (options) => {
        hitClientXs.push(options.clientPoint.clientX);
        const pos = Math.min(
          6,
          Math.max(1, Math.floor(options.clientPoint.clientX / 10))
        );
        return {
          geometrySnapshot: createLayoutSnapshot(0),
          hitTestResult: {
            kind: "position",
            position: { pos, bias: 1 },
            inside: pos,
            rect: { x: pos * 10, y: 10, width: 2, height: 20 }
          },
          interactionTarget: textTarget
        };
      },
      onPointerHitTest: () => {},
      createPointerAutoScrollController: () => ({
        update: () => {},
        stop: () => {}
      }),
      requestPointerDragFrame: (callback) => {
        const handle = nextFrameHandle;
        nextFrameHandle += 1;
        frameCallbacks.set(handle, callback);
        return handle;
      },
      cancelPointerDragFrame: (handle) => {
        frameCallbacks.delete(handle);
      }
    } as BindMountedPointerSessionOptions);

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", 1, 20, 20)
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointermove", 1, 30, 20)
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointermove", 1, 40, 20)
    );

    expect(editor.state.pm.selection.from).toBe(2);
    expect(editor.state.pm.selection.to).toBe(2);
    expect(hitClientXs).toEqual([20]);
    expect(frameCallbacks).toHaveLength(1);

    ownerDocument.dispatchEvent(
      createPointerEvent("pointerup", 1, 50, 20)
    );

    expect(hitClientXs).toEqual([20, 50]);
    expect(editor.state.pm.selection.from).toBe(2);
    expect(editor.state.pm.selection.to).toBe(5);
    expect(frameCallbacks).toHaveLength(0);
    expect(renderSelection).toHaveBeenCalledTimes(2);
    expect(dispatchEvent).toHaveBeenCalledTimes(3);
    expect(dispatchEvent.mock.lastCall?.[0].type).toBe("pointerup");
    destroy();
  });

  it("keeps a stationary click collapsed when selection paint republishes geometry", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }]
        }]
      }
    });
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const coordinateSurface = ownerDocument.createElement("canvas");
    coordinateSurface.width = 320;
    coordinateSurface.height = 180;
    const textTarget = createTextInteractionTarget();
    let hitTestCount = 0;

    const destroy = bindMountedPointerSession({
      mountedView: {
        status: "primary",
        editable: true,
        get state() {
          return editor.state.pm;
        },
        dispatch: (transaction: Transaction) =>
          editor.dispatchTransaction(transaction),
        dispatchEvent: () => false,
        someProp: () => undefined
      } as unknown as BindMountedPointerSessionOptions["mountedView"],
      root: root as unknown as HTMLElement,
      coordinateSurface: coordinateSurface as unknown as HTMLElement,
      cursorSurface: coordinateSurface as unknown as HTMLElement,
      eventTargets: [coordinateSurface as unknown as EventTarget],
      leaveTarget: root as unknown as EventTarget,
      widgetEvents: {
        dispatchPointerEvent: () => ({
          handled: false,
          defaultPrevented: false
        }),
        hitTestPoint: () => null
      } as unknown as BindMountedPointerSessionOptions["widgetEvents"],
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(0),
          interactionSnapshot: createLayoutSnapshot(0)
        },
        surfaceState: {
          surfaceBounds: { x: 0, y: 0, width: 320, height: 180 }
        }
      } as unknown as ReturnType<BindMountedPointerSessionOptions["getRenderState"]>),
      getInputBinding: () => undefined,
      getInteractionTarget: () => null,
      focus: () => {},
      renderSelection: () => {},
      setInteractionTarget: () => {},
      setSelectionGeometryContext: () => {},
      hitTestPointer: () => {
        hitTestCount += 1;
        const pos = hitTestCount === 1 ? 2 : 5;
        return {
          geometrySnapshot: createLayoutSnapshot(0),
          hitTestResult: {
            kind: "position",
            position: { pos, bias: 1 },
            inside: pos,
            rect: { x: pos * 10, y: 10, width: 2, height: 20 }
          },
          interactionTarget: textTarget
        };
      },
      onPointerHitTest: () => {},
      createPointerAutoScrollController: () => ({
        update: () => {},
        stop: () => {}
      })
    } as BindMountedPointerSessionOptions);

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", 1, 20, 20)
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointerup", 1, 20, 20)
    );

    expect(hitTestCount).toBe(1);
    expect(editor.state.pm.selection.from).toBe(2);
    expect(editor.state.pm.selection.to).toBe(2);
    destroy();
  });

  it("starts a new click series after a completed text drag", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }]
        }]
      }
    });
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const coordinateSurface = ownerDocument.createElement("canvas");
    coordinateSurface.width = 320;
    coordinateSurface.height = 180;
    const textTarget = createTextInteractionTarget();

    const destroy = bindMountedPointerSession({
      mountedView: {
        status: "primary",
        editable: true,
        get state() {
          return editor.state.pm;
        },
        dispatch: (transaction: Transaction) =>
          editor.dispatchTransaction(transaction),
        dispatchEvent: () => false,
        someProp: () => undefined
      } as unknown as BindMountedPointerSessionOptions["mountedView"],
      root: root as unknown as HTMLElement,
      coordinateSurface: coordinateSurface as unknown as HTMLElement,
      cursorSurface: coordinateSurface as unknown as HTMLElement,
      eventTargets: [coordinateSurface as unknown as EventTarget],
      leaveTarget: root as unknown as EventTarget,
      widgetEvents: {
        dispatchPointerEvent: () => ({
          handled: false,
          defaultPrevented: false
        }),
        hitTestPoint: () => null
      } as unknown as BindMountedPointerSessionOptions["widgetEvents"],
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(0),
          interactionSnapshot: createLayoutSnapshot(0)
        },
        surfaceState: {
          surfaceBounds: { x: 0, y: 0, width: 320, height: 180 }
        }
      } as unknown as ReturnType<BindMountedPointerSessionOptions["getRenderState"]>),
      getInputBinding: () => undefined,
      getInteractionTarget: () => null,
      focus: () => {},
      renderSelection: () => {},
      setInteractionTarget: () => {},
      setSelectionGeometryContext: () => {},
      hitTestPointer: (options) => {
        const pos = Math.min(
          6,
          Math.max(1, Math.floor(options.clientPoint.clientX / 10))
        );
        return {
          geometrySnapshot: createLayoutSnapshot(0),
          hitTestResult: {
            kind: "position",
            position: { pos, bias: 1 },
            inside: pos,
            rect: { x: pos * 10, y: 10, width: 2, height: 20 }
          },
          interactionTarget: textTarget
        };
      },
      onPointerHitTest: () => {},
      createPointerAutoScrollController: () => ({
        update: () => {},
        stop: () => {}
      })
    } as BindMountedPointerSessionOptions);

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", 1, 20, 20, { detail: 1, timeStamp: 100 })
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointermove", 1, 50, 20, { detail: 1, timeStamp: 120 })
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointerup", 1, 50, 20, { detail: 1, timeStamp: 140 })
    );
    expect(editor.state.pm.selection.from).toBe(2);
    expect(editor.state.pm.selection.to).toBe(5);

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", 2, 20, 20, { detail: 2, timeStamp: 180 })
    );
    expect(editor.state.pm.selection.from).toBe(2);
    expect(editor.state.pm.selection.to).toBe(2);
    destroy();
  });

  it("reprojects captured drawing targets through post-scroll page realization", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const coordinateSurface = ownerDocument.createElement("canvas");
    coordinateSurface.width = 320;
    coordinateSurface.height = 180;
    const updateAutoScroll = vi.fn();
    const stopAutoScroll = vi.fn();
    const pointerDispatches: Array<Readonly<{
      type: string;
      pointerId: number;
      clientX: number;
      clientY: number;
      surfaceY: number;
    }>> = [];
    let autoScrollOptions: CreateMountedPointerAutoScrollControllerOptions | undefined;
    let realizedSurfaceY = 420;
    const dispatchTarget = createDispatchInteractionTarget();

    const destroy = bindMountedPointerSession({
      mountedView: {
        status: "primary",
        editable: true,
        state: { selection: { from: 1 } },
        dispatchEvent: () => false,
        someProp: () => undefined
      } as unknown as BindMountedPointerSessionOptions["mountedView"],
      root: root as unknown as HTMLElement,
      coordinateSurface: coordinateSurface as unknown as HTMLElement,
      cursorSurface: coordinateSurface as unknown as HTMLElement,
      eventTargets: [coordinateSurface as unknown as EventTarget],
      leaveTarget: root as unknown as EventTarget,
      widgetEvents: {
        dispatchPointerEvent: (
          event: MountedWidgetPointerEventOptions
        ): QuireViewDispatchResult => {
          pointerDispatches.push({
            type: event.type,
            pointerId: event.pointerId,
            clientX: event.clientPoint.clientX,
            clientY: event.clientPoint.clientY,
            surfaceY: event.surfaceBounds.y
          });
          return {
            handled: true,
            defaultPrevented: true,
            pointerCaptureRequested: event.type === "pointerDown"
          };
        },
        hitTestPoint: () => ({
          target: {
            cursor: "move",
            captureCursor: "none"
          }
        })
      } as unknown as BindMountedPointerSessionOptions["widgetEvents"],
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(realizedSurfaceY),
          interactionSnapshot: createLayoutSnapshot(realizedSurfaceY)
        },
        surfaceState: {
          surfaceBounds: { x: 0, y: realizedSurfaceY, width: 320, height: 180 }
        }
      } as unknown as ReturnType<BindMountedPointerSessionOptions["getRenderState"]>),
      getInputBinding: () => undefined,
      getInteractionTarget: () => null,
      focus: () => {},
      renderSelection: () => {},
      setInteractionTarget: () => {},
      setSelectionGeometryContext: () => {},
      hitTestPointer: () => ({
        geometrySnapshot: createLayoutSnapshot(),
        hitTestResult: {
          kind: "position",
          position: { pos: 1, bias: 1 },
          inside: 1,
          rect: { x: 0, y: 420, width: 20, height: 20 },
          pointerPolicy: dispatchTarget.pointerPolicy
        },
        interactionTarget: dispatchTarget
      }),
      onPointerHitTest: () => {},
      useWidgetTargetCursor: true,
      createPointerAutoScrollController: (options) => {
        autoScrollOptions = options;
        return {
          update: updateAutoScroll,
          stop: stopAutoScroll
        } satisfies MountedPointerAutoScrollController;
      }
    } as BindMountedPointerSessionOptions);

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", 1, 120, 160)
    );
    expect(coordinateSurface.style.cursor).toBe("none");
    ownerDocument.dispatchEvent(
      createPointerEvent("pointermove", 1, 124, 178)
    );
    expect(coordinateSurface.style.cursor).toBe("none");

    expect(updateAutoScroll).toHaveBeenCalledWith(expect.objectContaining({
      pointerId: 1,
      clientX: 124,
      clientY: 178
    }));
    expect(autoScrollOptions).toBeDefined();

    // The intervening scroll frame may unmount the old page surfaces and
    // publish the newly realized page before the retained pointer is replayed.
    realizedSurfaceY = 840;
    autoScrollOptions?.onScrollFrame({ clientX: 124, clientY: 178 });
    expect(pointerDispatches.filter((entry) => entry.type === "pointerMove"))
      .toEqual([
        {
          type: "pointerMove",
          pointerId: 1,
          clientX: 124,
          clientY: 178,
          surfaceY: 420
        },
        {
          type: "pointerMove",
          pointerId: 1,
          clientX: 124,
          clientY: 178,
          surfaceY: 840
        }
      ]);

    ownerDocument.dispatchEvent(
      createPointerEvent("pointerup", 1, 124, 178)
    );
    expect(coordinateSurface.style.cursor).toBe("move");
    expect(stopAutoScroll).toHaveBeenCalled();

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", 2, 120, 160)
    );
    expect(coordinateSurface.style.cursor).toBe("none");
    ownerDocument.dispatchEvent(
      createPointerEvent("pointercancel", 2, 124, 178)
    );
    expect(coordinateSurface.style.cursor).toBe("move");
    destroy();
  });

  it("keeps an active drawing creation crosshair above ordinary text cursors", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const coordinateSurface = ownerDocument.createElement("canvas");
    coordinateSurface.width = 320;
    coordinateSurface.height = 180;
    let creationActive = false;
    const creationPhases: string[] = [];

    const destroy = bindMountedPointerSession({
      mountedView: {
        status: "primary",
        editable: true,
        state: { selection: { from: 1 } },
        dispatchEvent: () => false,
        someProp: () => undefined
      } as unknown as BindMountedPointerSessionOptions["mountedView"],
      root: root as unknown as HTMLElement,
      coordinateSurface: coordinateSurface as unknown as HTMLElement,
      cursorSurface: coordinateSurface as unknown as HTMLElement,
      eventTargets: [coordinateSurface as unknown as EventTarget],
      leaveTarget: root as unknown as EventTarget,
      widgetEvents: {
        dispatchPointerEvent: () => ({
          handled: false,
          defaultPrevented: false
        }),
        hitTestPoint: () => null
      } as unknown as BindMountedPointerSessionOptions["widgetEvents"],
      getRenderState: () => ({
        renderResult: {
          layoutSnapshot: createLayoutSnapshot(0),
          interactionSnapshot: createLayoutSnapshot(0)
        },
        surfaceState: {
          surfaceBounds: { x: 0, y: 0, width: 320, height: 180 }
        }
      } as unknown as ReturnType<BindMountedPointerSessionOptions["getRenderState"]>),
      getInputBinding: () => undefined,
      getInteractionTarget: () => null,
      focus: () => {},
      renderSelection: () => {},
      setInteractionTarget: () => {},
      setSelectionGeometryContext: () => {},
      isDrawingCreationActive: () => creationActive,
      handleDrawingCreationPointer: (event) => {
        creationPhases.push(event.phase);
        if (event.phase === "end" || event.phase === "cancel") {
          creationActive = false;
        }
        return true;
      },
      hitTestPointer: () => ({
        geometrySnapshot: createLayoutSnapshot(0),
        hitTestResult: {
          kind: "position",
          position: { pos: 1, bias: 1 },
          inside: 1,
          rect: { x: 10, y: 10, width: 2, height: 20 }
        },
        interactionTarget: createTextInteractionTarget()
      }),
      onPointerHitTest: () => {},
      createPointerAutoScrollController: () => ({
        update: () => {},
        stop: () => {}
      })
    } as BindMountedPointerSessionOptions);

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointermove", 1, 20, 20)
    );
    expect(coordinateSurface.style.cursor).toBe("text");

    creationActive = true;
    coordinateSurface.dispatchEvent(
      createPointerEvent("pointermove", 1, 20, 20)
    );
    expect(coordinateSurface.style.cursor).toBe("crosshair");

    coordinateSurface.dispatchEvent(
      createPointerEvent("pointerdown", 1, 20, 20)
    );
    ownerDocument.dispatchEvent(
      createPointerEvent("pointermove", 1, 80, 60)
    );
    expect(coordinateSurface.style.cursor).toBe("crosshair");

    ownerDocument.dispatchEvent(
      createPointerEvent("pointerup", 1, 80, 60)
    );
    expect(creationPhases).toEqual(["start", "update", "end"]);
    expect(coordinateSurface.style.cursor).toBe("text");
    destroy();
  });
});

/**
 * Creates editable text interaction ownership for mounted selection tests.
 *
 * @returns Text target whose pointer policy starts a captured selection drag.
 */
function createTextInteractionTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    pointerPolicy: {
      kind: "select",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    }
  };
}

/**
 * Creates renderer-neutral dispatch ownership for one selected drawing control.
 *
 * @returns Control target whose pointer policy routes through qkView capture.
 */
function createDispatchInteractionTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "control",
    commandTarget: "widget",
    hitKind: "widget",
    pointerPolicy: {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    }
  };
}

/**
 * Creates the minimal retained snapshot consumed by mounted pointer projection.
 *
 * @param surfaceY - Document-space origin of the currently realized surface.
 * @returns Snapshot with one visible layout viewport.
 */
function createLayoutSnapshot(surfaceY = 420): QuireRetainedLayoutSnapshot {
  return {
    viewportRect: { x: 0, y: surfaceY, width: 320, height: 180 }
  } as QuireRetainedLayoutSnapshot;
}

/**
 * Creates a pointer event accepted by the mounted session binding.
 *
 * @param type - Native pointer lifecycle event name.
 * @param pointerId - Browser pointer identity.
 * @param clientX - Horizontal client coordinate.
 * @param clientY - Vertical client coordinate.
 * @returns Pointer event test double.
 */
function createPointerEvent(
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  pointerId: number,
  clientX: number,
  clientY: number,
  sequence: {
    readonly detail?: number | undefined;
    readonly timeStamp?: number | undefined;
  } = {}
): PointerEvent {
  return {
    type,
    button: 0,
    buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
    clientX,
    clientY,
    detail: sequence.detail,
    ctrlKey: false,
    pointerId,
    pointerType: "mouse",
    shiftKey: false,
    timeStamp: sequence.timeStamp,
    preventDefault: () => {}
  } as PointerEvent;
}
