import type { VNodeChild } from "vue";
import type { ClassicEditorIconName } from "../../icons";
import type { ClassicEditorAnchoredOverlayAnchor } from "../anchored-overlay/types";

/** Viewport-space point used to position one Classic Editor Popup Menu. */
export interface ClassicEditorPopupMenuAnchor extends ClassicEditorAnchoredOverlayAnchor {}

/** Dismissal ownership for the legacy contextual-card composition. */
export interface ClassicEditorPopupDismissalSources {
  /** Product root and browser document. */
  readonly root: () => HTMLElement;
  /** Effective visibility without interpreting viewport clipping as dismissal. */
  readonly visible: () => boolean;
  /** Marker inherited by the card and nested controls. */
  readonly ownerId: string;
  /** Whether a nested menu must consume Escape first. */
  readonly hasChild: () => boolean;
  /** Whether a document-owned pointer established a fresh target. */
  readonly hasTarget: () => boolean;
  /** Closes the controlled card. */
  readonly close: () => void;
  /** Restores input ownership only for an explicit keyboard dismissal. */
  readonly restoreFocus: () => void;
}

/** Product-owned placement names accepted by the Classic Editor Popup Menu. */
export type ClassicEditorPopupMenuPlacement =
  | "top"
  | "top-start"
  | "top-end"
  | "right"
  | "right-start"
  | "right-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end";

/** Controlled inputs for the public Classic Editor Popup Menu surface. */
export interface ClassicEditorPopupMenuProps {
  /** Whether the consumer requests the menu to be visible. */
  readonly show: boolean;
  /** Current viewport anchor, or null when the semantic target is unavailable. */
  readonly anchor: ClassicEditorPopupMenuAnchor | null;
  /** Resolves fresh viewport geometry after scroll or viewport resize. */
  readonly resolveAnchor?:
    (() => ClassicEditorPopupMenuAnchor | null) | undefined;
  /** Mounted Classic Editor root that owns the portal document and overlay scope. */
  readonly themeRoot: HTMLElement;
  /** Accessible name applied to the menu toolbar. */
  readonly label: string;
  /** Diagnostic family prefix used by the shared overlay coordinator. */
  readonly overlayFamily?: string | undefined;
  /** Preferred placement relative to the resolved viewport point. */
  readonly placement?: ClassicEditorPopupMenuPlacement | undefined;
  /** Optional capability-owned class applied to the painted menu surface. */
  readonly surfaceClass?: string | undefined;
  /** Optional maximum action columns before the shared surface wraps rows. */
  readonly maxColumns?: number | undefined;
}

/** Typed content slots accepted by the Classic Editor Popup Menu. */
export interface ClassicEditorPopupMenuSlots {
  /** Optional capability context rendered before the shared action divider. */
  readonly leading?: (() => VNodeChild) | undefined;
  /** Optional type-specific editor rendered inside the shared bordered surface. */
  readonly body?: (() => VNodeChild) | undefined;
  /** Shared icon actions rendered after the optional leading context. */
  readonly default?: (() => VNodeChild) | undefined;
}

/** Controlled inputs for one icon action in a Classic Editor Popup Menu. */
export interface ClassicEditorPopupMenuItemProps {
  /** Product icon rendered inside the action button. */
  readonly icon: ClassicEditorIconName;
  /** Localized accessible name applied to the action button. */
  readonly label: string;
  /** Localized tooltip text; defaults to the accessible label. */
  readonly tooltip?: string | undefined;
  /** Whether the action is currently unavailable. */
  readonly disabled?: boolean | undefined;
  /** Whether the action represents an active toggle state. */
  readonly active?: boolean | undefined;
  /** Optional controlled tooltip visibility for transient feedback. */
  readonly tooltipVisible?: boolean | undefined;
  /** Tooltip opening delay in milliseconds. */
  readonly tooltipDelay?: number | undefined;
  /** Optional grouped menu opened by this icon action. */
  readonly menuItems?:
    readonly ClassicEditorPopupMenuDropdownItem[] | undefined;
}

/** One text-labelled item in a Popup Menu action's grouped dropdown. */
export interface ClassicEditorPopupMenuDropdownItem {
  /** Stable item key emitted on selection. */
  readonly key: string;
  /** Localized text label rendered by the dropdown. */
  readonly label: string;
  /** Optional bundled product icon rendered before the label. */
  readonly icon?: ClassicEditorIconName | undefined;
  /** Optional canonical color rendered as a palette swatch before the label. */
  readonly swatchColor?: string | undefined;
  /** Whether the item is currently unavailable. */
  readonly disabled?: boolean | undefined;
  /** Optional nested group rendered as a cascading submenu. */
  readonly children?:
    readonly ClassicEditorPopupMenuDropdownItem[] | undefined;
}
