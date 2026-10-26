import { mathTemplates } from '../templates/catalog';
import { deleteMathVisual, insertMathVisualTemplate, insertMathVisualText } from '../visual/edit';
import { moveMathVisual } from '../visual/navigation';
import type { MathVisualEdit } from '../visual/types';
import type { MathEditorOperationPort, MathEditorOperations } from './types';

/**
 * Creates the source, structure and history operations of one editor instance.
 * @param port - Controller state and publication ports.
 * @returns Operations that validate admission, apply one atomic step and publish once.
 */
export function createMathEditorOperations(port: MathEditorOperationPort): MathEditorOperations {
  const { state } = port;
  /**
   * Accepts a structural result as one atomic source/caret step.
   * @param edit - Complete admitted edit, or rejected input.
   * @returns Whether an edit or pure structural selection was accepted.
   */
  function apply(edit: MathVisualEdit | null): boolean {
    if (!port.editable()) return false;
    if (!edit) {
      state.feedback = 'unsupported-input';
      port.publish();
      return false;
    }
    port.session().update(edit.latex, edit.selection);
    state.feedback = undefined;
    port.refresh();
    return true;
  }
  /**
   * Moves through local history.
   * @param step - Session history operation.
   */
  function travel(step: () => void): void {
    if (!port.sourceEditable()) return;
    step();
    state.feedback = undefined;
    port.refresh();
  }
  const operations: MathEditorOperations = {
    /**
     * @param latex - Exact draft source.
     * @returns Whether editing was allowed.
     */
    setLatex(latex) {
      if (!port.sourceEditable()) return false;
      port.session().update(latex);
      state.feedback = undefined;
      port.refresh();
      return true;
    },
    /**
     * @param text - Typed, composed or pasted characters.
     * @returns Whether insertion succeeded.
     */
    insertText(text) {
      if (!port.editable() || !text) return false;
      const { preview, selection } = port.session().getState();
      return apply(insertMathVisualText(preview, selection, text));
    },
    /**
     * @param template - Admitted template.
     * @returns Whether insertion succeeded.
     */
    insertTemplate(template) {
      if (!port.editable()) return false;
      const { preview, selection } = port.session().getState();
      return apply(insertMathVisualTemplate(preview, selection, template));
    },
    /**
     * @param value - Catalog identity.
     * @returns Whether insertion succeeded.
     */
    chooseCommand(value) {
      if (!port.editable()) return false;
      const template = mathTemplates.find(item => item.id === value);
      state.commandOpen = false;
      const accepted = value.startsWith('symbol:') ? operations.insertText(value.slice(7)) : template ? operations.insertTemplate(template) : false;
      port.publish();
      return accepted;
    },
    /**
     * @param selection - Complete boundaries.
     * @returns Whether accepted.
     */
    select(selection) {
      if (!port.editable()) return false;
      const accepted = port.session().select(selection);
      if (accepted) port.publish();
      return accepted;
    },
    /**
     * @param direction - Structural navigation.
     * @param extend - Extends the selection.
     */
    move(direction, extend = false) {
      if (!port.editable()) return;
      const { preview, selection } = port.session().getState();
      operations.select(moveMathVisual(preview, selection, direction, extend, port.slots()));
    },
    /** @param forward - Deletes the next child. */
    delete(forward = false) {
      if (!port.editable()) return;
      const { preview, selection } = port.session().getState();
      const edit = deleteMathVisual(preview, selection, forward);
      if (edit) apply(edit);
    },
    /** Selects complete root children without layout or source work. */
    selectAll() {
      const count = port.session().getState().preview.root.children.length;
      operations.select({ focus: { slot: 'root', index: count }, anchor: { slot: 'root', index: 0 } });
    },
    /** Restores local history even when current source is invalid. */
    undo() { travel(() => port.session().undo()); },
    /** Restores forward local history without touching host persistence. */
    redo() { travel(() => port.session().redo()); },
  };
  return operations;
}
