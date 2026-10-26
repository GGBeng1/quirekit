import type { ClassicEditorContributionBase } from "../base";
import type { ClassicEditorText } from "../../base";
import type { ClassicEditorToolbarContributionFactory } from "../toolbar";
import type { ClassicEditorActionSelectionPopupItemContribution, ClassicEditorSelectionPopupItemContribution } from "../behavior-surfaces";

/** Product placement of a text-selection action. */
export interface ClassicEditorSelectionPopupPlacement {
  /** Text controls, supporting actions, or the compact overflow menu. */
  readonly placement?: "primary" | "secondary" | "overflow";
  /** Opts an action into the compact row; overflow actions remain in the More menu. */
  readonly compact?: "primary";
  /** Optional short visible label beside an action icon. */
  readonly presentation?: "icon" | "icon-label";
}

/** A feature-owned compound control in the non-empty text-selection Toolbar. */
export interface ClassicEditorSelectionPopupWidgetContribution extends ClassicEditorContributionBase {
  /** Shares the existing selection surface profile and extension hook. */
  readonly kind: "selection-popup-item";
  /** Accessible name for this feature. */
  readonly label: ClassicEditorText;
  /** Complex fields stay directly accessible rather than entering an action menu. */
  readonly placement?: "primary" | "secondary";
  /** Factory retained for one visible selection session. */
  readonly toolbar: ClassicEditorToolbarContributionFactory;
}

/** Existing executable contributions, excluding compound controls. */
export type ClassicEditorSelectionPopupActionContribution = ClassicEditorSelectionPopupItemContribution | ClassicEditorActionSelectionPopupItemContribution;

/** Every supported selection surface contribution. */
export type ClassicEditorAnySelectionPopupItemContribution = ClassicEditorSelectionPopupActionContribution | ClassicEditorSelectionPopupWidgetContribution;
