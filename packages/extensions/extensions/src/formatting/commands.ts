import type { CommandProps } from "@quirekit/core";
import type { QuireFormattingProvider, FormattingOptions, FormattingCommands } from "./types";
import { resolveFormattingSelectionScope } from "./selection";
import { clearFormatting, pasteFormatting } from "./mutation";
import {
  captureFormattingSnapshot,
  getFormattingPluginState,
  setFormattingPluginState
} from "./plugin-state";

/**
 * Creates formatting commands around one stable provider registry.
 *
 * @param options - Format-painter timing and preservation policy.
 * @param resolveProviders - Resolves providers from the command-bound editor.
 * @returns Public formatting command map.
 */
export function createFormattingCommands(
  options: FormattingOptions,
  resolveProviders: (context: CommandProps) => readonly QuireFormattingProvider[]
): FormattingCommands {
  return {
    copyFormatting: () => context => captureFormatting(
      context,
      resolveProviders(context),
      "off"
    ),
    pasteFormatting: () => context => pasteFormatting(
      context,
      resolveProviders(context)
    ),
    toggleFormatPainter: () => context => toggleFormatPainter(
      context,
      resolveProviders(context),
      options.doublePressDelay
    ),
    cancelFormatPainter: () => cancelFormatPainter,
    clearFormatting: () => context => (
      context.editor.isEditable
      && clearFormatting(context, resolveProviders(context))
    )
  };
}

/**
 * Captures reusable formatting and independently chooses painter activation.
 *
 * @param context - Current command context.
 * @param providers - Installed provider registry.
 * @param mode - Explicit copy stays inactive; painter activation arms one gesture.
 * @returns Whether a snapshot could be captured.
 */
function captureFormatting(
  context: CommandProps,
  providers: readonly QuireFormattingProvider[],
  mode: "off" | "once"
): boolean {
  if (!context.editor.isEditable) return false;
  const snapshot = captureFormattingSnapshot(
    context.editor.state,
    providers,
    resolveFormattingSelectionScope(context.state.selection)
  );
  if (snapshot === null) return false;
  if (context.dispatch !== undefined) {
    context.dispatch(setFormattingPluginState(context.tr, {
      mode,
      snapshot,
      lastPressAt: mode === "once" ? Date.now() : null
    }, true));
  }
  return true;
}

/**
 * Implements single press, double press, and active-tool cancellation.
 *
 * @param context - Current command context.
 * @param providers - Installed provider registry.
 * @param doublePressDelay - Maximum double-press interval in milliseconds.
 * @returns Whether the painter state transition was available.
 */
function toggleFormatPainter(
  context: CommandProps,
  providers: readonly QuireFormattingProvider[],
  doublePressDelay: number
): boolean {
  if (!context.editor.isEditable) return false;
  const current = getFormattingPluginState(context.state);
  const now = Date.now();

  if (current.mode === "locked") {
    return cancelFormatPainter(context);
  }
  if (current.mode === "once") {
    if (
      current.lastPressAt !== null
      && now - current.lastPressAt <= doublePressDelay
    ) {
      if (context.dispatch !== undefined) {
        context.dispatch(setFormattingPluginState(context.tr, {
          ...current,
          mode: "locked",
          lastPressAt: null
        }, true));
      }
      return true;
    }
    return cancelFormatPainter(context);
  }
  return captureFormatting(context, providers, "once");
}

/**
 * Cancels format-painter mode without creating a history event.
 *
 * @param context - Current command context.
 * @returns Whether an active state was cancelled.
 */
function cancelFormatPainter(context: CommandProps): boolean {
  const current = getFormattingPluginState(context.state);
  if (current.mode === "off") return false;
  context.dispatch?.(setFormattingPluginState(
    context.tr,
    { ...current, mode: "off", lastPressAt: null },
    true
  ));
  return true;
}
