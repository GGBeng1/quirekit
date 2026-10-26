import type { CommandProps } from "@quirekit/core";
import type { QuireFormattingProvider } from "./types";
import { resolveFormattingSelectionScope } from "./selection";
import { getFormattingPluginState, setFormattingPluginState, type QuireFormattingPluginState } from "./plugin-state";

/**
 * Applies a retained snapshot through every matching provider.
 *
 * @param context - Current command context and shared transaction.
 * @param providers - Installed provider registry.
 * @returns Whether document or stored formatting state changed.
 */
export function pasteFormatting(
  context: CommandProps,
  providers: readonly QuireFormattingProvider[]
): boolean {
  if (!context.editor.isEditable) return false;
  const current = getFormattingPluginState(context.state);
  if (current.snapshot === null) return false;
  const byId = new Map(providers.map(provider => [provider.id, provider]));
  const mutation = {
    state: context.state,
    tr: context.tr,
    scope: resolveFormattingSelectionScope(context.tr.selection)
  };
  let changed = false;
  for (const entry of current.snapshot.entries) {
    const provider = byId.get(entry.providerId);
    if (provider !== undefined) {
      changed = provider.apply(mutation, entry.value) || changed;
    }
  }
  if (!changed) return false;
  const next: QuireFormattingPluginState = current.mode === "once"
    ? { ...current, mode: "off", lastPressAt: null }
    : current;
  const transaction = setFormattingPluginState(
    context.tr.scrollIntoView(),
    next,
    false
  );
  if (!context.state.filterTransaction(transaction)) {
    transaction.setMeta("preventDispatch", true);
    return false;
  }
  context.dispatch?.(transaction);
  return true;
}

/**
 * Clears direct formatting through all providers as one transaction.
 *
 * @param context - Current command context and shared transaction.
 * @param providers - Installed provider registry.
 * @returns Whether document or stored formatting state changed.
 */
export function clearFormatting(
  context: CommandProps,
  providers: readonly QuireFormattingProvider[]
): boolean {
  const mutation = {
    state: context.state,
    tr: context.tr,
    scope: resolveFormattingSelectionScope(context.tr.selection)
  };
  let changed = false;
  for (const provider of providers) {
    changed = provider.clear(mutation) || changed;
  }
  if (!changed) return false;
  if (!context.state.filterTransaction(context.tr)) {
    context.tr.setMeta("preventDispatch", true);
    return false;
  }
  context.dispatch?.(context.tr.scrollIntoView());
  return true;
}
