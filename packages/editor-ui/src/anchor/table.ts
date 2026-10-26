import {
  buildQuireTableChromeModel,
  type QuireHitTarget,
  type QuireLayoutSnapshot
} from "@quirekit/view-engine";
import { createEditorUIReadyAnchor, createEditorUIUnsupportedAnchor } from "./result";
import { resolveRetainedTargets } from "./targets";
import { resolveEditorUIOccurrenceContext } from "./occurrence";
import type {
  EditorUIAnchorGeometryResolution,
  EditorUITableAnchorRequest
} from "./types";

/**
 * Resolves one Table anchor from retained cells or headless Table chrome.
 *
 * @param snapshot - Current retained interaction snapshot.
 * @param request - Explicit Table identity, fragment position, and target.
 * @param snapshotVersion - Accepted current snapshot version.
 * @returns Ready Table product or explicit unsupported result.
 */
export function resolveEditorUITableAnchor(
  snapshot: QuireLayoutSnapshot,
  request: EditorUITableAnchorRequest,
  snapshotVersion: number
): EditorUIAnchorGeometryResolution {
  if (request.target.kind === "cell") {
    return resolveEditorUITableCellAnchor(snapshot, request, snapshotVersion);
  }
  const target = request.target;
  const occurrence = resolveEditorUIOccurrenceContext(snapshot, request.occurrence);
  if (occurrence.status === "unavailable") {
    return createEditorUIUnsupportedAnchor(
      request,
      "occurrence-target-unavailable",
      snapshotVersion
    );
  }

  const model = buildQuireTableChromeModel({
    nodes: [snapshot.root],
    tablePos: request.tablePos,
    activePosition: request.activePosition,
    selectionContext: occurrence.context
  });
  if (model === null || model.tableId !== request.tableId) {
    return createEditorUIUnsupportedAnchor(
      request,
      "table-target-unavailable",
      snapshotVersion
    );
  }

  const fragment = model.fragments.find((candidate) =>
    candidate.fragmentId === model.activeFragmentId
  );
  if (fragment === undefined) {
    return createEditorUIUnsupportedAnchor(
      request,
      "table-target-unavailable",
      snapshotVersion
    );
  }

  const anchor = target.kind === "row"
    ? fragment.rows.find((candidate) => candidate.rowIndex === target.index)
    : target.kind === "column"
      ? fragment.columns.find((candidate) => candidate.columnIndex === target.index)
      : target.kind === "menu"
        ? fragment.menu
        : undefined;
  const rect = target.kind === "table" ? fragment.tableRect : anchor?.rect;

  return rect === undefined
    ? createEditorUIUnsupportedAnchor(
        request,
        "table-target-unavailable",
        snapshotVersion
      )
    : createEditorUIReadyAnchor({
        request,
        snapshotVersion,
        rects: [rect],
        sourceTargetIds: [
          ...occurrence.sourceTargetIds,
          ...(anchor === undefined ? [] : [anchor.id])
        ]
      });
}

/**
 * Resolves one semantic Table cell from retained hit targets.
 *
 * @param snapshot - Current retained interaction snapshot.
 * @param request - Explicit Table cell request.
 * @param snapshotVersion - Accepted current snapshot version.
 * @returns Ready cell product or explicit absence/ambiguity.
 */
function resolveEditorUITableCellAnchor(
  snapshot: QuireLayoutSnapshot,
  request: EditorUITableAnchorRequest,
  snapshotVersion: number
): EditorUIAnchorGeometryResolution {
  if (request.target.kind !== "cell") {
    return createEditorUIUnsupportedAnchor(
      request,
      "table-target-unavailable",
      snapshotVersion
    );
  }
  const cellTarget = request.target;

  const match = resolveRetainedTargets(
    snapshot.hitTargets.filter((retainedTarget) => {
      const facts = readRetainedTableCellFacts(retainedTarget);
      return facts?.tableId === request.tableId
        && facts.cellId === cellTarget.cellId;
    }),
    request.occurrence
  );

  if (match.status !== "matched") {
    return createEditorUIUnsupportedAnchor(
      request,
      match.status === "ambiguous"
        ? "table-target-ambiguous"
        : request.occurrence === undefined
          ? "table-target-unavailable"
          : "occurrence-target-unavailable",
      snapshotVersion
    );
  }

  return createEditorUIReadyAnchor({
    request,
    snapshotVersion,
    rects: match.targets.map((target) => target.rect),
    sourceTargetIds: match.targets.map((target) => target.id)
  });
}

/** Semantic Table cell facts read without widening the canonical target type. */
interface RetainedTableCellFacts {
  /** Stable semantic table id. */
  readonly tableId: string;
  /** Stable semantic cell id. */
  readonly cellId: string;
}

/**
 * Reads canonical or table-layout cell identity from one retained target.
 *
 * @param target - Retained hit target to inspect.
 * @returns Semantic Table/cell identity, or undefined for a non-cell target.
 */
function readRetainedTableCellFacts(
  target: QuireHitTarget
): RetainedTableCellFacts | undefined {
  const hit = target.interactionHit;
  if (hit?.kind === "cell") {
    return { tableId: hit.tableId, cellId: hit.cellId };
  }

  if (
    "kind" in target
    && target.kind === "cell"
    && "tableId" in target
    && typeof target.tableId === "string"
    && "semanticCellId" in target
    && typeof target.semanticCellId === "string"
  ) {
    return { tableId: target.tableId, cellId: target.semanticCellId };
  }

  return undefined;
}
