import type { MountedDrawingCreationRuntime, ArmedMountedDrawingCreation, MountedDrawingCreationSession } from "./types";
import { isDrawingCreatingState, resolveMountedDrawingCreationIdentities, containsPoint } from "./helpers";
import { readMountedDrawingModel } from "../model";
import {
  createQuireDrawingControllerState,
  reduceQuireDrawingController,
  type QuireDrawingControllerIdentity,
  type QuireDrawingControllerState
} from "@quirekit/view-engine";
import { commitMountedWordDrawingTextBoxCreation } from "./commit";
import type {
  MountedDrawingCreationPointerEvent,
  CreateMountedDrawingInteractionRuntimeOptions
} from "../types";

/**
 * Creates the one-shot mounted drawing-creation runtime.
 *
 * @param options - Editor, status, preview, and retained snapshot authorities.
 * @returns Focused creation lifecycle composed by drawing interaction ownership.
 */
export function createMountedDrawingCreationRuntime(
  options: CreateMountedDrawingInteractionRuntimeOptions
): MountedDrawingCreationRuntime {
  let state = createQuireDrawingControllerState();
  let armed: ArmedMountedDrawingCreation | null = null;
  let session: MountedDrawingCreationSession | null = null;

  let lastPointer: MountedDrawingCreationPointerEvent | null = null;
  const runtime: MountedDrawingCreationRuntime = {
    arm(creationOptions = {}): boolean {
      if (
        options.status !== "primary"
        || !options.editor.isEditable
        || !["horizontal-text-box", "shape"].includes(creationOptions.drawingKind ?? "horizontal-text-box")
        || (creationOptions.drawingKind === "shape"
          && readMountedDrawingModel(options.editor).readShapeGeometry(creationOptions.geometry) === undefined)
      ) {
        return false;
      }
      const identities = resolveMountedDrawingCreationIdentities(creationOptions);
      state = createQuireDrawingControllerState();
      session = null;
      lastPointer = null;
      options.onPreviewChange?.(null);
      armed = {
        drawingKind: creationOptions.drawingKind === "shape" ? "shape" : "horizontal-text-box",
        geometry: creationOptions.geometry,
        defaultExtent: creationOptions.defaultExtent ?? (creationOptions.drawingKind === "shape"
          ? { width: 160, height: creationOptions.geometry?.kind === "preset" && creationOptions.geometry.preset === "line" ? 1 : 96 }
          : { width: 73, height: 52 }),
        ...identities
      };
      return true;
    },
    handlePointer(event): boolean {
      if (event.phase === "start") {
        const snapshot = options.getInteractionSnapshot();
        if (armed === null || snapshot === undefined) {
          return false;
        }
        const page = snapshot.pages?.find((candidate) =>
          containsPoint(candidate.pageRect, event.point)
        );
        const identity: QuireDrawingControllerIdentity = {
          objectId: armed.objectId,
          drawingId: armed.drawingId,
          rootId: "root:document",
          regionId: `region:page:${page?.pageIndex ?? "continuous"}`,
          visualInstanceId: page === undefined
            ? "continuous"
            : `page:${page.pageIndex}`,
          sourceRevision: `create:${armed.objectId}`
        };
        const transition = reduceQuireDrawingController(state, {
          kind: "begin-create",
          identity,
          drawingKind: armed.drawingKind,
          geometry: armed.geometry,
          pointerId: event.pointerId,
          clientPoint: event.clientPoint,
          point: event.point,
          defaultExtent: armed.defaultExtent
        });
        if (transition.state.kind !== "creating") {
          return false;
        }
        state = transition.state;
        session = {
          identities: {
            objectId: armed.objectId,
            drawingId: armed.drawingId,
            storyId: armed.storyId
          },
          identity,
          pointerId: event.pointerId,
          anchorPosition: event.anchorPosition
            ?? options.editor.state.pm.selection.from,
          pageIndex: page?.pageIndex ?? null
        };
        armed = null;
        lastPointer = event;
        options.onPreviewChange?.(transition.state);
        return true;
      }

      const active = session;
      if (active === null || active.pointerId !== event.pointerId) {
        return false;
      }
      lastPointer = event;
      const transition = event.phase === "cancel"
        ? reduceQuireDrawingController(state, {
            kind: "pointer-cancel",
            identity: active.identity,
            pointerId: event.pointerId
          })
        : reduceQuireDrawingController(state, {
            kind: event.phase === "end" ? "pointer-end" : "pointer-update",
            identity: active.identity,
            pointerId: event.pointerId,
            clientPoint: event.clientPoint,
            point: event.point,
            shiftKey: event.shiftKey
          });
      state = transition.state;
      if (event.phase === "update" && isDrawingCreatingState(state)) {
        options.onPreviewChange?.(state);
        return true;
      }

      const snapshot = options.getInteractionSnapshot();
      const page = active.pageIndex === null
        ? undefined
        : snapshot?.pages?.find((candidate) =>
            candidate.pageIndex === active.pageIndex
          );
      const committed = event.phase === "end"
        && transition.commit !== null
        && commitMountedWordDrawingTextBoxCreation(
          options.editor,
          active.anchorPosition,
          page,
          snapshot?.root,
          active.identities,
          transition.commit
        );
      session = null;
      lastPointer = null;
      options.onPreviewChange?.(null);
      if (committed && transition.commit?.drawingKind === "horizontal-text-box") {
        options.onTextBoxCreated?.(active.identities);
      }
      return true;
    },
    updateModifiers(shiftKey): boolean {
      return session !== null && lastPointer !== null
        && runtime.handlePointer({ ...lastPointer, phase: "update", shiftKey });
    },
    cancel(): boolean {
      const active = armed !== null || session !== null;
      if (!active) {
        return false;
      }
      armed = null;
      session = null;
      lastPointer = null;
      state = createQuireDrawingControllerState();
      options.onPreviewChange?.(null);
      return true;
    },
    isActive: () => armed !== null || session !== null,
    getState: () => state,
    destroy(): void {
      state = createQuireDrawingControllerState();
      armed = null;
      session = null;
      lastPointer = null;
      options.onPreviewChange?.(null);
    }
  };
  return runtime;
}
