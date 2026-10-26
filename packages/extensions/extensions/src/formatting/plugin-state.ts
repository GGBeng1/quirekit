import type { QuireEditorState } from "@quirekit/core";
import type { QuireFormattingProvider } from "./types";
import type { QuireFormatPainterMode } from "./types";
import { PluginKey, type EditorState, type Transaction } from "@quirekit/pm";

/** One provider-owned value retained inside a private painter snapshot. */
export interface QuireFormattingSnapshotEntry {
  /** Provider identity used to route this value back to its owner. */
  readonly providerId: string;
  /** Provider-private immutable snapshot value. */
  readonly value: unknown;
}

/** Private formatting snapshot captured from one source selection. */
export interface QuireFormattingSnapshot {
  /** Provider values in stable application order. */
  readonly entries: readonly QuireFormattingSnapshotEntry[];
}

/** Internal ProseMirror plugin state for format-painter interaction. */
export interface QuireFormattingPluginState {
  /** Current activation mode. */
  readonly mode: QuireFormatPainterMode;
  /** Current private provider snapshot. */
  readonly snapshot: QuireFormattingSnapshot | null;
  /** Timestamp of the first toolbar press used for double-press promotion. */
  readonly lastPressAt: number | null;
}

/** Stable plugin key used by commands and product state queries. */
export const formattingPluginKey = new PluginKey<QuireFormattingPluginState>(
  "quireFormatting"
);

/** Initial inactive formatting plugin state. */
export const inactiveFormattingState: QuireFormattingPluginState = Object.freeze({
  mode: "off",
  snapshot: null,
  lastPressAt: null
});

/**
 * Reads current formatting plugin state with an inactive fallback.
 *
 * @param state - Current ProseMirror state.
 * @returns Installed formatting state or the inactive baseline.
 */
export function getFormattingPluginState(
  state: EditorState
): QuireFormattingPluginState {
  return formattingPluginKey.getState(state) ?? inactiveFormattingState;
}

/**
 * Stores one complete local formatting state on a transaction.
 *
 * @param tr - Transaction receiving local plugin metadata.
 * @param state - Next private formatting state.
 * @param withoutHistory - Whether this is a state-only transaction.
 * @returns The same transaction for command chaining.
 */
export function setFormattingPluginState(
  tr: Transaction,
  state: QuireFormattingPluginState,
  withoutHistory: boolean
): Transaction {
  tr.setMeta(formattingPluginKey, state);
  if (withoutHistory) tr.setMeta("addToHistory", false);
  return tr;
}

/**
 * Captures all installed provider values from the current state.
 *
 * @param state - Current editor state.
 * @param providers - Validated formatting provider order.
 * @param scope - Normalized source selection scope.
 * @returns Private snapshot, or null when no provider can capture.
 */
export function captureFormattingSnapshot(
  editorState: QuireEditorState,
  providers: readonly QuireFormattingProvider[],
  scope: import("./types").QuireFormattingSelectionScope
): QuireFormattingSnapshot | null {
  const state = editorState.pm;
  const entries: QuireFormattingSnapshotEntry[] = [];
  for (const provider of providers) {
    const value = provider.capture({
      editorState,
      state,
      selection: state.selection,
      scope
    });
    if (value !== undefined) {
      entries.push(Object.freeze({ providerId: provider.id, value }));
    }
  }
  return entries.length === 0
    ? null
    : Object.freeze({ entries: Object.freeze(entries) });
}
