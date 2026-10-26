import { createEditorUIDropIntent } from "./intent";
import type {
  EditorUIDragDropResult,
  EditorUIDragSessionState
} from "./types";

/**
 * Resolves a final pointer sample without mutating session or document state.
 *
 * @param state - Current command-neutral session state.
 * @param input - Final owning pointer and snapshot facts.
 * @returns Ignored, rejected, or typed committed outcome.
 */
export function resolveEditorUIDragDrop<SourcePayload, TargetPayload>(
  state: EditorUIDragSessionState<SourcePayload, TargetPayload>,
  input: { readonly pointerId: number; readonly snapshotVersion: number }
): EditorUIDragDropResult<SourcePayload, TargetPayload> {
  if (
    (state.phase === "armed" || state.phase === "dragging" || state.phase === "targeting")
    && state.pointerId !== input.pointerId
  ) {
    return { status: "ignored" };
  }
  if (
    state.phase === "idle"
    || state.phase === "committed"
    || state.phase === "cancelled"
    || state.phase === "destroyed"
  ) {
    return { status: "ignored" };
  }
  if (state.phase !== "targeting") {
    return { status: "rejected", reason: "no-target" };
  }
  if (
    state.snapshotVersion !== input.snapshotVersion
    || state.target.snapshotVersion !== input.snapshotVersion
  ) {
    return { status: "rejected", reason: "stale" };
  }
  if (state.target.status !== "ready") {
    return { status: "rejected", reason: state.target.reason };
  }
  return {
    status: "committed",
    intent: createEditorUIDropIntent(state.source, state.target)
  };
}
