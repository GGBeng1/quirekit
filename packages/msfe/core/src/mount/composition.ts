import type { TransactionSpec } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";

/**
 * Resolves a complex source selection before native IME mutates its DOM projection.
 * @param view - Current input owner, before the first preedit DOM mutation.
 * @returns One canonical replacement, or no change for native text-only input.
 */
export function prepareCompositionSelection(view: EditorView): TransactionSpec | undefined {
  const { state } = view;
  if (state.readOnly || view.composing || state.selection.main.empty
    || "editContext" in view.contentDOM && view.contentDOM.editContext) return;

  // Replacing styled DOM across text nodes can create temporary browser wrappers.
  // Cleaning those wrappers afterwards may cancel native composition even when
  // its text node survives. Prepare the canonical range before preedit DOM exists.
  for (const selection of state.selection.ranges) {
    if (selection.empty) continue;
    const start = view.domAtPos(selection.from, 1), end = view.domAtPos(selection.to, -1);
    if (start.node !== end.node || start.node.nodeType !== 3) return { ...state.replaceSelection(""), userEvent: "input" };
  }

  // Invisible uneditable widgets can also reconstruct selected source after a
  // native replacement. Query the shared index instead of branching by syntax.
  for (const provider of state.facet(EditorView.atomicRanges)) {
    const ranges = provider(view);
    for (const selection of state.selection.ranges) {
      if (selection.empty) continue;
      let intersects = false;
      ranges.between(selection.from, selection.to, (from, to) => {
        if (from < selection.to && to > selection.from) { intersects = true; return false; }
      });
      if (intersects) return { ...state.replaceSelection(""), userEvent: "input" };
    }
  }
}
