import { quireNeutralDocumentProfile } from "@quirekit/view-engine";
import type {
  QuireTransientNodeLayoutPatch,
  QuireViewRenderResult
} from "../../types";
import { findMountedDrawingContribution } from "../render-result/drawing-preview/ownership";
import { createMountedWordDrawingManipulationPatch } from "./commit";
import type { MountedDrawingManipulationPreviewState } from "./types";

/**
 * Resolves one exact non-dispatched node patch for a drawing manipulation frame.
 *
 * @param renderResult - Accepted retained result captured before preview begins.
 * @param state - Active manipulation state carrying the latest frame.
 * @returns Exact source patch, or undefined when retained/source ownership is stale.
 */
export function createMountedDrawingLayoutPreviewPatch(
  renderResult: QuireViewRenderResult,
  state: MountedDrawingManipulationPreviewState
): QuireTransientNodeLayoutPatch | undefined {
  // Geometry controls repaint only their own shell and handles during capture.
  // Final canonical commit owns Story relayout and exclusion changes.
  if (state.kind === "controlling") return undefined;
  const contribution = findMountedDrawingContribution(
    renderResult.layoutSnapshot.layerContributions,
    state.identity,
    "overlay",
    "selected-owner"
  );
  const position = contribution?.owner.source.range?.from;
  const node = position === undefined
    ? null
    : renderResult.layoutSnapshot.state.pm.doc.nodeAt(position);
  const model = renderResult.layoutSnapshot.documentProfile?.drawingModel ?? quireNeutralDocumentProfile.drawingModel;
  const attrs = node == null ? undefined : model.readAnchor(node.attrs);
  if (contribution === undefined || position === undefined || node == null || attrs === undefined
    || attrs.objectId !== state.identity.objectId || attrs.drawing.drawingId !== state.identity.drawingId) {
    return undefined;
  }
  // Embedded content has an independent source owner. Its accepted image can
  // be projected directly; a geometry-only speculative PM mutation would break
  // that owner's registry/anchor invariant before the final atomic command.
  if (attrs.drawing.kind === "embedded") return undefined;
  const patch = createMountedWordDrawingManipulationPatch(attrs, {
    kind: state.kind === "moving"
      ? "move"
      : state.kind === "resizing"
        ? "resize"
        : "rotate",
    identity: state.identity,
    frame: state.track.previewFrame,
    previousFrame: state.track.startFrame,
    ...(state.kind === "resizing" ? { handle: state.handle } : {})
  }, state.relocation);
  if (patch === undefined) {
    return undefined;
  }
  const previewAttrs = model.patchAnchor(attrs, patch);
  return {
    position,
    ...(state.relocation === undefined
      ? {}
      : { targetPosition: state.relocation.targetPosition }),
    nodeTypeName: node.type.name,
    attrs: previewAttrs as unknown as Readonly<Record<string, unknown>>
  };
}
