import type {
  ClassicEditorHookContext,
  ClassicEditorPlugin
} from "../types";

/**
 * Runs creation and destruction hooks for plugins changed by an update.
 *
 * @param previous - Plugins installed before the update.
 * @param next - Plugins installed after the update.
 * @param context - Current lifecycle context.
 */
export function reconcileClassicEditorPlugins(
  previous: readonly ClassicEditorPlugin[],
  next: readonly ClassicEditorPlugin[],
  context: ClassicEditorHookContext
): void {
  const previousIds = new Set(previous.map((plugin) => plugin.id));
  const nextIds = new Set(next.map((plugin) => plugin.id));
  for (const plugin of previous) {
    if (!nextIds.has(plugin.id)) plugin.onDestroy?.(context);
  }
  for (const plugin of next) {
    if (!previousIds.has(plugin.id)) plugin.onCreate?.(context);
  }
}
