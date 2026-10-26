import type { ClassicEditorText } from "../base";
import type { ClassicEditorRenderContext } from "../context";
import type { ClassicEditorContributionBase } from "./base";
import type { Component } from "vue";
import type { QuireRect } from "@quirekit/renderer";
import type { ClassicEditorToolbarContributionFactory } from "./toolbar";

/** Framework-neutral mounted content returned by an interactive contribution. */
export interface ClassicEditorMountedRenderable {
  /** DOM node or text appended to the contribution host. */
  readonly element: Node | string | null;
  /**
   * Refreshes retained mounted content from the latest product context.
   *
   * @param context - Latest mounted product render context.
   */
  update?(context: ClassicEditorRenderContext): void;
  /** Releases framework roots, listeners, and other mounted resources. */
  destroy(): void;
}

/** Lifecycle retained by one compound control inside a ribbon group. */
export interface ClassicEditorRibbonWidgetController {
  /** DOM node or text appended to the widget host. */
  readonly element: Node | string | null;
  /**
   * Refreshes the mounted widget from the latest product context.
   *
   * @param context - Latest mounted product render context.
   */
  update(context: ClassicEditorRenderContext): void;
  /** Releases framework roots, listeners, and other mounted resources. */
  destroy(): void;
}

/** Compound mounted control rendered inside a named ribbon group. */
export interface ClassicEditorRibbonWidgetBase
  extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "ribbon-widget";
  /** Ribbon group that owns the widget placement. */
  readonly groupId: string;
  /** Preferred individual public Toolbar entries; legacy rendering remains a compatibility fallback. */
  readonly toolbar?: ClassicEditorToolbarContributionFactory;
}

/** Legacy DOM mount retained for external or not-yet-migrated widgets. */
export interface ClassicEditorDomRibbonWidgetContribution extends ClassicEditorRibbonWidgetBase {
  /** Mutually exclusive with a Shell-rendered Vue component. */
  readonly component?: never;
  /**
   * Mounts compound control content and its explicit lifecycle.
   *
   * @param context - Mounted product render context.
   * @returns Controller retained until omission or shell teardown.
   */
  mount(context: ClassicEditorRenderContext): ClassicEditorRibbonWidgetController;
}

/** Vue widget rendered in the Shell tree, inheriting the shared Toolbar and providers. */
export interface ClassicEditorVueRibbonWidgetContribution extends ClassicEditorRibbonWidgetBase {
  /** Public UI composition receiving a stable reactive state.context prop. */
  readonly component: Component;
  /** Feature-owned immutable inputs in addition to the Shell-owned state prop. */
  readonly props?: Readonly<Record<string, unknown>>;
  /** Vue owns mounting and teardown for this contribution. */
  readonly mount?: never;
}

/** Configuration-only feature whose controls are all created by public Toolbar items. */
export interface ClassicEditorConfiguredRibbonWidgetContribution extends ClassicEditorRibbonWidgetBase {
  /** Creates the retained reactive feature configuration in a Vue setup lifecycle. */
  readonly toolbar: ClassicEditorToolbarContributionFactory;
  /** A configured feature does not need a second rendering owner. */
  readonly component?: never;
  /** A configured feature does not need an imperative widget host. */
  readonly mount?: never;
}

/** Compound ribbon content with exactly one rendering/lifecycle owner. */
export type ClassicEditorRibbonWidgetContribution =
  | ClassicEditorDomRibbonWidgetContribution
  | ClassicEditorVueRibbonWidgetContribution
  | ClassicEditorConfiguredRibbonWidgetContribution;

/** Always-mounted extension UI associated with the editable workspace. */
export interface ClassicEditorWorkspaceWidgetContribution
  extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "workspace-widget";
  /**
   * Mounts renderless or floating workspace UI with an explicit lifecycle.
   *
   * Workspace widgets remain mounted across ribbon-tab changes. They must not
   * claim document layout space and should return `null` while inactive.
   *
   * @param context - Mounted product render context.
   * @returns Controller retained until omission or shell teardown.
   */
  mount(context: ClassicEditorRenderContext): ClassicEditorMountedRenderable;
}

/** Safe render value accepted by product contribution hosts. */
export type ClassicEditorRenderable =
  | Node
  | string
  | null
  | ClassicEditorMountedRenderable;

/** Vertical-scroll authority used by a persistent sidebar panel. */
export type ClassicEditorSidebarPanelScrollOwner = "panel" | "workspace";

/** Sidebar panel rendered in a product-owned side region. */
export interface ClassicEditorSidebarPanelContribution extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "sidebar-panel";
  /** Side region that owns the panel. */
  readonly side: "left" | "right";
  /** Visible panel title. */
  readonly label: ClassicEditorText;
  /**
   * Vertical-scroll authority for a right-side panel.
   *
   * `panel` keeps an independent inspector outside the document viewport.
   * `workspace` places a document companion beside the page inside the shared
   * workspace scroller. Left-side panels always resolve to `panel`.
   */
  readonly scrollOwner?: ClassicEditorSidebarPanelScrollOwner | undefined;
  /** Panel chrome treatment. Bare panels own their heading, padding, and scrolling. */
  readonly presentation?: "default" | "bare" | undefined;
  /**
   * Renders panel content.
   *
   * @param context - Mounted product render context.
   * @returns DOM content or a mounted lifecycle for framework-backed content.
   */
  render(context: ClassicEditorRenderContext): ClassicEditorRenderable;
}

/** One extension-owned section composed inside the global-settings inspector. */
export interface ClassicEditorGlobalSettingsSectionContribution
  extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "global-settings-section";
  /** Visible section title. */
  readonly label: ClassicEditorText;
  /** Optional supporting copy below the section title. */
  readonly description?: ClassicEditorText | undefined;
  /** Vue component rendered inside the product-owned Inspector section. */
  readonly component: Component;
  /** Feature-owned immutable component inputs. */
  readonly props?: Readonly<Record<string, unknown>> | undefined;
}

/** Status bar item rendered at the bottom of the product shell. */
export interface ClassicEditorStatusItemContribution extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "status-item";
  /**
   * Renders the status value; plain values are rebuilt on every refresh, while a
   * mounted value is kept and only updated until the item is no longer visible.
   *
   * @param context - Mounted product render context.
   * @returns DOM node, text, null, or a mounted lifecycle for framework-backed content.
   */
  render(context: ClassicEditorRenderContext): ClassicEditorRenderable;
}

/** Lifecycle returned by an interactive ruler contribution. */
export interface ClassicEditorRulerController {
  /**
   * Refreshes geometry or selection-derived state.
   *
   * @param context - Latest mounted product context.
   */
  update?(context: ClassicEditorRenderContext): void;
  /** Releases pointer, observer, and DOM resources. */
  destroy(): void;
}

/** Product-owned DOM authority supplied to a ruler plugin. */
export interface ClassicEditorRulerMountContext extends ClassicEditorRenderContext {
  /** Ruler contribution host above the scrolling workspace. */
  readonly host: HTMLElement;
  /** Single product-owned scrolling viewport. */
  readonly workspaceViewport: HTMLElement;
  /** Mounted View host aligned with the ruler. */
  readonly viewMount: HTMLElement;
  /**
   * Reads physical paper independently of the mounted page window.
   * @param clientY - Caret ordinate in client CSS pixels, including offscreen positions.
   * @returns Containing sheet in client CSS pixels, or undefined before geometry is available.
   */
  readonly readPageRect?: ((clientY: number) => QuireRect | undefined) | undefined;
}

/** Interactive horizontal ruler contributed through the product registry. */
export interface ClassicEditorRulerContribution extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "ruler";
  /**
   * Mounts ruler DOM and pointer behavior.
   *
   * @param context - Product, editor, and workspace authorities.
   * @returns Controller retained for refresh and destruction.
   */
  mount(context: ClassicEditorRulerMountContext): ClassicEditorRulerController;
}

/** Dialog or floating-surface entry registered by a product plugin. */
export interface ClassicEditorDialogContribution extends ClassicEditorContributionBase {
  /** Contribution discriminator. */
  readonly kind: "dialog";
  /** Visible dialog label. */
  readonly label: ClassicEditorText;
  /**
   * Opens the dialog through plugin-owned DOM or application integration.
   *
   * @param context - Mounted product render context.
   */
  open(context: ClassicEditorRenderContext): void;
}
