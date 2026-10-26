import { resolveEditorUIAnchorGeometry } from "../../anchor";
import type {
  EditorUIDragRejectedTarget,
  EditorUIDragTargetResolution
} from "../types";
import type { EditorUINodeIdentity } from "../../node-identity";
import type {
  QuireInteractionHitTargetAtPointInteractionHit,
  QuireViewNodeInteractionHit
} from "@quirekit/view-engine";
import {
  createEditorUIBlockDropIndicator,
  resolveEditorUIBlockDropPlacement
} from "./placement";
import { resolveEditorUIRetainedHitAtClient } from "./retained-hit";
import type {
  EditorUIBlockDropPayloadFacts,
  ResolveEditorUIBlockDropTargetOptions
} from "./types";

/**
 * Resolves one block target from retained interaction and F-10 geometry.
 *
 * No DOM query, current caret, current selection, viewport-origin assumption,
 * or previous indicator can participate in this path. Mounted features supply
 * current surface facts but do not own a parallel target resolver.
 *
 * @param options - Snapshot, projection, source range, and feature policy.
 * @returns Ready command-neutral target or explicit rejection.
 */
export function resolveEditorUIBlockDropTarget<TargetPayload>(
  options: ResolveEditorUIBlockDropTargetOptions<TargetPayload>
): EditorUIDragTargetResolution<TargetPayload> {
  const snapshotVersion = options.snapshot.viewGraph?.version;
  if (!options.insideDropZone) return rejected("outside", snapshotVersion);
  if (
    snapshotVersion !== options.expectedSnapshotVersion
    || options.sourceSelection.snapshot.snapshotVersion !== options.expectedSnapshotVersion
  ) {
    return rejected("stale", snapshotVersion);
  }

  const { documentPoint, hit, targetId } = resolveEditorUIRetainedHitAtClient({
    snapshot: options.snapshot,
    clientPoint: options.clientPoint,
    surfaceClientRect: options.surfaceClientRect,
    surfaceBounds: options.surfaceBounds
  });
  if (hit.kind === "miss") return rejected("no-target", snapshotVersion);
  if (hit.targetKind !== "interaction-hit" || hit.interactionHit.kind !== "node") {
    return rejected("invalid-target", snapshotVersion);
  }

  const targetFacts = resolveTargetFacts(options, hit, hit.interactionHit, targetId);
  if ("status" in targetFacts) return targetFacts;
  const policyRejection = resolvePolicyRejection(options, hit);
  if (policyRejection !== undefined) return policyRejection;

  const geometry = resolveEditorUIAnchorGeometry({
    snapshot: options.snapshot,
    request: {
      kind: "node",
      nodeId: targetFacts.identity.nodeId,
      expectedSnapshotVersion: options.expectedSnapshotVersion,
      occurrence: { targetId: targetFacts.targetId }
    }
  });
  if (geometry.status !== "ready") {
    return rejected(geometry.status === "stale" ? "stale" : "invalid-target", snapshotVersion);
  }

  const placement = resolveEditorUIBlockDropPlacement(
    documentPoint,
    geometry.referenceRect,
    options.blockAxis,
    options.writingDirection
  );
  return {
    status: "ready",
    snapshotVersion: options.expectedSnapshotVersion,
    identity: targetFacts.identity,
    placement,
    indicator: createEditorUIBlockDropIndicator(geometry, placement, options.blockAxis),
    payload: options.createPayload(targetFacts.payload)
  };
}

/**
 * Resolves stable identity and occurrence range from exact retained targets.
 *
 * @param options - Current resolver options.
 * @param hit - Canonical retained interaction hit result.
 * @param nodeHit - Canonical node hit facts.
 * @param exactTargetId - Canonical retained layer target id, when exposed.
 * @returns Stable target facts or explicit rejection.
 */
function resolveTargetFacts<TargetPayload>(
  options: ResolveEditorUIBlockDropTargetOptions<TargetPayload>,
  hit: QuireInteractionHitTargetAtPointInteractionHit,
  nodeHit: QuireViewNodeInteractionHit,
  exactTargetId: string | undefined
): {
    readonly identity: EditorUINodeIdentity;
    readonly targetId: string;
    readonly payload: EditorUIBlockDropPayloadFacts;
  }
  | EditorUIDragRejectedTarget {
  const rootId = nodeHit.region.rootId.value;
  const identity = { rootId, nodeId: nodeHit.nodeId };
  if (rootId !== options.sourceSelection.snapshot.rootId) {
    return rejected("cross-root", options.expectedSnapshotVersion);
  }
  if (options.sourceSelection.contains(identity)) {
    return rejected("source-contains-target", options.expectedSnapshotVersion);
  }
  if (
    (hit.ownerSource ?? nodeHit.source) === undefined
    || (hit.ownerCapabilities ?? nodeHit.capabilities) === undefined
  ) {
    return rejected("invalid-target", options.expectedSnapshotVersion);
  }
  const targets = options.snapshot.hitTargets.filter((candidate) =>
    (exactTargetId === undefined || candidate.id === exactTargetId)
    && candidate.interactionHit?.kind === "node"
    && candidate.interactionHit.nodeId === nodeHit.nodeId
    && candidate.interactionHit.region.rootId.value === rootId
    && candidate.rect.x === hit.rect.x
    && candidate.rect.y === hit.rect.y
    && candidate.rect.width === hit.rect.width
    && candidate.rect.height === hit.rect.height
  );
  if (targets.length !== 1) {
    return rejected("invalid-target", options.expectedSnapshotVersion);
  }
  const target = targets[0]!;

  return {
    identity,
    targetId: target.id,
    payload: {
      rootId,
      nodeId: nodeHit.nodeId,
      position: nodeHit.pos,
      range: target.range
    }
  };
}

/**
 * Applies retained editability and feature-owned eligibility gates.
 *
 * @param options - Current resolver options.
 * @param hit - Retained hit with exact capability facts.
 * @returns First explicit policy rejection, or undefined.
 */
function resolvePolicyRejection<TargetPayload>(
  options: ResolveEditorUIBlockDropTargetOptions<TargetPayload>,
  hit: QuireInteractionHitTargetAtPointInteractionHit
): EditorUIDragRejectedTarget | undefined {
  const policy = options.policy;
  const capabilities = hit.ownerCapabilities ?? hit.interactionHit.capabilities;
  const editable = capabilities?.editable === true
    && capabilities.commandable === true
    && policy?.targetEditable !== false;
  if (!editable) return rejected("read-only", options.expectedSnapshotVersion);
  if (policy?.protected === true) return rejected("protected", options.expectedSnapshotVersion);
  if (policy?.locked === true) return rejected("locked", options.expectedSnapshotVersion);
  if (policy?.schemaCompatible === false) {
    return rejected("schema-incompatible", options.expectedSnapshotVersion);
  }
  if (policy?.permitted === false) return rejected("permission-denied", options.expectedSnapshotVersion);
  return undefined;
}

/**
 * Creates one stable target rejection.
 *
 * @param reason - Stable target rejection reason.
 * @param snapshotVersion - Current snapshot version, when available.
 * @returns Explicit non-committable target.
 */
function rejected(
  reason: EditorUIDragRejectedTarget["reason"],
  snapshotVersion?: number
): EditorUIDragRejectedTarget {
  return {
    status: "rejected",
    reason,
    ...(snapshotVersion === undefined ? {} : { snapshotVersion })
  };
}
