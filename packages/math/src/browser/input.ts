import { createQuireImeInputEngine } from '@quirekit/ime';
import type { QuireImeEventResult } from '@quirekit/ime';
import type { MathEditor } from '../editor/types';
import { createMathInputBuffer } from './buffer';
import { bindMathEvents } from './events';

/**
 * Binds the existing independent IME engine before structural input intentions.
 * @param editor - Canonical headless authority.
 * @param input - Consumer-owned native composition buffer.
 * @returns Removes native handlers, resets IME and restores the original input state.
 */
export function bindMathInput(editor: MathEditor, input: HTMLElement): () => void {
  const buffer = createMathInputBuffer(input);
  let tick: number | undefined;
  /**
   * Gives same-task composition residue one stable engine tick despite synchronous consumer work.
   * @returns Current task's millisecond tick; later native tasks receive a new clock value.
   */
  function now(): number {
    if (tick === undefined) {
      tick = Date.now();
      queueMicrotask(() => { tick = undefined; });
    }
    return tick;
  }
  const engine = createQuireImeInputEngine({ now });
  const original = { left: input.style.left, top: input.style.top };
  let alive = true;
  /**
   * Accepts shared IME ownership before any ordinary formula insertion.
   * @param result - Existing independent IME engine's decision.
   * @param event - Optional cancellable native event.
   * @returns Whether this event belongs to composition.
   */
  function accept(result: QuireImeEventResult, event?: Event): boolean {
    if (result.preventDefault) event?.preventDefault();
    editor.setComposition(result.isComposing, result.preeditText);
    if (result.clearInput) buffer.clear();
    if (result.commitText) editor.insertText(result.commitText);
    return result.handledByIme;
  }
  /**
   * Routes all composition phases with the native buffer fallback.
   * @param event - Browser composition event.
   */
  function composition(event: Event): void {
    if (!editor.getSnapshot().canEdit) return;
    const data = { data: (event as CompositionEvent).data, inputValue: buffer.read() };
    accept(event.type === 'compositionstart' ? engine.handleCompositionStart(data)
      : event.type === 'compositionupdate' ? engine.handleCompositionUpdate(data) : engine.handleCompositionEnd(data), event);
  }
  /**
   * Arbitrates composition before headless keyboard operations.
   * @param event - Browser keyboard event.
   */
  function keydown(event: Event): void {
    const key = event as KeyboardEvent;
    if (!editor.getSnapshot().canEdit || accept(engine.handleKeyDown(key), key)) return;
    const result = editor.handleKeyDown(key);
    if (result.handled) key.preventDefault();
    if (result.blur) input.blur();
  }
  /**
   * Cancels native mutation when an admitted structural edit owns beforeinput.
   * @param event - Browser beforeinput event.
   */
  function beforeinput(event: Event): void {
    const native = event as InputEvent;
    if (!editor.getSnapshot().canEdit) {
      native.preventDefault();
      return;
    }
    if (accept(engine.handleBeforeInput({ inputType: native.inputType, data: native.data, isComposing: native.isComposing, inputValue: buffer.read() }), event)) return;
    if (editor.handleBeforeInput({ inputType: native.inputType, data: native.data, isComposing: native.isComposing }).handled) {
      native.preventDefault();
      buffer.clear();
    }
  }
  /**
   * Consumes native buffer fallback while suppressing trailing duplicate commits.
   * @param event - Browser input event.
   */
  function changed(event: Event): void {
    if (!editor.getSnapshot().canEdit) {
      buffer.clear();
      return;
    }
    const native = event as InputEvent;
    const value = buffer.read();
    const handled = accept(engine.handleInput({ inputType: native.inputType, data: native.data, isComposing: native.isComposing, inputValue: value }), event);
    if (!handled && value) {
      editor.insertText(value);
      buffer.clear();
    }
  }
  /**
   * Inserts only literal clipboard text, preserving rejected structural selections.
   * @param event - Browser paste event.
   */
  function paste(event: Event): void {
    event.preventDefault();
    const text = (event as ClipboardEvent).clipboardData?.getData('text/plain');
    if (text) editor.insertText(text);
  }
  /** Synchronizes native input availability without blocking pending graphics or IME. */
  function sync(): void {
    const disabled = !editor.getSnapshot().canEdit;
    buffer.setDisabled(disabled);
    if (disabled) {
      input.blur();
      accept(engine.handleBlur());
      editor.setFocused(false);
      buffer.clear();
    }
  }
  /** Reflects native focus in the single headless authority. */
  function focus(): void { editor.setFocused(true); }
  /** Ends transient composition without saving preedit into the formula. */
  function blur(): void {
    editor.setFocused(false);
    accept(engine.handleBlur());
  }
  const remove = bindMathEvents(input, { keydown, beforeinput, input: changed, paste, focus, blur,
    compositionstart: composition, compositionupdate: composition, compositionend: composition });
  buffer.clear();
  sync();
  const unsubscribe = editor.subscribe(sync);
  return () => {
    if (!alive) return;
    alive = false;
    remove();
    unsubscribe();
    blur();
    buffer.restore();
    input.style.left = original.left;
    input.style.top = original.top;
  };
}
