import type { QuireExtensionViewEventHandler } from "@quirekit/core";
import {
  captureEventPointer,
  preventEventDefault,
  readEventTargetRange,
  readManipulationPayload,
  readPointerSession,
  stopEventPropagation
} from "./event-handler/event";
import {
  deleteGestureSnapshot,
  readCurrentGestureSnapshot,
  readGeometryAtPosition,
  restoreGestureSnapshot,
  writeGestureSnapshot
} from "./event-handler/gesture";
import {
  floatingObjectManipulationHandlerId
} from "./provider/layers";

/**
 * Owns one captured move or directional-resize gesture.
 *
 * Pointer capture and coordinate projection remain shared runtime concerns. The
 * extension consumes only exact target identity and renderer-space displacement,
 * then mutates source geometry through its transaction commands.
 *
 * @param context - Mounted editor and backend context.
 * @param event - Renderer-neutral pointer event.
 * @returns Whether the exact manipulation event was handled.
 */
const manipulateFloatingObject: QuireExtensionViewEventHandler = (
  { editor, status },
  event
) => {
  if (status !== "primary") {
    return false;
  }
  const range = readEventTargetRange(event);
  const payload = readManipulationPayload(event);
  const session = readPointerSession(event);
  if (range === undefined || payload === undefined || session === undefined) {
    return false;
  }

  preventEventDefault(event);
  stopEventPropagation(event);
  if (session.phase === "start") {
    const geometry = readGeometryAtPosition(editor, range.from);
    if (geometry === undefined) {
      return false;
    }
    if (!editor.commands.setNodeSelection(range.from)) {
      return false;
    }
    writeGestureSnapshot(editor, session.pointerId, {
      position: range.from,
      geometry,
      document: editor.state.doc
    });
    captureEventPointer(event);
    return true;
  }
  if (session.phase === "cancel") {
    return restoreGestureSnapshot(editor, session.pointerId);
  }

  const snapshot = readCurrentGestureSnapshot(
    editor,
    session.pointerId,
    range.from
  );
  if (snapshot === undefined) {
    deleteGestureSnapshot(editor, session.pointerId);
    return false;
  }

  const inlineDelta = session.point.x - session.previousPoint.x;
  const blockDelta = session.point.y - session.previousPoint.y;
  if (inlineDelta === 0 && blockDelta === 0) {
    if (session.phase === "end") {
      deleteGestureSnapshot(editor, session.pointerId);
    }
    return true;
  }
  const handled = payload.kind === "move"
    ? editor.commands.moveFloatingObject({ inlineDelta, blockDelta })
    : editor.commands.resizeFloatingObject({
        direction: payload.direction,
        inlineDelta,
        blockDelta
      });
  if (handled && session.phase === "update") {
    writeGestureSnapshot(editor, session.pointerId, {
      ...snapshot,
      document: editor.state.doc
    });
  }
  if (session.phase === "end") {
    deleteGestureSnapshot(editor, session.pointerId);
  }
  return handled;
};

/** qkView event handlers contributed by the floating-object extension. */
export const floatingObjectViewEventHandlers = {
  [floatingObjectManipulationHandlerId]: manipulateFloatingObject
} as const;
