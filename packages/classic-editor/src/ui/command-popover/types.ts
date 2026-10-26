import type { VNodeChild } from "vue";
import type { ClassicEditorPopupMenuPlacement } from "../popup-menu";

/** Semantic content densities supported by one Classic command popover. */
export type ClassicEditorCommandPopoverPadding =
  | "compact"
  | "editor"
  | "gallery"
  | "menu"
  | "regular"
  | "none";

/** Product-owned placement names supported by one Classic command popover. */
export type ClassicEditorCommandPopoverPlacement =
  ClassicEditorPopupMenuPlacement;

/** Semantic roles admitted by the visible command-popover surface. */
export type ClassicEditorCommandPopoverRole =
  | "dialog"
  | "listbox"
  | "menu"
  | "toolbar";

/** Controlled inputs for the public Classic command-popover recipe. */
export interface ClassicEditorCommandPopoverProps {
  /** Whether the consumer requests the popover to be visible. */
  readonly show: boolean;
  /** Classic root that owns the teleport document and overlay scope. */
  readonly themeRoot?: HTMLElement | undefined;
  /** Preferred placement relative to the trigger. */
  readonly placement?: ClassicEditorCommandPopoverPlacement | undefined;
  /** Shared spacing intent applied by the visible semantic surface. */
  readonly padding?: ClassicEditorCommandPopoverPadding | undefined;
  /** Whether trigger interaction is temporarily unavailable. */
  readonly disabled?: boolean | undefined;
  /** Whether the supplied interactive row only anchors positioning and owns activation itself. */
  readonly anchorOnly?: boolean | undefined;
  /** Optional overlay family that enables root-scoped surface exclusivity. */
  readonly overlayFamily?: string | undefined;
  /** Optional semantic role applied to the visible inner surface. */
  readonly role?: ClassicEditorCommandPopoverRole | undefined;
  /** Optional accessible name for the visible inner surface. */
  readonly label?: string | undefined;
  /** Optional product class applied to the visible inner surface. */
  readonly surfaceClass?: string | undefined;
}

/** Public slots rendered by the shared Classic command-popover recipe. */
export interface ClassicEditorCommandPopoverSlots {
  /** Product trigger, normally one shared button or split-button segment. */
  readonly trigger: () => VNodeChild;
  /** Immediate command list, gallery, or focused value editor. */
  readonly default: () => VNodeChild;
}
