import type { DrawingAnchor, DrawingAnchorPatch } from "@quirekit/drawing-geometry";
import type { QuireEditor } from "@quirekit/core";
import type { QuireDrawingControllerCommitIntent } from "@quirekit/view-engine";
import { readMountedDrawingModel } from "./model";
import type { MountedDrawingAnchorRelocation } from "./types";

/**
 * Commits one completed drawing manipulation through the Word command boundary.
 *
 * @param editor - Editor receiving the single final command.
 * @param position - Exact source position before the anchor node.
 * @param attrs - Revalidated current anchor attributes.
 * @param intent - Final controller commit intent.
 * @param relocation - Optional target-page source ownership for a move.
 * @returns Whether the registered Word command accepted the update.
 */
export function commitMountedWordDrawingManipulation(
  editor: QuireEditor,
  position: number,
  attrs: DrawingAnchor,
  intent: QuireDrawingControllerCommitIntent,
  relocation?: MountedDrawingAnchorRelocation
): boolean {
  const patch = createMountedWordDrawingManipulationPatch(
    attrs,
    intent,
    relocation
  );
  return patch !== undefined
    && readMountedDrawingModel(editor).updateAnchor(editor, {
      position,
      historyBoundary: true,
      attrs: patch,
      ...(relocation === undefined
        ? {}
        : { targetPosition: relocation.targetPosition })
    });
}

/**
 * Translates one final document-space controller intent into Word source intent.
 *
 * Alignment placement cannot safely absorb an arbitrary visual displacement,
 * so operations requiring an origin shift are capability-gated to offset
 * placement instead of silently rewriting semantic alignment.
 *
 * @param attrs - Revalidated current anchor attributes.
 * @param intent - Final controller commit intent.
 * @param relocation - Optional target-page source and reference geometry.
 * @returns Word anchor patch, or undefined when source intent cannot represent it.
 */
export function createMountedWordDrawingManipulationPatch(
  attrs: DrawingAnchor,
  intent: QuireDrawingControllerCommitIntent,
  relocation?: MountedDrawingAnchorRelocation
): DrawingAnchorPatch | undefined {
  const previous = intent.previousFrame;
  if (
    previous === undefined
    || intent.identity.objectId !== attrs.objectId
    || intent.identity.drawingId !== attrs.drawing.drawingId
  ) {
    return undefined;
  }
  const deltaX = intent.frame.rect.x - previous.rect.x;
  const deltaY = intent.frame.rect.y - previous.rect.y;

  if (intent.kind === "move") {
    if (
      attrs.horizontalPosition.kind !== "offset"
      || attrs.verticalPosition.kind !== "offset"
    ) {
      return undefined;
    }
    return {
      horizontalPosition: {
        ...attrs.horizontalPosition,
        offset: relocation === undefined
          ? attrs.horizontalPosition.offset + deltaX
          : relocation.frame.rect.x - relocation.inlineReferenceRect.x
      },
      verticalPosition: {
        ...attrs.verticalPosition,
        offset: relocation === undefined
          ? attrs.verticalPosition.offset + deltaY
          : relocation.frame.rect.y - relocation.blockReferenceRect.y
      }
    };
  }

  if (intent.kind === "resize" || intent.kind === "control") {
    if (intent.kind === "control" && (intent.drawing === undefined
      || intent.drawing.drawingId !== attrs.drawing.drawingId)) return undefined;
    if (
      (deltaX !== 0 && attrs.horizontalPosition.kind !== "offset")
      || (deltaY !== 0 && attrs.verticalPosition.kind !== "offset")
    ) {
      return undefined;
    }
    return {
      drawing: {
        ...(intent.kind === "control" ? intent.drawing as typeof attrs.drawing : attrs.drawing),
        extent: {
          width: intent.frame.rect.width,
          height: intent.frame.rect.height
        }
      },
      ...(deltaX === 0 || attrs.horizontalPosition.kind !== "offset"
        ? {}
        : {
            horizontalPosition: {
              ...attrs.horizontalPosition,
              offset: attrs.horizontalPosition.offset + deltaX
            }
          }),
      ...(deltaY === 0 || attrs.verticalPosition.kind !== "offset"
        ? {}
        : {
            verticalPosition: {
              ...attrs.verticalPosition,
              offset: attrs.verticalPosition.offset + deltaY
            }
          })
    };
  }

  if (intent.kind === "rotate") {
    return {
      drawing: {
        ...attrs.drawing,
        transform: {
          ...attrs.drawing.transform,
          rotation: intent.frame.rotation
        }
      }
    };
  }

  return undefined;
}
