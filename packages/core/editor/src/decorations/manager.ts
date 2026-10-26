import type { Plugin } from "@quirekit/pm";
import type { QuireEditor } from "../Editor";
import { resolveDecorationEntries } from "./entries";
import { createDecorationManagerPlugin } from "./manager-plugin";
import { DECORATION_MANAGER_PLUGIN_KEY } from "./plugin-key";
import type {
  DecorationManagerEntry,
  DecorationManagerState,
  ResolvedDecorationEntry
} from "./types";

const EMPTY_WIDGET_KEYS: ReadonlySet<string> = new Set<string>();

/**
 * Returns every live widget identity managed by an editor.
 *
 * @param editor - Editor whose decoration manager should be queried.
 * @returns Readonly live widget-key set.
 */
export function liveWidgetKeys(editor: QuireEditor): ReadonlySet<string> {
  return editor.extensionManager.decorationManager?.liveWidgetKeys() ??
    EMPTY_WIDGET_KEYS;
}

/** Owns declarative extension decorations and their ProseMirror plugin state. */
export class DecorationManager {
  /** Editor whose extensions contributed the decorations. */
  readonly editor: QuireEditor;

  /** Validated, enabled decoration contributions. */
  readonly entries: readonly ResolvedDecorationEntry[];

  /** ProseMirror plugin installed when at least one contribution exists. */
  readonly plugin: Plugin<DecorationManagerState> | null;

  /**
   * Creates a decoration manager.
   *
   * @param options - Owning editor and lazy extension entries.
   */
  constructor(options: {
    /** Editor that owns the manager. */
    readonly editor: QuireEditor;
    /** Lazy decoration entries in extension order. */
    readonly entries: readonly DecorationManagerEntry[];
  }) {
    this.editor = options.editor;
    this.entries = resolveDecorationEntries(options.entries);
    this.plugin = this.entries.length === 0
      ? null
      : createDecorationManagerPlugin(this.editor, this.entries);
  }

  /** Releases manager-owned resources. */
  destroy(): void {}

  /** @returns Stable identities of all currently live widgets. */
  liveWidgetKeys(): ReadonlySet<string> {
    return DECORATION_MANAGER_PLUGIN_KEY.getState(this.editor.state.pm)
      ?.widgetKeys ?? EMPTY_WIDGET_KEYS;
  }
}
