import type { ClassicEditorPlugin } from "../types";

/**
 * Defines a Classic Editor plugin while preserving literal contribution types.
 *
 * @param plugin - Product plugin declaration.
 * @returns The same declaration for composition in presets or instance options.
 */
export function defineClassicEditorPlugin<Plugin extends ClassicEditorPlugin>(
  plugin: Plugin
): Plugin {
  if (plugin.id.trim().length === 0) {
    throw new RangeError("Classic Editor plugin ids must not be empty.");
  }

  return plugin;
}
