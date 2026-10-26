import type { QuireEditorState } from "@quirekit/core";
import { NodeSelection } from "@quirekit/pm";
import { applyQuirePresentationOverlay } from "./presentation-overlay";
import type {
  QuireTransientNodeLayoutPatch,
  QuireViewEngineFrameBuildOptions
} from "./types";

/**
 * Resolves the exact committed or speculative state used by one frame.
 *
 * Order: node patch, then presentation overlay, then IME preedit. Options must
 * come from `resolveQuirePresentationFrameOptions`, which admits the overlay
 * against `state.doc` and maps preedit into presentation coordinates.
 *
 * @param state - Committed editor state.
 * @param options - Resolved frame options carrying optional transient inputs.
 * @returns State authority shared by every frame phase.
 */
export function resolveQuireViewEngineFrameState(
  state: QuireEditorState,
  options: QuireViewEngineFrameBuildOptions
): QuireEditorState {
  const patched = applyTransientNodePatch(state, options.transientNodeLayoutPatch);
  const presented = options.presentationOverlay === undefined
    ? patched
    : wrapPmState(state, applyQuirePresentationOverlay(patched.pm, options.presentationOverlay));
  return applyImePreedit(presented, options);
}

/**
 * Applies one revalidated node patch to immutable speculative state.
 *
 * @param state - Current state authority.
 * @param patch - Optional exact node patch.
 * @returns Patched or unchanged state.
 */
function applyTransientNodePatch(
  state: QuireEditorState,
  patch: QuireTransientNodeLayoutPatch | undefined
): QuireEditorState {
  if (patch === undefined) return state;
  const node = state.pm.doc.nodeAt(patch.position);
  if (node === null || node.type.name !== patch.nodeTypeName) return state;

  try {
    const preserveNodeSelection = state.pm.selection instanceof NodeSelection
      && state.pm.selection.from === patch.position;
    const transaction = state.pm.tr;
    let selectionPosition = patch.position;
    if (patch.targetPosition !== undefined && patch.targetPosition !== patch.position) {
      const replacement = node.type.create(patch.attrs, node.content, node.marks);
      transaction.delete(patch.position, patch.position + node.nodeSize);
      selectionPosition = transaction.mapping.map(patch.targetPosition, -1);
      if (!transaction.doc.resolve(selectionPosition).parent.inlineContent) return state;
      transaction.insert(selectionPosition, replacement);
    } else {
      transaction.setNodeMarkup(patch.position, node.type, patch.attrs);
    }
    transaction.setSelection(
      preserveNodeSelection
        ? NodeSelection.create(transaction.doc, selectionPosition)
        : state.pm.selection.map(transaction.doc, transaction.mapping)
    );
    return wrapPmState(state, state.pm.apply(transaction));
  } catch {
    return state;
  }
}

/**
 * Applies visible IME text without dispatching or touching history.
 *
 * @param state - Current state authority.
 * @param options - Frame options carrying optional preedit.
 * @returns Speculative or unchanged state.
 */
function applyImePreedit(
  state: QuireEditorState,
  options: QuireViewEngineFrameBuildOptions
): QuireEditorState {
  const preedit = options.imePreedit;
  if (preedit === undefined || preedit.text.length === 0) return state;
  const pm = state.pm.apply(
    state.pm.tr.insertText(preedit.text, preedit.range.from, preedit.range.to)
  );
  return wrapPmState(state, pm);
}

/**
 * Reuses extension and storage authority around one speculative PM state.
 *
 * @param state - Source editor state.
 * @param pm - Speculative PM state.
 * @returns Quire editor state wrapper.
 */
function wrapPmState(
  state: QuireEditorState,
  pm: QuireEditorState["pm"]
): QuireEditorState {
  return {
    pm,
    doc: pm.doc,
    schema: pm.schema,
    extensions: state.extensions,
    storage: state.storage
  };
}
