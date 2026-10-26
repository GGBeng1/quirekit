import type {
  ClassicEditorHookContext,
  ClassicEditorPlugin
} from "../types";
import type { QuireEditorPasteEvent } from "@quirekit/core";

/** Product plugin lifecycle hook names. */
export type ClassicEditorHookName =
  | "onCreate"
  | "onMount"
  | "onUpdate"
  | "onUnmount"
  | "onDestroy";

/**
 * Invokes one lifecycle hook in deterministic plugin order.
 *
 * @param plugins - Plugins that receive the hook.
 * @param hook - Lifecycle hook name.
 * @param context - Current product lifecycle context.
 */
export function invokeClassicEditorHooks(
  plugins: readonly ClassicEditorPlugin[],
  hook: ClassicEditorHookName,
  context: ClassicEditorHookContext
): void {
  for (const plugin of plugins) plugin[hook]?.(context);
}

/**
 * Invokes product paste hooks in deterministic plugin order.
 *
 * @param plugins - Product plugins eligible to intercept the paste.
 * @param context - Current mounted product authorities.
 * @param event - Core paste event and parsed or empty slice.
 * @returns Whether the first claiming plugin consumed the paste.
 */
export function invokeClassicEditorPasteHooks(
  plugins: readonly ClassicEditorPlugin[],
  context: ClassicEditorHookContext,
  event: QuireEditorPasteEvent
): boolean {
  for (const plugin of plugins) {
    if (plugin.onPaste?.(context, event) === true) {
      return true;
    }
  }
  return false;
}
