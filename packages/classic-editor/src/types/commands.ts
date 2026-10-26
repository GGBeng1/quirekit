import type { ClassicEditorBehavior } from "./behaviors";

/** Product keyboard binding contributed independently from Core keymaps. */
export interface ClassicEditorKeyboardShortcut {
  /** Shortcut using `Mod`, `Shift`, `Alt`, and a final KeyboardEvent key. */
  readonly shortcut: string;
  /** Direct typed product behavior invoked by the shortcut. */
  readonly behavior: ClassicEditorBehavior;
  /** Optional feature required before the binding is active. */
  readonly feature?: string | undefined;
}
