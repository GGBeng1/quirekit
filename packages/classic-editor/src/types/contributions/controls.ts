import type { ClassicEditorText } from "../base";
import type { ClassicEditorBehavior } from "../behaviors";
import type { ClassicEditorContributionBase } from "./base";
import type { ClassicEditorActionDefinition } from "./action-catalog";

/**
 * Layout treatment used by one Classic ribbon group.
 * Menu applies to action-only groups; groups containing compound widgets render
 * inline so fields and their Toolbar controls retain the main focus scope.
 */
export type ClassicEditorRibbonGroupPresentation = "inline" | "menu";

/** Semantic target that can reveal one contextual command task. */
export type ClassicEditorCommandTargetKind =
  | "table"
  | "image"
  | "control"
  | "node"
  | "story";

/** Width-budget priority assigned to one command group. */
export type ClassicEditorCommandGroupPriority =
  | "essential"
  | "primary"
  | "secondary";

/** Placement fields shared by both product menu item declaration styles. */
export interface ClassicEditorMenuItemPlacement extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "menu-item";
  /** Stable submenu id; omitted for a top-level row. */
  readonly menuId?: string | undefined;
  /** Visible submenu label, required with `menuId`. */
  readonly menuLabel?: ClassicEditorText | undefined;
  /** Visible item label. */
  readonly label: ClassicEditorText;
  /** Compact symbol rendered before the label. */
  readonly icon?: string | undefined;
  /** Shortcut hint shown beside the label. */
  readonly shortcut?: ClassicEditorText | undefined;
  /** Accessible tooltip or shortcut hint. */
  readonly title?: ClassicEditorText | undefined;
}

/** Legacy behavior-backed product menu item; not rendered by the product menu. */
export interface ClassicEditorLegacyMenuItemContribution extends ClassicEditorMenuItemPlacement {
  /** Typed behavior executed directly by the menu item. */
  readonly behavior: ClassicEditorBehavior;
}

/**
 * Direct-action row in the top-left product menu.
 *
 * With `menuId` the row joins that named submenu (shared with document
 * services of the same id); without it the row is top-level.
 */
export interface ClassicEditorActionMenuItemContribution extends ClassicEditorMenuItemPlacement {
  /** Direct typed action executed by the row. */
  readonly action: ClassicEditorActionDefinition;
}

/** Product menu item accepted by the registry during the direct-action migration. */
export type ClassicEditorMenuItemContribution =
  | ClassicEditorLegacyMenuItemContribution
  | ClassicEditorActionMenuItemContribution;

/** Import or export entry backed by a registered document service. */
export interface ClassicEditorDocumentServiceMenuContribution
  extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "document-service";
  /** Stable top-level Import or Export menu id. */
  readonly menuId: string;
  /** Visible top-level menu label. */
  readonly menuLabel: ClassicEditorText;
  /** Icon of the top-level menu row; the first contribution declaring one wins. */
  readonly menuIcon?: string | undefined;
  /** Visible file-format label. */
  readonly label: ClassicEditorText;
  /** Registered import/export service id. */
  readonly service: string;
  /** File operation invoked by the menu item. */
  readonly operation: "import" | "export";
  /** Accessible tooltip or format hint. */
  readonly title?: ClassicEditorText | undefined;
}

/** Product ribbon tab declaration. */
export interface ClassicEditorRibbonTabContribution extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "ribbon-tab";
  /** Visible tab label. */
  readonly label: ClassicEditorText;
  /** Structured target kinds that reveal this contextual tab; omit for an ordinary tab. */
  readonly contextualFor?: readonly ClassicEditorCommandTargetKind[] | undefined;
}

/** Product ribbon group declaration. */
export interface ClassicEditorRibbonGroupContribution extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "ribbon-group";
  /** Ribbon tab that owns the group. */
  readonly tabId: string;
  /** Visible group label. */
  readonly label: ClassicEditorText;
  /** Group layout treatment. Defaults to directly rendered inline controls. */
  readonly presentation?: ClassicEditorRibbonGroupPresentation | undefined;
  /** Icon shown by a compound menu trigger. */
  readonly icon?: string | undefined;
  /** Width-budget priority used before moving the group into discoverable overflow. */
  readonly priority?: ClassicEditorCommandGroupPriority | undefined;
}

/** Shared visual fields for a ribbon or compact-toolbar control. */
export interface ClassicEditorControlPresentationContribution extends ClassicEditorContributionBase {
  /** Visible control label. */
  readonly label: ClassicEditorText;
  /** Compact symbol rendered before the label. */
  readonly icon?: string | undefined;
  /** Accessible tooltip. */
  readonly title?: ClassicEditorText | undefined;
  /** Visible control treatment. Defaults to compact icon presentation. */
  readonly presentation?: "icon" | "icon-label" | "label" | undefined;
  /** Interaction semantics; omitted controls infer toggle only when isActive is declared. */
  readonly interaction?: "action" | "toggle" | "disclosure" | undefined;
}

/** Legacy control retained only while existing behavior contributions migrate. */
export interface ClassicEditorLegacyControlContribution
  extends ClassicEditorControlPresentationContribution {
  /** Legacy behavior executed by a compatibility surface. */
  readonly behavior: ClassicEditorBehavior;
}

/** New direct action control that never accepts a behavior or action string. */
export interface ClassicEditorActionControlContribution
  extends ClassicEditorControlPresentationContribution {
  /** Direct typed action executed by the owning product surface. */
  readonly action: ClassicEditorActionDefinition;
}

/** Control contribution accepted by shared presentational helpers during migration. */
export type ClassicEditorControlContribution =
  | ClassicEditorLegacyControlContribution
  | ClassicEditorActionControlContribution;

/** Action control rendered inside a ribbon group. */
export interface ClassicEditorRibbonControlContribution extends ClassicEditorLegacyControlContribution {
  /** Contribution discriminator. */
  readonly kind: "ribbon-control";
  /** Ribbon group that owns the control. */
  readonly groupId: string;
}

/** New ribbon action projected from one direct typed action definition. */
export interface ClassicEditorActionRibbonControlContribution
  extends ClassicEditorActionControlContribution {
  /** Contribution discriminator. */
  readonly kind: "ribbon-action-control";
  /** Ribbon group that owns the control. */
  readonly groupId: string;
}

/** Action control rendered in the compact toolbar. */
export interface ClassicEditorToolbarControlContribution extends ClassicEditorLegacyControlContribution {
  /** Contribution discriminator. */
  readonly kind: "toolbar-control";
}

/** New compact-toolbar action projected from one direct typed action definition. */
export interface ClassicEditorActionToolbarControlContribution
  extends ClassicEditorActionControlContribution {
  /** Contribution discriminator. */
  readonly kind: "toolbar-action-control";
}
