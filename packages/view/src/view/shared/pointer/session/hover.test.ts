import { expect, it, vi } from "vitest";
import { FakeCanvasMountDocument } from "../../../../../test-support/mount/canvas";
import { bindMountedPointerSession } from "./binding";
import type { BindMountedPointerSessionOptions } from "./types";

it("uses the accepted object hit for hover without another geometry query or selection update", () => {
  const ownerDocument = new FakeCanvasMountDocument();
  const root = ownerDocument.createElement("section");
  const surface = ownerDocument.createElement("canvas");
  surface.width = 320;
  surface.height = 180;
  let overObject = true;
  let editable = true;
  let creationActive = false;
  let targetCursor: string | undefined;
  const dispatch = vi.fn();
  const renderSelection = vi.fn();
  const setInteractionTarget = vi.fn();
  const snapshot = { viewportRect: { x: 0, y: 0, width: 320, height: 180 } };
  const hitTestPointer = vi.fn(() => ({
    geometrySnapshot: snapshot,
    hitTestResult: { kind: "position", position: { pos: 1, bias: 1 }, inside: 1,
      rect: { x: 20, y: 20, width: 2, height: 20 } },
    interactionTarget: { domain: overObject ? "object" : "text",
      commandTarget: overObject ? "object" : "editable-text", hitKind: overObject ? "object" : "position",
      pointerPolicy: { kind: "select", shouldFocusEditor: true, shouldPreventDefault: true } }
  }));
  const destroy = bindMountedPointerSession({
    mountedView: { status: "primary", get editable() { return editable; },
      dispatchEvent: () => false, dispatch, someProp: () => undefined },
    root, coordinateSurface: surface, cursorSurface: surface, eventTargets: [surface], leaveTarget: root,
    widgetEvents: {
      dispatchPointerEvent: () => ({ handled: false, defaultPrevented: false }),
      hitTestPoint: () => targetCursor === undefined ? null : { target: { cursor: targetCursor } }
    },
    getRenderState: () => ({ renderResult: { layoutSnapshot: snapshot, interactionSnapshot: snapshot },
      surfaceState: { surfaceBounds: snapshot.viewportRect } }),
    getInputBinding: () => undefined, getInteractionTarget: () => null,
    focus: () => {}, renderSelection, setInteractionTarget, setSelectionGeometryContext: () => {},
    isDrawingCreationActive: () => creationActive, hitTestPointer, onPointerHitTest: () => {},
    useWidgetTargetCursor: true, clearCursorOnLeave: true,
    createPointerAutoScrollController: () => ({ update: () => {}, stop: () => {} })
  } as unknown as BindMountedPointerSessionOptions);

  /** Sends one native-shaped hover event without buttons or selection mutation. */
  function hover(): void {
    surface.dispatchEvent({ type: "pointermove", pointerId: 1, pointerType: "mouse", buttons: 0,
      clientX: 20, clientY: 20, preventDefault: () => {} } as PointerEvent);
  }
  hover();
  expect(surface.style.cursor).toBe("move");
  overObject = false;
  hover();
  expect(surface.style.cursor).toBe("text");
  overObject = true;
  targetCursor = "ew-resize";
  hover();
  expect(surface.style.cursor).toBe("ew-resize");
  targetCursor = undefined;
  editable = false;
  hover();
  expect(surface.style.cursor).toBe("default");
  editable = true;
  creationActive = true;
  hover();
  expect(surface.style.cursor).toBe("crosshair");
  creationActive = false;
  root.dispatchEvent({ type: "pointerleave" } as PointerEvent);
  expect(surface.style.cursor).toBe("");
  expect(hitTestPointer).toHaveBeenCalledTimes(5);
  expect(dispatch).not.toHaveBeenCalled();
  expect(renderSelection).not.toHaveBeenCalled();
  expect(setInteractionTarget).not.toHaveBeenCalled();
  destroy();
});
