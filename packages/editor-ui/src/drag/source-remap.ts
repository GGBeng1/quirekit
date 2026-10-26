import { editorUINodeIdentitiesEqual } from "../node-identity";
import { NodeRangeSelection } from "../node-range-selection";
import type {
  EditorUIDragRemapResult,
  EditorUIDragSource,
  EditorUIDragSourceRemapInput
} from "./types";

/** Ready source remap or a stable public rejection. */
export type EditorUIDragSourceRemapResolution<SourcePayload> =
  | {
      readonly status: "ready";
      readonly selection: NodeRangeSelection;
      readonly source: EditorUIDragSource<SourcePayload>;
    }
  | Extract<EditorUIDragRemapResult, { readonly status: "rejected" }>;

/**
 * Validates one collaboration remap against the active source identities.
 *
 * @param remap - Ready selection or explicit structural-remap rejection.
 * @param source - Current stable drag source.
 * @param snapshotVersion - Current active session version.
 * @returns Ready replacement source or a stable rejection.
 */
export function resolveEditorUIDragSourceRemap<SourcePayload>(
  remap: EditorUIDragSourceRemapInput,
  source: EditorUIDragSource<SourcePayload>,
  snapshotVersion: number
): EditorUIDragSourceRemapResolution<SourcePayload> {
  if (!(remap instanceof NodeRangeSelection) && remap.status === "rejected") {
    return {
      status: "rejected",
      reason: remap.reason === "snapshot-regressed" ? "stale" : "source-unavailable"
    };
  }
  const selection = remap instanceof NodeRangeSelection
    ? remap
    : remap.selection;
  if (selection.snapshot.rootId !== source.selection.snapshot.rootId) {
    return { status: "rejected", reason: "cross-root" };
  }
  if (selection.snapshot.snapshotVersion < snapshotVersion) {
    return { status: "rejected", reason: "stale" };
  }
  if (
    !editorUINodeIdentitiesEqual(
      selection.snapshot.anchor,
      source.selection.snapshot.anchor
    )
    || !editorUINodeIdentitiesEqual(
      selection.snapshot.focus,
      source.selection.snapshot.focus
    )
  ) {
    return { status: "rejected", reason: "source-unavailable" };
  }
  return {
    status: "ready",
    selection,
    source: { ...source, selection }
  };
}
