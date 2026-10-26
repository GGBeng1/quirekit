import type {
  ComputedRef,
  InjectionKey
} from "vue";

/** Private teleport target shared by a Popup Menu and its tooltip items. */
export const classicEditorPopupMenuTeleportTarget:
InjectionKey<ComputedRef<HTMLElement>> = Symbol("ClassicEditorPopupMenuTeleportTarget");

/** Shared child-overlay ownership inside one Popup Menu. */
export interface ClassicEditorPopupMenuChildOverlayContext {
  /** DOM attributes that keep teleported children inside parent overlay ownership. */
  readonly ownerAttributes: Readonly<Record<string, string>>;
  /** Reports whether one child dropdown currently owns the menu. */
  readonly isOpen: (id: symbol) => boolean;
  /** Transfers child-dropdown ownership or releases it. */
  readonly setOpen: (id: symbol, open: boolean) => void;
  /** Closes the current child dropdown without closing the parent menu. */
  readonly closeChild: () => void;
  /** Closes the complete parent Popup Menu. */
  readonly closeSurface: () => void;
}

/** Private child-overlay coordinator shared by every item in one Popup Menu. */
export const classicEditorPopupMenuChildOverlay:
InjectionKey<ClassicEditorPopupMenuChildOverlayContext> = Symbol(
  "ClassicEditorPopupMenuChildOverlay"
);
