import {
  createQuireInteractionGeometryAuthority,
  resolveViewCoordinateAuthority
} from "@quirekit/view-engine";
import type {
  QuireInteractionHitTargetAtPointResult,
  QuireLayoutSnapshot
} from "@quirekit/view-engine";
import type {
  EditorUIAnchorRect,
  EditorUIAnchorSurfaceClientRect
} from "../../anchor";
import type { EditorUIDragPoint } from "../types";

/** Inputs for one canonical retained-target query from a mounted client point. */
export interface ResolveEditorUIRetainedHitAtClientOptions {
  /** Snapshot owning the retained interaction products. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Browser client point in CSS pixels. */
  readonly clientPoint: EditorUIDragPoint;
  /** Mounted surface rectangle in browser client coordinates. */
  readonly surfaceClientRect: EditorUIAnchorSurfaceClientRect;
  /** Document-space bounds represented by the mounted surface. */
  readonly surfaceBounds: EditorUIAnchorRect;
}

/** Canonical document point paired with its retained hit result. */
export interface EditorUIRetainedHitAtClientResult {
  /** Client point projected through the mounted affine authority. */
  readonly documentPoint: EditorUIDragPoint;
  /** Exact retained target result at the projected point. */
  readonly hit: QuireInteractionHitTargetAtPointResult;
  /** Stable retained target id when the canonical layer chain exposes it. */
  readonly targetId?: string | undefined;
}

/**
 * Resolves one client point through the canonical View Engine geometry authority.
 *
 * @param options - Snapshot and explicit mounted coordinate projection facts.
 * @returns Projected document point and exact retained target result.
 */
export function resolveEditorUIRetainedHitAtClient(
  options: ResolveEditorUIRetainedHitAtClientOptions
): EditorUIRetainedHitAtClientResult {
  const mapped = resolveViewCoordinateAuthority(
    options.surfaceClientRect,
    options.surfaceBounds
  ).documentPointFromClient({
    left: options.clientPoint.x,
    top: options.clientPoint.y
  });
  const documentPoint = { x: mapped.x, y: mapped.y };
  const hit = createQuireInteractionGeometryAuthority({
    snapshot: options.snapshot
  }).hitTargetAt(documentPoint);
  const targetId = resolveRetainedHitTargetId(hit);
  return {
    documentPoint,
    hit,
    ...(targetId === undefined ? {} : { targetId })
  };
}

/**
 * Reads the consuming retained id from a canonical layer decision chain.
 *
 * @param hit - Exact retained hit result.
 * @returns Consuming target id, or undefined for non-layer retained geometry.
 */
function resolveRetainedHitTargetId(
  hit: QuireInteractionHitTargetAtPointResult
): string | undefined {
  if (hit.kind === "miss" || hit.targetChain === undefined) return undefined;
  for (let index = hit.targetChain.length - 1; index >= 0; index -= 1) {
    const decision = hit.targetChain[index]!;
    if (decision.decision === "selected" || decision.decision === "target-dispatch") {
      return decision.targetId;
    }
  }
  return undefined;
}
