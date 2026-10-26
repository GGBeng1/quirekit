import type { QuireEditorInputBindingOptions } from "../types";
import type { QuireNativeTextContext } from "./types";

/**
 * Accepts a native selection only while its complete source map remains current.
 * @param binding - Existing canonical input authority.
 * @param context - Context currently exposed in the native host.
 * @returns Whether the native selection was representable and accepted.
 */
export function acceptNativeTextSelection(
  binding: QuireEditorInputBindingOptions,
  context: QuireNativeTextContext | null
): boolean {
  const input = binding.inputProxy;
  if (!context || context.doc !== binding.editor.state.doc || context.text !== input.value) return false;
  const start = context.positions[input.selectionStart];
  const end = context.positions[input.selectionEnd];
  if (start == null || end == null) return false;
  const backwards = input.selectionDirection === "backward";
  return selectNativeTextRange(binding, backwards ? end : start, backwards ? start : end);
}

/**
 * Routes a native text range through the same typed selection command as other clients.
 * @param binding - Mounted input authority.
 * @param anchor - Canonical anchor.
 * @param head - Canonical moving endpoint.
 * @returns Whether the exact requested range became canonical.
 */
export function selectNativeTextRange(binding: QuireEditorInputBindingOptions, anchor: number, head: number): boolean {
  if (binding.shouldRouteInput?.() === false) return false;
  const current = binding.editor.state.pm.selection;
  if (current.anchor === anchor && current.head === head) return true;
  binding.editor.commands.setTextSelection({ from: anchor, to: head });
  const accepted = binding.editor.state.pm.selection;
  return accepted.anchor === anchor && accepted.head === head;
}
