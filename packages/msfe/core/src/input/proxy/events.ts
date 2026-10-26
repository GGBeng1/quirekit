import { createQuireImeInputEngine, type QuireImeEventResult } from "@quirekit/ime";
import { isolateHistory } from "@quirekit/cm-commands";
import { EditorSelection, Transaction } from "@quirekit/cm-state";
import { EditorView, runScopeHandlers } from "@quirekit/cm-view";
import { compositionEffect, compositionField } from "../../state/fields";
import { sourceProxyEffect, sourceProxyState } from "./state";
import { clearSourceInput, readSourceInput } from "./surface";
import { insertSourceInput, runSourceInputCommand } from "./commands";
import { sourceCaretSide } from "../geometry/position";

/** Native event normalization, with one commit authority and no editable rendered DOM. */
export class SourceInputEvents {
  private engine = createQuireImeInputEngine();
  private ignoredInput: string | null = null;
  private readonly controller;

  /** @param view - Canonical source/transaction authority. @param input - Native keyboard host. @param active - Live permission guard, including media/mode. */
  constructor(private readonly view: EditorView, private readonly input: HTMLTextAreaElement, private readonly active: () => boolean) {
    this.controller = new view.dom.ownerDocument.defaultView!.AbortController();
    const options = { signal: this.controller.signal };
    input.addEventListener("beforeinput", this.beforeInput, options);
    input.addEventListener("input", this.inputEvent, options);
    input.addEventListener("keydown", this.keyDown, options);
    input.addEventListener("compositionstart", this.composition, options);
    input.addEventListener("compositionupdate", this.composition, options);
    input.addEventListener("compositionend", this.composition, options);
    input.addEventListener("paste", this.paste, options);
    input.addEventListener("copy", this.copy, options); input.addEventListener("cut", this.copy, options);
    input.addEventListener("contextmenu", event => event.preventDefault(), options);
  }

  /** @param result - Shared IME state-machine output; preedit never enters persistent source. */
  private apply(result: QuireImeEventResult): void {
    const { view } = this, state = view.state, previous = state.field(sourceProxyState).preedit;
    const composing = state.field(compositionField, false) ?? false;
    if (result.commitText !== undefined) {
      // Release the guard and remove transient paint in the same replacement.
      // CM history/provider see exactly one accepted document transaction.
      // Commit where preedit was painted, as mapped through any external edits.
      const target = previous ? state.update({ selection: previous.selection }).state : state;
      view.dispatch({ ...target.replaceSelection(result.commitText), effects: [compositionEffect.of(false), sourceProxyEffect.of({ preedit: null })],
        annotations: isolateHistory.of("full"), userEvent: "input.type.compose.start", scrollIntoView: true });
      this.ignoredInput = result.commitText;
    } else if (result.isComposing) {
      let selection = previous?.selection;
      if (!selection) {
        // Capture the same text side as the painted caret once. At a hidden
        // delimiter, a forward widget would otherwise escape its owning cell.
        const range = state.selection.main;
        const side = range.empty ? sourceCaretSide(view, range.head, range.assoc < 0 ? -1 : 1) : null;
        selection = side ? state.selection.replaceRange(EditorSelection.cursor(range.head, side)) : state.selection;
      }
      const preedit = { selection, text: result.preeditText };
      if (!composing || preedit.text !== previous?.text) view.dispatch({ effects: [compositionEffect.of(true), sourceProxyEffect.of({ preedit })],
        annotations: Transaction.addToHistory.of(false) });
    } else if (composing || previous) view.dispatch({ effects: [compositionEffect.of(false), sourceProxyEffect.of({ preedit: null })], annotations: Transaction.addToHistory.of(false) });
    if (result.clearInput && !result.preserveInput) clearSourceInput(this.input);
  }

  /** @param event - Native composition phase. */
  private readonly composition = (event: CompositionEvent): void => {
    event.stopPropagation();
    if (!this.active()) { this.reset(); return; }
    const payload = { data: event.data, inputValue: readSourceInput(this.input) };
    if (event.type === "compositionstart") this.ignoredInput = null;
    this.apply(event.type === "compositionstart" ? this.engine.handleCompositionStart(payload)
      : event.type === "compositionupdate" ? this.engine.handleCompositionUpdate(payload) : this.engine.handleCompositionEnd(payload));
  };

  /** @param event - Native intent before the proxy value changes. */
  private readonly beforeInput = (event: InputEvent): void => {
    event.stopPropagation();
    if (!this.active()) { event.preventDefault(); this.reset(); return; }
    const result = this.engine.handleBeforeInput({ data: event.data, inputType: event.inputType, isComposing: event.isComposing, inputValue: readSourceInput(this.input) });
    if (result.handledByIme) {
      if (result.preventDefault) event.preventDefault();
      if (result.duplicateCommit) this.ignoredInput = event.data;
      this.apply(result); return;
    }
    // Some native text services omit beforeinput.data. Let only the isolated
    // buffer mutate, then accept its value in input; canceling here loses text.
    if (!event.data && event.inputType.startsWith("insert") && !["insertParagraph", "insertLineBreak"].includes(event.inputType)) {
      this.ignoredInput = null; return;
    }
    event.preventDefault();
    if (["insertParagraph", "insertLineBreak"].includes(event.inputType)) {
      runSourceInputCommand(this.view, event.inputType); this.ignoredInput = event.data;
    } else if (event.inputType.startsWith("insert") && event.data !== null) {
      insertSourceInput(this.view, event.data, event.inputType === "insertFromPaste" ? "input.paste" : "input.type");
      this.ignoredInput = event.data;
    } else { runSourceInputCommand(this.view, event.inputType); this.ignoredInput = null; }
    clearSourceInput(this.input);
  };

  /** @param event - Browser fallback, including noncancelable or missing beforeinput. */
  private readonly inputEvent = (event: InputEvent): void => {
    event.stopPropagation();
    if (!this.active()) { this.reset(); return; }
    const inputValue = readSourceInput(this.input), payload = { data: event.data, inputType: event.inputType, isComposing: event.isComposing, inputValue };
    const result = this.engine.handleInput(payload);
    if (result.handledByIme) { this.apply(result); return; }
    const text = event.data || inputValue;
    if (this.ignoredInput !== null && text === this.ignoredInput) { this.ignoredInput = null; clearSourceInput(this.input); return; }
    this.ignoredInput = null;
    const duplicate = this.engine.handleBeforeInput(payload);
    if (duplicate.handledByIme) { this.apply(duplicate); return; }
    if (event.inputType.startsWith("delete")) runSourceInputCommand(this.view, event.inputType);
    else insertSourceInput(this.view, text, event.inputType === "insertFromPaste" ? "input.paste" : "input.type");
    clearSourceInput(this.input);
  };

  /** @param event - Hardware keyboard intent; configured CM keymaps remain authoritative. */
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (!this.active()) return;
    const result = this.engine.handleKeyDown(event);
    if (result.handledByIme) { if (result.preventDefault) event.preventDefault(); this.apply(result); return; }
    if (runScopeHandlers(this.view, event, "editor")) { event.preventDefault(); clearSourceInput(this.input); }
  };

  /** @param event - Clipboard insertion into the logical selection, rather than the hidden buffer. */
  private readonly paste = (event: ClipboardEvent): void => {
    event.preventDefault(); event.stopPropagation();
    if (!this.active() || this.view.state.field(compositionField, false)) return;
    const text = event.clipboardData?.getData("text/plain");
    if (text) { insertSourceInput(this.view, text, "input.paste"); this.ignoredInput = text; }
    clearSourceInput(this.input);
  };

  /** @param event - Hardware copy/cut; the hidden sentinel is never clipboard content. */
  private readonly copy = (event: ClipboardEvent): void => {
    event.preventDefault(); event.stopPropagation();
    if (!this.active() || this.view.state.field(compositionField, false) || !event.clipboardData) return;
    const range = this.view.state.selection.main;
    if (range.empty) return;
    let text = this.view.state.sliceDoc(range.from, range.to);
    for (const filter of this.view.state.facet(EditorView.clipboardOutputFilter)) text = filter(text, this.view.state);
    event.clipboardData.setData("text/plain", text);
    if (event.type === "cut") this.view.dispatch({ ...this.view.state.replaceSelection(""), userEvent: "delete.cut", scrollIntoView: true });
  };

  /** Clears native composition after permission/focus loss; cancellation preserves source and selection. */
  reset(): void { this.engine.handleBlur(); this.ignoredInput = null; clearSourceInput(this.input); }

  /** Releases native listeners without committing unfinished input. */
  destroy(): void { this.controller.abort(); this.reset(); }
}
