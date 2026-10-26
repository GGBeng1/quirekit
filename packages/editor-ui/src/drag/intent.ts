import type { NodeRangeSelection } from "../node-range-selection";
import type {
  EditorUIDragReadyTarget,
  EditorUIDragSource,
  EditorUIDropIntent
} from "./types";

/**
 * Validates the minimal stable source contract.
 *
 * @param selection - Structural source selection.
 * @returns Whether the source version and members are valid.
 */
export function isValidEditorUIDragSourceSelection(
  selection: NodeRangeSelection
): boolean {
  return Number.isSafeInteger(selection.snapshot.snapshotVersion)
    && selection.snapshot.snapshotVersion >= 0
    && selection.snapshot.members.length > 0;
}

/**
 * Creates one command-neutral final intent.
 *
 * @param source - Current stable source and payload.
 * @param target - Current ready target and payload.
 * @returns Typed intent with no command or dispatch callback.
 */
export function createEditorUIDropIntent<SourcePayload, TargetPayload>(
  source: EditorUIDragSource<SourcePayload>,
  target: EditorUIDragReadyTarget<TargetPayload>
): EditorUIDropIntent<SourcePayload, TargetPayload> {
  return {
    kind: "drop",
    snapshotVersion: target.snapshotVersion,
    source: { selection: source.selection.snapshot, payload: source.payload },
    target: {
      identity: target.identity,
      placement: target.placement,
      payload: target.payload
    }
  };
}
