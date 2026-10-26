import { mathTemplates } from '../templates/catalog';
import type { MathVisualDirection } from '../visual/types';
import type { MathEditor, MathKeyboardInput, MathTextInput, MathInputDecision } from './types';

const handled: MathInputDecision = Object.freeze({ handled: true });
const unhandled: MathInputDecision = Object.freeze({ handled: false });
const scriptTemplates: Readonly<Record<string, string>> = Object.freeze({ '^': 'superscript', _: 'subscript' });
const arrows: Readonly<Record<string, MathVisualDirection>> = Object.freeze({
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Home: 'home', End: 'end',
});

/**
 * Routes modifier shortcuts for history and selection.
 * @param editor - Canonical headless instance.
 * @param input - Keyboard facts with Ctrl or Cmd held.
 * @returns Decision, or undefined for a shortcut this editor does not own.
 */
function shortcut(editor: MathEditor, input: MathKeyboardInput): MathInputDecision | undefined {
  const key = input.key.toLowerCase();
  if (key === 'z') {
    if (input.shiftKey) editor.redo();
    else editor.undo();
    return handled;
  }
  if (key === 'y') {
    editor.redo();
    return handled;
  }
  if (key === 'a') {
    editor.selectAll();
    return handled;
  }
  return undefined;
}

/**
 * Applies the structural meaning of `^`, `_` and `\`, whether typed as a key or as text input.
 * Virtual keyboards and some IMEs deliver these only as text, without a matching key event.
 * @param editor - Canonical headless instance.
 * @param character - Key value or inserted text.
 * @returns Decision, or undefined when the character is ordinary text.
 */
function structuralCharacter(editor: MathEditor, character: string): MathInputDecision | undefined {
  // `\` starts a command search as in LaTeX; `/` stays an ordinary division slash.
  if (character === '\\') {
    editor.setCommandOpen(true);
    return handled;
  }
  const id = scriptTemplates[character];
  if (!id) return undefined;
  editor.insertTemplate(mathTemplates.find(template => template.id === id)!);
  return handled;
}

/**
 * Routes native or custom keyboard facts into the canonical structural editor.
 * @param editor - One headless instance.
 * @param input - Framework-neutral event facts after IME arbitration.
 * @returns Whether to prevent native editing or release input focus.
 */
export function handleMathKeyDown(editor: MathEditor, input: MathKeyboardInput): MathInputDecision {
  const state = editor.getSnapshot();
  if (!state.canEdit || state.composing || input.isComposing || input.keyCode === 229) return unhandled;
  if (input.ctrlKey || input.metaKey) return shortcut(editor, input) ?? unhandled;
  if (input.altKey) return unhandled;
  const command = structuralCharacter(editor, input.key);
  if (command) return command;
  if (input.key === 'Backspace' || input.key === 'Delete') {
    editor.delete(input.key === 'Delete');
    return handled;
  }
  if (input.key === 'Tab') {
    editor.move(input.shiftKey ? 'previous' : 'next');
    return handled;
  }
  const direction = arrows[input.key];
  if (direction) {
    editor.move(direction, input.shiftKey === true);
    return handled;
  }
  if (input.key === 'Escape') return { handled: true, blur: true };
  return unhandled;
}

/**
 * Applies native deletion/history and literal text without exposing LaTeX syntax.
 * @param editor - Canonical headless instance.
 * @param input - Framework-neutral text intent after IME arbitration.
 * @returns Whether the consumer should cancel native buffer mutation.
 */
export function handleMathBeforeInput(editor: MathEditor, input: MathTextInput): MathInputDecision {
  const state = editor.getSnapshot();
  if (!state.canEdit || state.composing || input.isComposing) return unhandled;
  switch (input.inputType) {
    case 'deleteContentBackward':
    case 'deleteContentForward':
      editor.delete(input.inputType === 'deleteContentForward');
      return handled;
    case 'historyUndo':
      editor.undo();
      return handled;
    case 'historyRedo':
      editor.redo();
      return handled;
  }
  if (input.inputType.startsWith('insert') && input.data) {
    const command = input.inputType === 'insertText' ? structuralCharacter(editor, input.data) : undefined;
    if (command) return command;
    editor.insertText(input.data);
    return handled;
  }
  return unhandled;
}
