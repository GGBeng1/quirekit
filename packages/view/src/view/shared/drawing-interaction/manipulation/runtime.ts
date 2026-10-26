import { isActiveDrawingManipulation, claimDrawingPointerEvent } from "./events";
import type { QuireViewEvent } from "@quirekit/renderer";
import {
  createQuireDrawingControllerState,
  reduceQuireDrawingController,
  type QuireDrawingManipulationEventPayload
} from "@quirekit/view-engine";
import { finishMountedDrawingManipulation } from "./finish";
import { readQuireDrawingManipulationEventPayload } from "../payload";
import {
  applyMountedDrawingRelocationToPreview,
  resolveMountedDrawingReanchor
} from "../reanchor";
import type {
  CreateMountedDrawingInteractionRuntimeOptions,
  MountedDrawingAnchorRelocation
} from "../types";
import {
  beginMountedDrawingManipulation,
  isMountedDrawingSessionCurrent,
  readCurrentMountedDrawingSource,
  type MountedDrawingInteractionSession
} from "./session";
import type { MountedDrawingManipulationRuntime } from "./types";

/**
 * Creates mounted transient state for selected Word drawing controls.
 *
 * @param options - Editor, editability, and current retained snapshot authority.
 * @returns Runtime event handler and lifecycle cleanup.
 */
export function createMountedDrawingManipulationRuntime(
  options: CreateMountedDrawingInteractionRuntimeOptions
): MountedDrawingManipulationRuntime {
  let state = createQuireDrawingControllerState();
  let session: MountedDrawingInteractionSession | null = null;
  let previewRelocation: MountedDrawingAnchorRelocation | undefined;

  /**
   * Handles one compiled selected drawing event handler.
   *
   * @param event - Renderer-neutral captured pointer event.
   * @returns Whether this built-in runtime consumed the event.
   */
  const handle = (
    event: QuireViewEvent<unknown, QuireDrawingManipulationEventPayload>
  ): boolean => {
    const payload = readQuireDrawingManipulationEventPayload(event.payload);
    const pointer = event.pointerSession;
    if (
      options.status !== "primary"
      || payload === undefined
      || pointer === undefined
      || event.point === undefined
      || event.clientPoint === undefined
    ) {
      return false;
    }

    if (pointer.phase === "start") {
      if (!options.editor.isEditable) return false;
      const started = beginMountedDrawingManipulation(
        options,
        event,
        payload,
        pointer.pointerId
      );
      if (started === undefined) return false;
      state = started.state;
      session = started.session;
      previewRelocation = undefined;
      event.capturePointer();
      claimDrawingPointerEvent(event);
      return true;
    }

    if (session === null || pointer.pointerId !== session.pointerId) {
      return false;
    }
    if (!options.editor.isEditable || !isMountedDrawingSessionCurrent(options, session)) {
      state = createQuireDrawingControllerState();
      session = null;
      previewRelocation = undefined;
      options.onPreviewChange?.(null);
      claimDrawingPointerEvent(event);
      return true;
    }

    const transition = pointer.phase === "cancel"
      ? reduceQuireDrawingController(state, {
          kind: "pointer-cancel",
          identity: session.identity,
          pointerId: pointer.pointerId
        })
      : reduceQuireDrawingController(state, {
          kind: pointer.phase === "end" ? "pointer-end" : "pointer-update",
          identity: session.identity,
          pointerId: pointer.pointerId,
          clientPoint: event.clientPoint,
          point: event.point,
          shiftKey: (event.nativeEvent as PointerEvent | undefined)?.shiftKey ?? false
        }, session.resizePolicy);
    state = transition.state;

    if (pointer.phase === "end") {
      const committed = finishMountedDrawingManipulation(options, session, transition.commit, previewRelocation);
      if (!committed) {
        options.onPreviewChange?.(null);
      }
      session = null;
      previewRelocation = undefined;
    } else if (pointer.phase === "cancel" || transition.rejection !== undefined) {
      session = null;
      previewRelocation = undefined;
      options.onPreviewChange?.(null);
    } else if (isActiveDrawingManipulation(state)) {
      const source = readCurrentMountedDrawingSource(options, session);
      const reanchor = source === undefined
        ? { kind: "rejected" } as const
        : resolveMountedDrawingReanchor({
            snapshot: session.snapshot,
            doc: options.editor.state.pm.doc,
            attrs: source,
            operation: state.kind === "moving"
              ? "move"
              : state.kind === "resizing"
                ? "resize"
                : state.kind === "controlling" ? "control" : "rotate",
            startFrame: state.track.startFrame,
            frame: state.track.previewFrame
          });
      previewRelocation = reanchor.kind === "reanchor"
        ? reanchor.relocation
        : undefined;
      options.onPreviewChange?.(previewRelocation === undefined
        ? state
        : applyMountedDrawingRelocationToPreview(state, previewRelocation));
    }

    claimDrawingPointerEvent(event);
    return true;
  };

  return {
    handle,
    getState: () => state,
    cancel(): boolean {
      if (session === null) return false;
      state = reduceQuireDrawingController(state, { kind: "escape" }).state;
      session = null;
      previewRelocation = undefined;
      options.onPreviewChange?.(null);
      return true;
    },
    updateModifiers(shiftKey): boolean {
      if (state.kind !== "controlling" || state.control?.kind !== "endpoint" || session === null
        || !options.editor.isEditable || !isMountedDrawingSessionCurrent(options, session)) return false;
      state = reduceQuireDrawingController(state, { kind: "pointer-update", identity: session.identity,
        pointerId: session.pointerId, clientPoint: state.pointer.clientPoint, point: state.track.currentPoint, shiftKey }).state;
      if (isActiveDrawingManipulation(state)) options.onPreviewChange?.(state);
      return true;
    },
    reset(): void {
      state = createQuireDrawingControllerState();
      session = null;
      previewRelocation = undefined;
    },
    destroy(): void {
      state = createQuireDrawingControllerState();
      session = null;
      previewRelocation = undefined;
      options.onPreviewChange?.(null);
    }
  };
}
