import { NodeRangeSelection } from "@quirekit/editor-ui";
import type { EditorUIDragTargetResolution } from "@quirekit/editor-ui";
import type {
  QuireLayoutSnapshot,
  QuireViewInteractionHit
} from "@quirekit/view-engine";

/** Feature-owned target payload used by block-interaction fixtures. */
export interface BlockTargetPayload {
  /** Canonical feature target position. */
  readonly targetPosition: number;
}

/**
 * Creates one stable source range used by mounted block-interaction tests.
 *
 * @param snapshotVersion - Retained snapshot version.
 * @param rootId - Stable content root.
 * @param nodeId - Selected source identity.
 * @returns Ready stable structural selection.
 */
export function createBlockSourceSelection(
  snapshotVersion = 7,
  rootId = "body",
  nodeId = "source"
): NodeRangeSelection {
  const result = NodeRangeSelection.create({
    snapshotVersion,
    writingDirection: "ltr",
    nodes: [
      { identity: { rootId, nodeId }, order: 0, range: { from: 0, to: 19 } }
    ],
    anchor: { rootId, nodeId },
    focus: { rootId, nodeId }
  });
  if (result.status !== "ready") throw new Error(result.reason);
  return result.selection;
}

/**
 * Creates shared resolver inputs with identity mounted projection.
 *
 * @param snapshot - Retained interaction snapshot.
 * @returns Resolver inputs targeting the upper half of the second block.
 */
export function createBlockResolverOptions(snapshot: QuireLayoutSnapshot) {
  return {
    snapshot,
    expectedSnapshotVersion: 7,
    sourceSelection: createBlockSourceSelection(),
    clientPoint: { x: 80, y: 105 },
    surfaceClientRect: { left: 0, top: 0, width: 400, height: 400 },
    surfaceBounds: { x: 0, y: 0, width: 400, height: 400 },
    insideDropZone: true,
    blockAxis: "vertical" as const,
    writingDirection: "ltr" as const,
    createPayload: (target: { readonly position: number }): BlockTargetPayload => ({
      targetPosition: target.position
    })
  };
}

/**
 * Creates the expected command-neutral ready target.
 *
 * @returns Ready target derived from retained node geometry.
 */
export function createReadyBlockTarget(): EditorUIDragTargetResolution<BlockTargetPayload> {
  return {
    status: "ready",
    snapshotVersion: 7,
    identity: { rootId: "body", nodeId: "target" },
    placement: "before",
    indicator: {
      kind: "line",
      coordinateSpace: "document",
      snapshotVersion: 7,
      placement: "before",
      rect: { x: 40, y: 100, width: 200, height: 0 },
      sourceTargetIds: ["node:target"]
    },
    payload: { targetPosition: 20 }
  };
}

/**
 * Creates a retained snapshot with two canonical node interaction hits.
 *
 * @param editable - Whether the target advertises editable/commandable capabilities.
 * @returns Retained block interaction snapshot.
 */
export function createBlockSnapshot(editable = true): QuireLayoutSnapshot {
  const capabilities = {
    editable,
    selectable: true,
    focusable: true,
    copyable: true,
    commandable: editable,
    accessible: true
  };
  const sourceHit = createNodeHit("source", 0, capabilities);
  const targetHit = createNodeHit("target", 20, capabilities);

  return {
    state: {} as QuireLayoutSnapshot["state"],
    documentRect: { x: 0, y: 0, width: 400, height: 400 },
    viewportRect: { x: 0, y: 0, width: 400, height: 220 },
    domOverlays: [],
    viewGraph: { version: 7 } as QuireLayoutSnapshot["viewGraph"],
    hitTargets: [
      {
        id: "node:source",
        range: { from: 0, to: 19 },
        rect: { x: 40, y: 40, width: 200, height: 40 },
        interactionHit: sourceHit,
        capabilities
      },
      {
        id: "node:target",
        range: { from: 20, to: 39 },
        rect: { x: 40, y: 100, width: 200, height: 40 },
        interactionHit: targetHit,
        capabilities
      }
    ],
    root: {
      id: "doc",
      kind: "block",
      range: { from: 0, to: 40 },
      rect: { x: 0, y: 0, width: 400, height: 400 },
      children: []
    }
  } as QuireLayoutSnapshot;
}

/**
 * Creates one canonical retained node interaction hit.
 *
 * @param nodeId - Stable node identity.
 * @param pos - Position immediately before the node.
 * @param capabilities - Exact target capabilities.
 * @returns Canonical node interaction hit.
 */
function createNodeHit(
  nodeId: string,
  pos: number,
  capabilities: QuireViewInteractionHit["capabilities"]
): Extract<QuireViewInteractionHit, { readonly kind: "node" }> {
  return {
    kind: "node",
    nodeId,
    pos,
    region: {
      rootId: { value: "body" },
      regionId: { value: "body-region" },
      kind: "body"
    },
    capabilities,
    source: { sourceId: nodeId, range: { from: pos, to: pos + 19 } }
  };
}
