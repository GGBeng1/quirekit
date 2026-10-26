import { StateEffect, StateField, type EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { compositionField } from "../state/fields";
import { revealSelectionField } from "./gesture";
import type { PresentationSetting } from "./types";
import { captureScrollAnchor, restoreScrollAnchor, scrollAnchorEffects } from "../mount/scroll";

/**
 * Defines a typed configuration effect that cannot carry source edits or history changes.
 * @param validate - Pure runtime validator; extension authors must not accept untrusted executable values.
 * @returns Installable setting with a readonly-safe setter and input-lifecycle deferral.
 */
export function definePresentationSetting<T>(validate: (value: unknown) => value is T): PresentationSetting<T> {
  const effect = StateEffect.define<T>();
  const field = StateField.define<{ requested: T; applied: T }>({
    /** @returns Never; installation requires the extension's validated initializer. */
    create() { throw new Error("presentation-setting-needs-initial-value"); },
    /** @param value - Current preference. @param transaction - Accepted input or configuration. @returns Input-stable applied preference. */
    update(value, transaction) {
      let requested = value.requested;
      for (const item of transaction.effects) if (item.is(effect)) requested = item.value;
      // Canonical input is accepted first. The existing gesture/composition fields are
      // independent of this setting, so pending settings resolve in the same release transaction.
      // Read input ownership directly: presentation settings may themselves supply
      // readSourcePresentation, so consulting that derived value would be cyclic.
      const held = transaction.state.field(compositionField, false) || transaction.state.field(revealSelectionField, false);
      const applied = held ? value.applied : requested;
      return Object.is(requested, value.requested) && Object.is(applied, value.applied) ? value : { requested, applied };
    },
  });
  /** @param state - Current editor state. @returns Installed value without imposing a setting on other editors. */
  const read = (state: EditorState) => state.field(field, false);
  return {
    /** @param initial - Instance-owned preference. @returns Fresh state initialization, also for document replacement. */
    extension(initial) {
      return field.init(() => {
        const value = initial();
        if (!validate(value)) throw new Error("invalid-presentation-setting");
        return { requested: value, applied: value };
      });
    },
    /** @param state - Current source state. @returns Applied preference. */
    read: state => read(state)?.applied,
    /** @param state - Current source state. @returns Last accepted request. */
    requested: state => read(state)?.requested,
    /** @param editor - Mounted source owner. @param value - Requested typed preference. @returns Acceptance or a stable diagnostic. */
    set(editor, value) {
      if (editor.scope.disposed) return { ok: false, reason: "destroyed" };
      if (!validate(value)) return { ok: false, reason: "invalid-change" };
      if (!read(editor.state)) return { ok: false, reason: "not-installed" };
      let view: EditorView | null;
      try { view = EditorView.findFromDOM(editor.element); } catch { return { ok: false, reason: "not-mounted" }; }
      if (!view) return { ok: false, reason: "not-mounted" };
      if (!Object.is(read(view.state)?.requested, value)) {
        const anchor = captureScrollAnchor(view);
        view.dispatch({ effects: [effect.of(value), ...scrollAnchorEffects(anchor)] });
        restoreScrollAnchor(view, anchor, () => !editor.scope.disposed && Object.is(read(view.state)?.requested, value));
      }
      return { ok: true };
    },
  };
}
