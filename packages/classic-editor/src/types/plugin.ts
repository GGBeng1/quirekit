import type { QuireAnyExtension, QuireEditorPasteEvent } from "@quirekit/core";
import type { ClassicEditorKeyboardShortcut } from "./commands";
import type {
  ClassicEditorActionContextMenuItemContribution,
  ClassicEditorContextMenuItemContribution,
  ClassicEditorActionSelectionPopupItemContribution,
  ClassicEditorSelectionPopupWidgetContribution,
  ClassicEditorContextualPopupItemContribution,
  ClassicEditorContribution,
  ClassicEditorGlobalSettingsSectionContribution,
  ClassicEditorSelectionPopupItemContribution,
  ClassicEditorSidebarPanelContribution,
  ClassicEditorActionToolbarControlContribution,
  ClassicEditorToolbarControlContribution
} from "./contributions";
import type { ClassicEditorHookContext } from "./context";
import type { ClassicEditorImportExportService } from "./services";
import type {
  ClassicEditorAudience,
  ClassicEditorSurfaceMode
} from "./ui";

/** Product-level plugin for UI, services, shortcuts, and lifecycle. */
export interface ClassicEditorPlugin {
  /** Stable plugin id, unique within one product instance. */
  readonly id: string;
  /** Surface audience inherited by every declaration owned by this plugin. */
  readonly audience?: ClassicEditorAudience | undefined;
  /** Declarative product UI contributions. */
  readonly contributions?: readonly ClassicEditorContribution[] | undefined;
  /** Editor extensions installed into Core while this plugin is installed, after preset and instance extensions. */
  readonly extensions?: readonly QuireAnyExtension[] | undefined;
  /** Compact-toolbar contributions declared independently from other surfaces. */
  readonly toolbarItems?: readonly (
    | ClassicEditorToolbarControlContribution
    | ClassicEditorActionToolbarControlContribution
  )[] | undefined;
  /** Right-click menu contributions declared independently from other surfaces. */
  readonly contextMenuItems?: readonly (
    | ClassicEditorContextMenuItemContribution
    | ClassicEditorActionContextMenuItemContribution
  )[] | undefined;
  /** Text-selection popup contributions declared independently from other surfaces. */
  readonly selectionPopupItems?: readonly (
    | ClassicEditorSelectionPopupItemContribution
    | ClassicEditorActionSelectionPopupItemContribution
    | ClassicEditorSelectionPopupWidgetContribution
  )[] | undefined;
  /** Target-keyed contextual Popup Menu items declared independently from other surfaces. */
  readonly contextualPopupItems?: readonly ClassicEditorContextualPopupItemContribution[] | undefined;
  /** Sidebar panels declared independently from other surfaces. */
  readonly sidebarPanels?: readonly ClassicEditorSidebarPanelContribution[] | undefined;
  /** Global-settings sections declared independently from other surfaces. */
  readonly globalSettingsSections?: readonly ClassicEditorGlobalSettingsSectionContribution[] | undefined;
  /** Product keyboard bindings. */
  readonly keyboardShortcuts?: readonly ClassicEditorKeyboardShortcut[] | undefined;
  /** Named import/export services. */
  readonly services?: readonly ClassicEditorImportExportService[] | undefined;
  /** Called after the product instance and registry are created. */
  readonly onCreate?: ((context: ClassicEditorHookContext) => void) | undefined;
  /** Called after Core, View, and product shell are mounted. */
  readonly onMount?: ((context: ClassicEditorHookContext) => void) | undefined;
  /** Called after product options or editor state update the shell. */
  readonly onUpdate?: ((context: ClassicEditorHookContext) => void) | undefined;
  /**
   * Intercepts a mounted editor paste before Core applies its fallback slice.
   *
   * The hook must decide synchronously whether it owns the event. It may start
   * asynchronous product work after returning `true`.
   *
   * @param context - Current mounted product authorities.
   * @param event - Core paste event and parsed or empty slice.
   * @returns Whether this product plugin consumed the paste.
   */
  readonly onPaste?: ((
    context: ClassicEditorHookContext,
    event: QuireEditorPasteEvent
  ) => boolean | void) | undefined;
  /** Called before a reusable unmount releases Core, View, and shell resources. */
  readonly onUnmount?: ((context: ClassicEditorHookContext) => void) | undefined;
  /** Called once during final product destruction. */
  readonly onDestroy?: ((context: ClassicEditorHookContext) => void) | undefined;
}

/** Readonly normalized product registry exposed for diagnostics and integrations. */
export interface ClassicEditorRegistrySnapshot {
  /** Create-time product surface mode used to select active declarations. */
  readonly surfaceMode: ClassicEditorSurfaceMode;
  /** Installed product plugins in deterministic order. */
  readonly plugins: readonly ClassicEditorPlugin[];
  /** Visible contributions after feature filtering. */
  readonly contributions: readonly ClassicEditorContribution[];
  /** Active product keyboard shortcuts. */
  readonly keyboardShortcuts: readonly ClassicEditorKeyboardShortcut[];
  /** Import/export services keyed by id. */
  readonly services: ReadonlyMap<string, ClassicEditorImportExportService>;
}
