import type {
  EditorState as PMEditorState,
  EditorView as PMEditorView,
  PluginView
} from "@quirekit/pm";

/** Owns ProseMirror plugin view objects for one mounted QuireKit view. */
export class MountedPluginViewLifecycle {
  private readonly pluginViews: PluginView[] = [];
  private pluginViewPlugins: PMEditorState["plugins"] | undefined;
  private pluginViewState: PMEditorState | undefined;
  private initialized = false;

  /**
   * Creates plugin view objects for the current editor state.
   *
   * @param view - Mounted view passed to plugin `spec.view` hooks.
   */
  initialize(view: PMEditorView): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.rebuild(view);
    this.pluginViewState = view.state;
  }

  /**
   * Updates plugin view objects after a mounted view refresh.
   *
   * @param view - Mounted view passed to plugin view update hooks.
   */
  update(view: PMEditorView): void {
    if (!this.initialized) {
      return;
    }

    const previousState = this.pluginViewState;
    // Capture the committed state before callbacks can dispatch an unrendered update.
    this.pluginViewState = view.state;

    if (
      previousState === undefined ||
      this.pluginViewPlugins !== view.state.plugins
    ) {
      this.rebuild(view);
      return;
    }

    for (const pluginView of this.pluginViews) {
      pluginView.update?.(view, previousState);
    }
  }

  /** Destroys all plugin view objects owned by this lifecycle. */
  destroy(): void {
    while (this.pluginViews.length > 0) {
      this.pluginViews.pop()?.destroy?.();
    }
  }

  /**
   * Recreates plugin view objects from the current editor state's plugins.
   *
   * @param view - Mounted view passed to plugin `spec.view` hooks.
   */
  private rebuild(view: PMEditorView): void {
    this.destroy();
    this.pluginViewPlugins = view.state.plugins;

    for (const plugin of view.state.plugins) {
      const pluginView = plugin.spec.view?.(view);

      if (pluginView) {
        this.pluginViews.push(pluginView);
      }
    }
  }
}
