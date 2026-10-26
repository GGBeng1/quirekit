import { PluginKey } from "@quirekit/pm";
import type { DecorationManagerState } from "./types";

/** Stable ProseMirror plugin-key name used by the decoration manager. */
export const DECORATION_MANAGER_PLUGIN_KEY_NAME = "__tiptap_decorations__";

/** Shared plugin key used by decoration state and `updateDecorations()`. */
export const DECORATION_MANAGER_PLUGIN_KEY =
  new PluginKey<DecorationManagerState>(DECORATION_MANAGER_PLUGIN_KEY_NAME);
