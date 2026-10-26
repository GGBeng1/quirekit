import type { MsfeEditor } from "@quirekit/msfe-core";

/** Product language of a panel; matches the editor's control language. */
export type MdEditorPanelLocale = "zh-CN" | "en";

/** Host facts a mounted panel may follow without remounting. */
export interface MdEditorPanelState {
  /** Current control language. */
  readonly locale: MdEditorPanelLocale;
}

/** What the editor gives a panel when it first opens. */
export interface MdEditorPanelContext extends MdEditorPanelState {
  /** Mounted editor of the document beside the panel. */
  readonly editor: MsfeEditor;
  /** Document owning the panel element. */
  readonly ownerDocument: Document;
  /** Closes the panel; its mount stays alive until the editor goes. */
  close(): void;
  /**
   * Selects a source range and scrolls it into view.
   * @param range - Source range.
   */
  reveal(range: { readonly from: number; readonly to: number }): void;
}

/** Lifecycle of a mounted panel. */
export interface MdEditorPanelMount {
  /** Element placed inside the panel frame. */
  readonly element: HTMLElement;
  /** @param state - Changed host facts. */
  update(state: MdEditorPanelState): void;
  /** Removes the panel when the editor unmounts. */
  destroy(): void;
}

/**
 * A side panel a host plugs into the editor, such as an assistant. The editor owns the frame,
 * its toggle and its placement beside the document; the panel owns its content.
 */
export interface MdEditorPanel {
  /** Stable identity. */
  readonly id: string;
  /** Toggle and frame label, per control language. */
  readonly label: Readonly<Record<MdEditorPanelLocale, string>>;
  /** Icon name of the toggle, from the shared icon set. */
  readonly icon: string;
  /** Whether the panel is open when the editor mounts. */
  readonly defaultOpen?: boolean | undefined;
  /**
   * Mounts the panel content the first time the panel opens.
   * @param context - Editor, language and frame controls.
   * @returns Mounted content.
   */
  mount(context: MdEditorPanelContext): MdEditorPanelMount;
}
