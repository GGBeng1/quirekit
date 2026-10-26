import type { EditorState, Extension } from "@quirekit/cm-state";
import type { DecorationSet } from "@quirekit/cm-view";
import { editingBoundarySources } from "./registry";
import { editingBoundaryRuntime } from "./runtime";
import type { EditingBoundary } from "./types";

/** @param read - Current admitted block-component index. @returns The common editing runtime over immutable projection facts. */
export function editingObjectBoundaries(read: (state: EditorState) => DecorationSet): Extension {
  return [editingBoundaryRuntime, editingBoundarySources.of((state, from, to) => {
    const values: EditingBoundary[] = [];
    read(state).between(from, to, (start, end) => {
      values.push({ from: start, to: end, contentFrom: start, contentTo: end, kind: "atom", deletion: "protect" });
    });
    return values;
  })];
}
