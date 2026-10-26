import type { DrawingAnchor } from "@quirekit/drawing-geometry";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireViewEvent } from "@quirekit/renderer";
import {
  createQuireDrawingControllerState,
  reduceQuireDrawingController,
  type QuireDrawingControllerIdentity,
  type QuireDrawingManipulationEventPayload
} from "@quirekit/view-engine";
import type { QuireDrawingModelProfile } from "@quirekit/view-engine";
import { findMountedDrawingTargetContribution } from "../target-contribution";
import { readMountedDrawingModel } from "../model";
import type { CreateMountedDrawingInteractionRuntimeOptions } from "../types";

export type { MountedDrawingInteractionSession, MountedDrawingManipulationStart } from "./types";
import type { MountedDrawingInteractionSession, MountedDrawingManipulationStart } from "./types";
import { captureMountedDrawingResizePolicy } from "./resize-policy";

/**
 * Resolves exact retained and source authority, then starts the pure controller.
 *
 * @param options - Mounted runtime authorities.
 * @param event - Pointer-down action event.
 * @param payload - Validated manipulation payload.
 * @param pointerId - Browser pointer identity.
 * @returns Started controller state and session, or undefined when stale.
 */
export function beginMountedDrawingManipulation(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  event: QuireViewEvent<unknown, QuireDrawingManipulationEventPayload>,
  payload: QuireDrawingManipulationEventPayload,
  pointerId: number
): MountedDrawingManipulationStart | undefined {
  const snapshot = options.getInteractionSnapshot();
  const target = event.target;
  if (
    snapshot === undefined
    || target === undefined
    || snapshot.state.pm.doc !== options.editor.state.pm.doc
    || event.point === undefined
    || event.clientPoint === undefined
  ) {
    return undefined;
  }
  const contribution = findMountedDrawingTargetContribution(snapshot.layerContributions, target.id);
  const position = contribution?.owner.source.range?.from;
  const attrs = position === undefined
    ? undefined
    : readCurrentAnchorAttrs(readMountedDrawingModel(options.editor), options.editor.state.pm.doc, position);
  if (
    contribution === undefined
    || contribution.activation?.kind !== "selected-owner"
    || position === undefined
    || attrs === undefined
    || attrs.objectId !== payload.objectId
    || attrs.drawing.drawingId !== payload.drawingId
  ) {
    return undefined;
  }
  const resizePolicy = captureMountedDrawingResizePolicy(options.editor, position, attrs.drawing.kind === "embedded"
    ? readMountedDrawingModel(options.editor).readObject(attrs, options.editor.state.pm.doc)?.embeddedPresentation?.resizePolicy
    : undefined);
  if (attrs.drawing.kind === "embedded" && (payload.operation !== "resize" || resizePolicy === undefined)) return undefined;
  const identity: QuireDrawingControllerIdentity = {
    objectId: attrs.objectId,
    drawingId: attrs.drawing.drawingId,
    rootId: contribution.owner.root.id.value,
    regionId: contribution.owner.region.regionId.value,
    visualInstanceId: contribution.owner.region.visualInstanceId ?? "single",
    sourceRevision: 0
  };
  const selected = reduceQuireDrawingController(createQuireDrawingControllerState(), {
    kind: "select-object",
    identity,
    frame: {
      rect: contribution.rect,
      rotation: attrs.drawing.transform.rotation
    }
  });
  const started = reduceQuireDrawingController(selected.state, {
    kind: "begin-manipulation",
    operation: payload.operation,
    drawing: attrs.drawing,
    control: payload.control,
    ...(payload.handle === undefined ? {} : { handle: payload.handle }),
    identity,
    pointerId,
    clientPoint: event.clientPoint,
    point: event.point,
    lockAspectRatio: payload.lockAspectRatio
  });
  if (started.rejection !== undefined) return undefined;
  return {
    state: started.state,
    session: {
      doc: options.editor.state.pm.doc,
      snapshot,
      position,
      identity,
      pointerId,
      ...(resizePolicy === undefined ? {} : { resizePolicy })
    }
  };
}

/**
 * Reports whether the captured document and source identity remain current.
 *
 * @param options - Mounted runtime authorities.
 * @param session - Active captured session.
 * @returns Whether pointer progress may continue.
 */
export function isMountedDrawingSessionCurrent(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  session: MountedDrawingInteractionSession
): boolean {
  return options.editor.state.pm.doc === session.doc
    && readCurrentMountedDrawingSource(options, session) !== undefined;
}

/**
 * Reads and revalidates the current source attrs for one captured session.
 *
 * @param options - Mounted runtime authorities.
 * @param session - Active captured session.
 * @returns Current anchor attrs, or undefined when source identity changed.
 */
export function readCurrentMountedDrawingSource(
  options: CreateMountedDrawingInteractionRuntimeOptions,
  session: MountedDrawingInteractionSession
): DrawingAnchor | undefined {
  const attrs = readCurrentAnchorAttrs(readMountedDrawingModel(options.editor), options.editor.state.pm.doc, session.position);
  return attrs?.objectId === session.identity.objectId
    && attrs.drawing.drawingId === session.identity.drawingId
    ? attrs
    : undefined;
}

/**
 * Reads a validated anchor at one exact source position.
 *
 * @param drawingModel - Drawing model reading anchor attrs.
 * @param doc - Current ProseMirror document.
 * @param position - Position before the expected anchor node.
 * @returns Validated attrs, or undefined when the node is absent or malformed.
 */
export function readCurrentAnchorAttrs(
  drawingModel: QuireDrawingModelProfile,
  doc: ProseMirrorNode,
  position: number
): DrawingAnchor | undefined {
  const node = doc.nodeAt(position);
  return node == null ? undefined : drawingModel.readAnchor(node.attrs);
}
