import type { QuireKitColorRows } from "@quirekit/ui";
import type { ClassicEditorToolbarContributionState } from "@classic/types";
import type { BuiltinClassicEditorMessageKey } from "@classic/localization";
import type { useClassicColorToolbar } from "./factory";

/** Document state and operations supplied to the public ColorPicker adapter. */
export type ClassicColorToolbarController = ReturnType<typeof useClassicColorToolbar>;

/** Editor driven by a Classic color widget. */
export type ClassicColorToolbarEditor = ClassicEditorToolbarContributionState["context"]["editor"];

/** Document adapter and picker preset for one color slot. */
export interface ClassicColorToolbarTarget {
  /** Localized label shown on the split button. */
  readonly messageKey: BuiltinClassicEditorMessageKey;
  /** Icon rendered with the current color strip. */
  readonly icon: string;
  /** Color offered by the split action before any choice in this mount. */
  readonly fallbackColor: string;
  /** Whether the split action starts armed with the fallback even where the document has no color. */
  readonly startsWithFallback: boolean;
  /** Fixed palette rows; omitted to use the shared document palette. */
  readonly colors?: QuireKitColorRows;
  /** Whether the precise editor may produce colors outside the palette. */
  readonly showMore: boolean;
  /**
   * Reads the current document color at the selection.
   *
   * @param editor - Editor whose selection is inspected.
   * @returns Uppercase hex color, or null for the no-color state.
   */
  read(editor: ClassicColorToolbarEditor): string | null;
  /**
   * Applies one hex color to the selection.
   *
   * @param editor - Editor receiving the command.
   * @param color - Uppercase six-digit hex color.
   * @returns Whether the command was accepted.
   */
  apply(editor: ClassicColorToolbarEditor, color: string): boolean;
  /**
   * Removes the direct color from the selection.
   *
   * @param editor - Editor receiving the command.
   * @returns Whether the command was accepted.
   */
  clear(editor: ClassicColorToolbarEditor): boolean;
  /** Brush mode armed by applying without a selection; the split action then toggles it off. */
  readonly pen?: {
    /**
     * Reports whether the brush mode is active.
     *
     * @param editor - Editor whose mode is read.
     * @returns Whether completed selections are being painted.
     */
    isActive(editor: ClassicColorToolbarEditor): boolean;
    /**
     * Leaves the brush mode.
     *
     * @param editor - Editor receiving the mode change.
     * @returns Whether an active mode was stopped.
     */
    stop(editor: ClassicColorToolbarEditor): boolean;
  };
}
