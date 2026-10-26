import {
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorState,
  type Node as PMNode,
  type Transaction
} from "@quirekit/pm";
import type { ProofingExtensionOptions, ProofingIssue, ProofingSnapshot } from "../types";
import { mapProofingDocument } from "./document";
import { findCaretIssue, readDecorationIssue } from "./issues";
import { applyProofingMeta } from "./meta";
import type { ProofingMeta, ProofingPluginState } from "./types";

/** Plugin key owning proofing findings and the checking queue. */
export const proofingPluginKey = new PluginKey<ProofingPluginState>("quirekit-proofing");

/**
 * Creates the proofing plugin.
 *
 * @param options - Extension options.
 * @returns ProseMirror plugin painting findings as decorations.
 */
export function createProofingPlugin(options: ProofingExtensionOptions): Plugin<ProofingPluginState> {
  return new Plugin<ProofingPluginState>({
    key: proofingPluginKey,
    state: {
      init: (_config, state) => createInitialState(options, state.doc),
      apply: (tr, value, oldState, newState) => applyProofingTransaction(tr, value, oldState, newState, options)
    },
    props: {
      decorations: (state: EditorState) => proofingPluginKey.getState(state)?.presentation ?? null
    }
  });
}

/**
 * Creates the state of a new editor.
 *
 * @param options - Extension options.
 * @param doc - Initial document.
 * @returns Initial state with the whole document dirty when enabled.
 */
function createInitialState(options: ProofingExtensionOptions, doc: PMNode): ProofingPluginState {
  const enabled = options.enabled;
  return {
    enabled,
    issues: DecorationSet.empty,
    ignored: DecorationSet.empty,
    suppressed: new Set(),
    dirty: enabled && doc.content.size > 0 ? [{ from: 0, to: doc.content.size }] : [],
    inflight: [],
    sessionStatus: options.provider === null ? "disabled" : "idle",
    issueCount: 0,
    limited: false,
    typingAt: null,
    hiddenId: null,
    presentation: DecorationSet.empty,
    version: 0
  };
}

/**
 * Advances proofing state for one transaction.
 *
 * Phase order: the document change is mapped first so a meta in the same
 * transaction refers to the new document; the hidden finding is resolved last
 * because both phases can change it. Only the word being typed is hidden:
 * moving the caret into an existing finding without editing keeps it painted.
 *
 * @param tr - Applied transaction.
 * @param value - Previous state.
 * @param oldState - Editor state before the transaction.
 * @param state - New editor state.
 * @param options - Extension options.
 * @returns Next state.
 */
function applyProofingTransaction(
  tr: Transaction,
  value: ProofingPluginState,
  oldState: EditorState,
  state: EditorState,
  options: ProofingExtensionOptions
): ProofingPluginState {
  const meta = tr.getMeta(proofingPluginKey) as ProofingMeta | readonly ProofingMeta[] | undefined;
  let next = tr.docChanged ? mapProofingDocument(value, tr) : value;
  // The session batches its queued updates into one transaction, applied in order.
  for (const item of meta === undefined ? [] : Array.isArray(meta) ? meta : [meta]) {
    next = applyProofingMeta(next, item, state.doc, options);
  }
  const head = state.selection.empty ? state.selection.head : null;
  const typingAt = tr.docChanged ? head : oldState.selection.eq(state.selection) ? value.typingAt : null;
  const caret = typingAt === null ? undefined : findCaretIssue(next.issues, head);
  const hidden = caret !== undefined && caret.from <= typingAt! && typingAt! <= caret.to ? caret : undefined;
  const hiddenId = hidden === undefined ? null : readDecorationIssue(hidden).id;
  if (next === value && hiddenId === value.hiddenId && typingAt === value.typingAt) return value;
  const presentation = next.issues === value.issues && hiddenId === value.hiddenId
    ? value.presentation
    : hidden === undefined ? next.issues : next.issues.remove([hidden]);
  return { ...next, typingAt, hiddenId, presentation, version: value.version + 1 };
}

/**
 * Reads the full plugin state.
 *
 * @param state - Editor state.
 * @returns Plugin state, or undefined when the extension is absent.
 */
export function getProofingPluginState(state: EditorState): ProofingPluginState | undefined {
  return proofingPluginKey.getState(state);
}

/**
 * Reports whether the Proofing extension is installed in a state.
 *
 * @param state - Editor state.
 * @returns Whether proofing state exists.
 */
export function hasProofing(state: EditorState): boolean {
  return proofingPluginKey.getState(state) !== undefined;
}

/**
 * Summarizes proofing for product UI.
 *
 * @param state - Editor state.
 * @returns Snapshot; disabled when the extension is absent.
 */
export function getProofingSnapshot(state: EditorState): ProofingSnapshot {
  const value = proofingPluginKey.getState(state);
  if (value === undefined) return { enabled: false, status: "disabled", issueCount: 0, version: 0 };
  const status = !value.enabled || value.sessionStatus === "disabled" ? "disabled"
    : value.limited ? "limited"
      : value.dirty.length > 0 || value.inflight.length > 0 ? "checking"
        : value.sessionStatus;
  return { enabled: value.enabled, status, issueCount: value.issueCount, version: value.version };
}

/**
 * Lists every kept finding in document order.
 *
 * @param state - Editor state.
 * @returns Findings with current positions.
 */
export function getProofingIssues(state: EditorState): ProofingIssue[] {
  const issues = proofingPluginKey.getState(state)?.issues.find() ?? [];
  return issues.map(readDecorationIssue).sort((left, right) => left.from - right.from);
}

/**
 * Finds the finding at a position, including one hidden under the caret.
 *
 * @param state - Editor state.
 * @param pos - Document position.
 * @returns Finding touching the position, or undefined.
 */
export function getProofingIssueAt(state: EditorState, pos: number): ProofingIssue | undefined {
  const decoration = proofingPluginKey.getState(state)?.issues.find(pos, pos)[0];
  return decoration === undefined ? undefined : readDecorationIssue(decoration);
}
