import type { DrawingAnchor } from "@quirekit/drawing-geometry";
import { quireNeutralDocumentProfile, type QuireDrawingControllerCommitIntent } from "@quirekit/view-engine";
import {
  mapSpeculativeRelocationPositionToAccepted,
  resolveSpeculativeRelocationInsertionPosition
} from "../reanchor";
import {
  resolveMountedDrawingReanchor,
  type MountedDrawingReanchorResolution
} from "../reanchor";
import type {
  CreateMountedDrawingInteractionRuntimeOptions,
  MountedDrawingAnchorRelocation
} from "../types";
import { readCurrentAnchorAttrs, type MountedDrawingInteractionSession } from "./session";

/**
 * Resolves final target-page ownership from pointer-down snapshot authority.
 *
 * @param options - Mounted runtime and latest speculative snapshot authority.
 * @param session - Pointer-down source and accepted snapshot authority.
 * @param attrs - Revalidated current Word source attrs.
 * @param intent - Final pure-controller commit intent.
 * @param previewRelocation - Latest accepted-snapshot target placement preview.
 * @returns Same-page, exact reanchor, or rejected cross-page result.
 */
export function resolveMountedDrawingCommitReanchor(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  session: MountedDrawingInteractionSession,
  attrs: DrawingAnchor,
  intent: QuireDrawingControllerCommitIntent,
  previewRelocation: MountedDrawingAnchorRelocation | undefined
): MountedDrawingReanchorResolution {
  if (intent.kind === "create") return { kind: "rejected" };
  if (intent.previousFrame === undefined) return { kind: "same-page" };

  const acceptedResolution = resolveMountedDrawingReanchor({
    snapshot: session.snapshot,
    doc: session.doc,
    attrs,
    operation: intent.kind,
    startFrame: intent.previousFrame,
    frame: intent.frame
  });
  if (acceptedResolution.kind !== "reanchor" || previewRelocation === undefined) {
    return acceptedResolution;
  }

  const speculativeSnapshot = options.getInteractionSnapshot();
  const sourceNode = session.doc.nodeAt(session.position);
  if (
    speculativeSnapshot === undefined
    || speculativeSnapshot.state.pm.doc === session.doc
    || sourceNode === null
  ) {
    return acceptedResolution;
  }
  const speculativeInsertion = resolveSpeculativeRelocationInsertionPosition(
    session.position,
    sourceNode.nodeSize,
    previewRelocation.targetPosition
  );
  const speculativeSource = readCurrentAnchorAttrs(
    speculativeSnapshot.documentProfile?.drawingModel ?? quireNeutralDocumentProfile.drawingModel,
    speculativeSnapshot.state.pm.doc,
    speculativeInsertion
  );
  if (
    speculativeSource?.objectId !== attrs.objectId
    || speculativeSource.drawing.drawingId !== attrs.drawing.drawingId
  ) {
    return acceptedResolution;
  }

  // The speculative layout has removed the source-side wrap exclusion. Refine
  // against that geometry, then invert the relocation back to accepted source.
  const refinedResolution = resolveMountedDrawingReanchor({
    snapshot: speculativeSnapshot,
    doc: speculativeSnapshot.state.pm.doc,
    attrs,
    operation: intent.kind,
    startFrame: intent.previousFrame,
    frame: intent.frame
  });
  if (refinedResolution.kind !== "reanchor") return acceptedResolution;
  return {
    kind: "reanchor",
    relocation: {
      ...refinedResolution.relocation,
      targetPosition: mapSpeculativeRelocationPositionToAccepted(
        refinedResolution.relocation.targetPosition,
        session.position,
        sourceNode.nodeSize,
        previewRelocation.targetPosition
      )
    }
  };
}
