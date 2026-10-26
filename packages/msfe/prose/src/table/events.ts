import { EditorSelection, type Text } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { tableContext } from "./context";
import { enterTableCell } from "./commands";

/** @param editor - Late canonical editor. @returns Source-backed empty-cell activation that leaves native drag selection intact. */
export function tablePlaceholderEvents(editor: () => MsfeEditor) {
  let down: { x: number; y: number; position: number; column: number; doc: Text } | undefined;
  return EditorView.domEventHandlers({
    pointerdown(event, view) {
      down = undefined;
      const cell = (event.target as Element).closest<HTMLElement>(".msfe-table-empty");
      if (event.button === 0 && cell) down = { x: event.clientX, y: event.clientY, position: view.posAtDOM(cell),
        column: Number(cell.dataset.tableColumn), doc: view.state.doc };
      return false;
    },
    pointercancel() { down = undefined; return false; },
    pointerup(event, view) {
      const start = down; down = undefined;
      if (!start || start.doc !== view.state.doc || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) return false;
      return editor().run(state => {
        const draft = state.update({ selection: EditorSelection.single(start.position) }).state;
        const context = tableContext(draft);
        return context ? enterTableCell(draft, context, start.column) : null;
      }).ok;
    },
  });
}
