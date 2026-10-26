import {
  containsQuirePoint,
  measureQuireRectDistanceSquaredToPoint
} from "@quirekit/renderer";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import { findQuireTableHitTargetAtPoint } from "../../table";
import type { QuireLayoutSnapshot } from "../../../editor-layout";
import type { QuireLayoutNode } from "../../../layout";
import type { QuireHitTestResult } from "../../types";
import {
  isTextContentLayoutNode,
  mapPointToLayoutNodePosition
} from "./node-position";
import {
  findDeepestLayoutNodeAtPoint,
  findNearestEditableTextLayoutNodeToPoint,
  findNearestLayoutNodeToPoint
} from "./node-search";
import {
  readQuireLayoutHitCandidateNodesAtPoint
} from "./query-candidates";
import {
  shouldUseQuireSubLayoutHitBeforeRawTextPosition,
  shouldUseQuireSubLayoutHitBeforeStructuralTableTarget
} from "./sub-layout-precedence";
import {
  hitTestQuireLayerTargetsAtPoint,
  withQuireLayerTargetDiagnostics
} from "./layer-target";
import { hitTestQuireSubLayoutGeometryAtPoint } from "./sub-layout";
import { hitTestNearestQuireSubLayoutCaret } from "../../sub-layout-query";
import {
  findNearestQuireTableCellHitTargetAtPoint,
  hitTestQuireTableCellLayoutTargetAtPoint,
  hitTestQuireTableRowOffsetSlotInLayoutSnapshot,
  isQuireTableStructuralGapAtPoint,
  withQuireTableCellSelectionHit
} from "./table-cell";

/** Options used by the retained layout hit-test query. */
interface QuireRetainedLayoutHitTestOptions {
  /** Layout snapshot whose nodes should be tested. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point to map back into a mounted hit-test result. */
  readonly point: QuirePoint;
}

/** Options used to resolve a caret inside one exact retained region. */
interface QuireRetainedLayoutRegionHitTestOptions
  extends QuireRetainedLayoutHitTestOptions {
  /** Region occurrence whose layout subtree exclusively owns the query. */
  readonly region: QuireLayoutRegionRef;
}

/** Hit-test mode exposed by the retained layout hit-test query. */
type QuireRetainedLayoutHitTestMode = "exact" | "nearest-caret";

/**
 * Maps a canvas point to a document position using a layout snapshot.
 *
 * @param options - Layout snapshot and point to hit-test.
 * @returns Hit-test result for the point.
 */
export function hitTestExactQuireLayoutSnapshot(
  options: QuireRetainedLayoutHitTestOptions
): QuireHitTestResult {
  return hitTestQuireLayoutSnapshotInternal(options, "exact");
}

/**
 * Maps a canvas point to the nearest caret using a layout snapshot.
 *
 * @param options - Layout snapshot and point to query.
 * @returns Nearest-caret hit-test result for the point.
 */
export function hitTestNearestCaretInQuireLayoutSnapshot(
  options: QuireRetainedLayoutHitTestOptions
): QuireHitTestResult {
  return hitTestQuireLayoutSnapshotInternal(options, "nearest-caret");
}

/**
 * Maps a point to the nearest caret inside one exact retained region.
 *
 * Selected-object controls may intentionally mask nested story geometry in the
 * global target stack. Region-scoped entry bypasses that controls surface while
 * preserving the accepted occurrence and text-layout authority.
 *
 * @param options - Snapshot, point, and exact region occurrence to query.
 * @returns Nearest caret inside the region, or a miss for stale ownership.
 */
export function hitTestNearestCaretInQuireLayoutRegion(
  options: QuireRetainedLayoutRegionHitTestOptions
): QuireHitTestResult {
  const regionRoot = findQuireLayoutNodeForRegion(
    options.snapshot.root,
    options.region
  );
  if (regionRoot === undefined) {
    return { kind: "miss" };
  }
  const root = activateQuireLayoutRegionForScopedTextHit(regionRoot);
  const {
    interactionQueryIndex: _interactionQueryIndex,
    layerTargetIndex: _layerTargetIndex,
    ...snapshot
  } = options.snapshot;
  return hitTestQuireLayoutSnapshotInternal({
    snapshot: {
      ...snapshot,
      root,
      documentRect: root.rect,
      viewportRect: root.rect,
      hitTargets: []
    },
    point: options.point
  }, "nearest-caret");
}

/**
 * Activates paint-only nested Story nodes for an explicit region-scoped query.
 *
 * Paint-only is the correct global state before text ownership transfers. The
 * caller has already revalidated the exact selected Story occurrence, so the
 * scoped clone may expose its measured text without weakening global hits.
 *
 * @param node - Exact retained Story subtree to activate.
 * @returns Query-only clone with paint-only suppression removed recursively.
 */
function activateQuireLayoutRegionForScopedTextHit(
  node: QuireLayoutNode
): QuireLayoutNode {
  const { interactionRole: _interactionRole, children, ...rest } = node;
  return {
    ...rest,
    ...(children === undefined
      ? {}
      : {
          children: children.map((child) =>
            activateQuireLayoutRegionForScopedTextHit(child)
          )
        })
  };
}

/**
 * Finds the layout subtree representing one exact retained region occurrence.
 *
 * @param node - Current layout node to inspect recursively.
 * @param region - Exact retained region occurrence to match.
 * @returns Matching subtree root, or undefined when this branch does not own it.
 */
function findQuireLayoutNodeForRegion(
  node: QuireLayoutNode,
  region: QuireLayoutRegionRef
): QuireLayoutNode | undefined {
  const candidate = node.viewRegion ?? node.layoutOwner?.region;
  if (candidate !== undefined && isSameQuireLayoutRegion(candidate, region)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const match = findQuireLayoutNodeForRegion(child, region);
    if (match !== undefined) {
      return match;
    }
  }
  return undefined;
}

/**
 * Compares stable identity for one retained region occurrence.
 *
 * @param left - First retained region reference.
 * @param right - Second retained region reference.
 * @returns Whether both references identify the same visual occurrence.
 */
function isSameQuireLayoutRegion(
  left: QuireLayoutRegionRef,
  right: QuireLayoutRegionRef
): boolean {
  return left.rootId.value === right.rootId.value
    && left.regionId.value === right.regionId.value
    && left.visualInstanceId === right.visualInstanceId;
}

/**
 * Runs the retained layout hit-test query with an explicit nearest-caret mode.
 *
 * @param options - Layout snapshot and point to hit-test.
 * @param mode - Whether to resolve exact hits or clamp blanks to the nearest caret.
 * @returns Hit-test result for the point.
 */
function hitTestQuireLayoutSnapshotInternal(
  options: QuireRetainedLayoutHitTestOptions,
  mode: QuireRetainedLayoutHitTestMode
): QuireHitTestResult {
  const { snapshot, point } = options;
  const documentContainsPoint = containsQuirePoint(snapshot.documentRect, point);
  const viewportContainsPoint = containsQuirePoint(snapshot.viewportRect, point);

  if (!documentContainsPoint && !viewportContainsPoint) {
    return { kind: "miss" };
  }

  const layerHit = hitTestQuireLayerTargetsAtPoint({ snapshot, point });

  if (layerHit.hit !== null) {
    return layerHit.hit;
  }

  const pointCandidateNodes = readQuireLayoutHitCandidateNodesAtPoint({
    snapshot,
    point,
    fallbackToAllEntries: !documentContainsPoint
  });
  const tableRowOffsetSlot = documentContainsPoint
    ? hitTestQuireTableRowOffsetSlotInLayoutSnapshot({ snapshot, point })
    : null;

  if (tableRowOffsetSlot) {
    return withQuireLayerTargetDiagnostics(tableRowOffsetSlot, layerHit);
  }

  const exactTableCellTarget = documentContainsPoint
    ? findQuireTableHitTargetAtPoint({
        hitTargets: snapshot.hitTargets,
        point
      })
    : null;
  const tableCellTarget = exactTableCellTarget
    ?? (
      documentContainsPoint && mode === "nearest-caret"
        ? findNearestQuireTableCellHitTargetAtPoint({
            candidateNodes: pointCandidateNodes,
            point
          })
        : null
    );

  let node = documentContainsPoint
    ? findDeepestLayoutNodeAtPoint(pointCandidateNodes, point)
    : findNearestLayoutNodeToPoint(pointCandidateNodes, point);

  const subLayoutHit = documentContainsPoint
    ? hitTestQuireSubLayoutGeometryAtPoint({
        nodes: pointCandidateNodes,
        point
      })
    : null;

  if (documentContainsPoint && isTextContentLayoutNode(node)) {
    if (shouldUseQuireSubLayoutHitBeforeRawTextPosition(subLayoutHit)) {
      return withQuireLayerTargetDiagnostics(
        withQuireTableCellSelectionHit(subLayoutHit, tableCellTarget),
        layerHit
      );
    }

    return withQuireLayerTargetDiagnostics(
      withQuireTableCellSelectionHit({
          kind: "position",
          ...mapPointToLayoutNodePosition(node, point)
        }, tableCellTarget),
      layerHit
    );
  }

  const tablePositionHit = documentContainsPoint
    ? hitTestQuireTableCellLayoutTargetAtPoint({
        snapshot,
        point,
        candidateNode: node,
        ...(tableCellTarget === null ? {} : { tableTarget: tableCellTarget })
      })
    : null;

  if (
    subLayoutHit &&
    shouldUseQuireSubLayoutHitBeforeStructuralTableTarget(
      subLayoutHit,
      tablePositionHit
    )
  ) {
    return withQuireLayerTargetDiagnostics(
      withQuireTableCellSelectionHit(subLayoutHit, tableCellTarget),
      layerHit
    );
  }

  if (tablePositionHit) {
    return withQuireLayerTargetDiagnostics(
      withQuireTableCellSelectionHit(tablePositionHit, tableCellTarget),
      layerHit
    );
  }

  if (subLayoutHit) {
    return withQuireLayerTargetDiagnostics(
      withQuireTableCellSelectionHit(subLayoutHit, tableCellTarget),
      layerHit
    );
  }

  if (
    documentContainsPoint &&
    isQuireTableStructuralGapAtPoint({
      snapshot,
      point,
      candidateNode: node
    })
  ) {
    return { kind: "miss" };
  }

  if (!node && mode === "nearest-caret") {
    const fallbackNodes = readQuireLayoutHitCandidateNodesAtPoint({
      snapshot,
      point,
      fallbackToAllEntries: true
    });
    const nearestSubLayoutHit = hitTestNearestQuireSubLayoutCaret(
      fallbackNodes,
      point
    );
    const nearestTextNode = findNearestEditableTextLayoutNodeToPoint(
      fallbackNodes,
      point
    );

    if (
      nearestSubLayoutHit !== null
      && (
        nearestTextNode === null
        || measureQuireRectDistanceSquaredToPoint(
          nearestSubLayoutHit.rect,
          point
        ) <= measureQuireRectDistanceSquaredToPoint(nearestTextNode.rect, point)
      )
    ) {
      return withQuireLayerTargetDiagnostics(
        withQuireTableCellSelectionHit(nearestSubLayoutHit, tableCellTarget),
        layerHit
      );
    }

    node = nearestTextNode;
  }

  if (!node) {
    return { kind: "miss" };
  }

  return withQuireLayerTargetDiagnostics(
    withQuireTableCellSelectionHit({
      kind: "position",
      ...mapPointToLayoutNodePosition(node, point)
    }, tableCellTarget),
    layerHit
  );
}
