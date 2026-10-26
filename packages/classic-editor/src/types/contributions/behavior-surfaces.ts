import type { ClassicEditorText } from "../base";
import type { ClassicEditorBehavior } from "../behaviors";
import type { ClassicEditorRenderContext } from "../context";
import type { ClassicEditorContributionBase } from "./base";
import type { ClassicEditorActionDefinition } from "./action-catalog";
import type { ClassicEditorSelectionPopupPlacement } from "./selection-popup/types";

/** Normalized trigger for an editor context-menu item. */
export interface ClassicEditorContextMenuTrigger {
  /** Trigger discriminator. */
  readonly kind: "context-menu";
  /** Viewport-relative pointer x coordinate. */
  readonly clientX: number;
  /** Viewport-relative pointer y coordinate. */
  readonly clientY: number;
  /** Document position beneath the pointer when View can resolve one. */
  readonly documentPosition: number | null;
  /** Editor selection after the shell applied right-click caret placement. */
  readonly selection?: ClassicEditorContextMenuSelection | undefined;
}

/** Selection range captured when one context menu opens. */
export interface ClassicEditorContextMenuSelection {
  /** Inclusive selection start position. */
  readonly from: number;
  /** Exclusive selection end position. */
  readonly to: number;
  /** Whether the selection is collapsed. */
  readonly empty: boolean;
}

/**
 * How one context-menu item competes with other items for the same trigger.
 *
 * `target` items belong to an object-specific menu and hide every `fallback`
 * item; `fallback` items form the generic text menu; `addition` items show
 * whenever they apply and never hide anything.
 */
export type ClassicEditorContextMenuItemRole = "target" | "fallback" | "addition";

/** Presentation fields shared by both context-menu item declaration styles. */
export interface ClassicEditorContextMenuItemPresentation {
  /** Competition role; omitted means `addition`. */
  readonly role?: ClassicEditorContextMenuItemRole | undefined;
  /** Group name; a separator is drawn between adjacent rows of different groups. */
  readonly section?: string | undefined;
  /**
   * For `target` items: generic `fallback` sections that stay visible beside
   * this object menu, such as a table keeping clipboard and format rows.
   */
  readonly keepFallbackSections?: readonly string[] | undefined;
  /** Shortcut hint shown beside the label. */
  readonly shortcut?: ClassicEditorText | undefined;
  /**
   * Resolves a label for one trigger occurrence, such as a spelling suggestion.
   *
   * Reactive reads inside the resolver refresh an open menu, so asynchronously
   * loaded values appear without reopening it.
   *
   * @param trigger - Context-menu trigger.
   * @param context - Latest mounted product context.
   * @returns Occurrence label, or undefined to use `label`.
   */
  readonly resolveLabel?: ((
    trigger: ClassicEditorContextMenuTrigger,
    context: ClassicEditorRenderContext
  ) => ClassicEditorText | undefined) | undefined;
}

/** Normalized range trigger for a non-empty text or structural selection surface. */
export interface ClassicEditorSelectionPopupTrigger {
  /** Trigger discriminator. */
  readonly kind: "selection-popup";
  /** Inclusive selection start position. */
  readonly from: number;
  /** Exclusive selection end position. */
  readonly to: number;
  /** Viewport rectangle used to anchor the popup. */
  readonly rect: Readonly<Pick<DOMRect, "top" | "right" | "bottom" | "left" | "width" | "height">>;
}

/** Trigger accepted by action-backed floating product surfaces. */
export type ClassicEditorBehaviorSurfaceTrigger =
  | ClassicEditorContextMenuTrigger
  | ClassicEditorSelectionPopupTrigger;

/** Shared declaration for an action-backed floating-surface item. */
export interface ClassicEditorBehaviorSurfaceItemContribution
  extends ClassicEditorContributionBase {
  /** Visible item label. */
  readonly label: ClassicEditorText;
  /** Typed behavior executed directly by the surface item. */
  readonly behavior: ClassicEditorBehavior;
  /** Compact symbol rendered before the label. */
  readonly icon?: string | undefined;
  /** Optional semantic emphasis forwarded to public action rows. */
  readonly tone?: "neutral" | "danger" | undefined;
  /** Accessible tooltip. */
  readonly title?: ClassicEditorText | undefined;
  /** Optional parent label that projects adjacent items into one native submenu. */
  readonly submenu?: ClassicEditorText | undefined;
  /**
   * Whether closing the surface should return native focus to the editor.
   *
   * Actions that reveal and focus another product editor, such as a comment
   * composer, opt out so the generic selection surface cannot steal focus.
   */
  readonly restoreEditorFocus?: boolean | undefined;
  /**
   * Whether a successful action should dismiss this occurrence of the surface.
   *
   * Long-lived actions that reveal their own feedback opt in so the source
   * popup does not compete with the resulting product surface.
   */
  readonly dismissAfterExecute?: boolean | undefined;
  /**
   * Resolves an behavior payload from the normalized surface trigger.
   *
   * @param trigger - Context-menu or selection-popup trigger.
   * @param context - Latest mounted product context.
   * @returns Payload passed to the product behavior.
   */
  readonly payload?: ((
    trigger: ClassicEditorBehaviorSurfaceTrigger,
    context: ClassicEditorRenderContext
  ) => unknown) | undefined;
  /**
   * Reports whether the item applies to one trigger occurrence.
   *
   * @param trigger - Context-menu or selection-popup trigger.
   * @param context - Latest mounted product context.
   * @returns Whether the item should be shown.
   */
  readonly whenTrigger?: ((
    trigger: ClassicEditorBehaviorSurfaceTrigger,
    context: ClassicEditorRenderContext
  ) => boolean) | undefined;
}

/** Action item rendered in the editor context menu. */
export interface ClassicEditorContextMenuItemContribution
  extends ClassicEditorBehaviorSurfaceItemContribution, ClassicEditorContextMenuItemPresentation {
  /** Contribution discriminator. */
  readonly kind: "context-menu-item";
}

/** New direct typed context-menu item without a behavior compatibility field. */
export interface ClassicEditorActionContextMenuItemContribution
  extends ClassicEditorContributionBase, ClassicEditorContextMenuItemPresentation {
  /** Contribution discriminator. */
  readonly kind: "context-menu-item";
  /** Visible item label. */
  readonly label: ClassicEditorText;
  /** Direct typed action executed by this surface. */
  readonly action: ClassicEditorActionDefinition;
  /** Compact symbol rendered before the label. */
  readonly icon?: string | undefined;
  /** Optional semantic emphasis forwarded to public action rows. */
  readonly tone?: "neutral" | "danger" | undefined;
  /** Accessible tooltip. */
  readonly title?: ClassicEditorText | undefined;
  /** Optional parent label that projects adjacent items into one native submenu. */
  readonly submenu?: ClassicEditorText | undefined;
  /** Whether closing the surface should return native focus to the editor. */
  readonly restoreEditorFocus?: boolean | undefined;
  /** Whether a successful action should dismiss this surface occurrence. */
  readonly dismissAfterExecute?: boolean | undefined;
  /** Resolves one typed payload from the normalized context-menu trigger. */
  readonly payload?: ((
    trigger: ClassicEditorContextMenuTrigger,
    context: ClassicEditorRenderContext
  ) => unknown) | undefined;
  /** Reports whether the item applies to one context-menu trigger occurrence. */
  readonly whenTrigger?: ((
    trigger: ClassicEditorContextMenuTrigger,
    context: ClassicEditorRenderContext
  ) => boolean) | undefined;
}

/** Action item rendered beside a non-empty text selection. */
export interface ClassicEditorSelectionPopupItemContribution
  extends ClassicEditorBehaviorSurfaceItemContribution, ClassicEditorSelectionPopupPlacement {
  /** Contribution discriminator. */
  readonly kind: "selection-popup-item";
}

/** New direct typed selection-popup item without a behavior compatibility field. */
export interface ClassicEditorActionSelectionPopupItemContribution
  extends ClassicEditorContributionBase, ClassicEditorSelectionPopupPlacement {
  /** Contribution discriminator. */
  readonly kind: "selection-popup-item";
  /** Visible item label. */
  readonly label: ClassicEditorText;
  /** Direct typed action executed by this surface. */
  readonly action: ClassicEditorActionDefinition;
  /** Compact symbol rendered before the label. */
  readonly icon?: string | undefined;
  /** Optional semantic emphasis forwarded to public action rows. */
  readonly tone?: "neutral" | "danger" | undefined;
  /** Accessible tooltip. */
  readonly title?: ClassicEditorText | undefined;
  /** Optional parent label that groups adjacent overflow rows into one submenu. */
  readonly submenu?: ClassicEditorText | undefined;
  /** Whether closing the surface should return native focus to the editor. */
  readonly restoreEditorFocus?: boolean | undefined;
  /** Whether a successful action should dismiss this surface occurrence. */
  readonly dismissAfterExecute?: boolean | undefined;
  /** Resolves one typed payload from the normalized selection trigger. */
  readonly payload?: ((
    trigger: ClassicEditorSelectionPopupTrigger,
    context: ClassicEditorRenderContext
  ) => unknown) | undefined;
  /** Reports whether the item applies to one selection trigger occurrence. */
  readonly whenTrigger?: ((
    trigger: ClassicEditorSelectionPopupTrigger,
    context: ClassicEditorRenderContext
  ) => boolean) | undefined;
}
