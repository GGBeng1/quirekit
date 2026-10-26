import type { ClassicEditorActionDefinition } from "../contributions";
import type { ClassicEditorActionState } from "../contributions";
import type { ClassicEditorRenderContext } from "../context";
import type { ClassicEditorWorkspacePanelController } from "../workspace-panel";
import type {
  ClassicEditorObjectActionContribution,
  ClassicEditorObjectActionSurfaceProjection
} from "./actions";
import type { ClassicEditorObjectInspectorDefinition } from "./inspector";
import type { ClassicEditorObjectToolbarFactory } from "./toolbar";
import type {
  ClassicEditorObjectFreshness,
  ClassicEditorObjectTarget,
  ClassicEditorObjectTargetResolution
} from "./target";

/** Responsive projection selected from one root-local inline size. */
export type ClassicEditorObjectWorkspaceLayout = "wide" | "compact" | "narrow";

/** Exact feature contribution bound to one stable object occurrence. */
export interface ClassicEditorObjectWorkspaceContribution {
  /** Stable contribution identity for diagnostics. */
  readonly id: string;
  /** Exact retained object target. */
  readonly target: ClassicEditorObjectTarget;
  /** Owner-supplied exact-target revalidation without selection fallback. */
  readonly resolveTarget: () => ClassicEditorObjectTargetResolution;
  /** Canonical direct action objects projected by all object surfaces. */
  readonly actions: readonly ClassicEditorObjectActionContribution[];
  /** Optional native Toolbar configuration; omitted objects retain the generic action bar. */
  readonly toolbar?: ClassicEditorObjectToolbarFactory;
  /** Additional direct action objects retained by the configured Toolbar, without inflating legacy task menus. */
  readonly toolbarActions?: readonly ClassicEditorActionDefinition[];
  /** Optional plugin-owned Inspector definition rendered in the unique panel or Sheet. */
  readonly inspector?: ClassicEditorObjectInspectorDefinition;
}

/** Immutable state published by one object workspace controller. */
export interface ClassicEditorObjectWorkspaceSnapshot {
  /** Monotonic instance-local revision. */
  readonly revision: number;
  /** Current exact contribution, or null without an object target. */
  readonly contribution: ClassicEditorObjectWorkspaceContribution | null;
  /** Current exact target, or null without a contribution. */
  readonly target: ClassicEditorObjectTarget | null;
  /** Latest exact-target freshness. */
  readonly freshness: ClassicEditorObjectFreshness | null;
  /** Whether the compact/narrow full-height Inspector Sheet is open. */
  readonly sheetOpen: boolean;
  /** Active Inspector tab retained across responsive projection changes. */
  readonly activeTabId: string | null;
}

/** Listener notified after an immutable object snapshot commits. */
export type ClassicEditorObjectWorkspaceListener = (
  snapshot: ClassicEditorObjectWorkspaceSnapshot
) => void;

/** Explicit focus target restored when a transient object surface closes. */
export interface ClassicEditorObjectWorkspaceFocusTarget {
  /** Whether the captured focus target still belongs to its root. */
  readonly isConnected?: boolean | undefined;
  /** @param options - Native browser focus options. */
  focus(options?: FocusOptions): void;
}

/** Typed controller shared by floating, panel, Sheet, and bottom projections. */
export interface ClassicEditorObjectWorkspaceController {
  /** Latest mounted product context used by direct action resolution. */
  readonly context: ClassicEditorRenderContext;
  /** Current immutable object workspace state. */
  readonly snapshot: ClassicEditorObjectWorkspaceSnapshot;
  /** @param listener - Immediate-replay state consumer. @returns Idempotent cleanup. */
  subscribe(listener: ClassicEditorObjectWorkspaceListener): () => void;
  /** @param contribution - Exact direct contribution to activate. @returns Whether state changed. */
  activate(contribution: ClassicEditorObjectWorkspaceContribution): boolean;
  /** @param reason - Typed presentation-only close reason. @returns Whether state changed. */
  clear(reason?: "selection" | "stale" | "unmount" | "explicit"): boolean;
  /** @returns Latest owner-supplied freshness for the exact target. */
  revalidate(): ClassicEditorObjectFreshness | null;
  /** @param layout - Responsive surface recipe. @returns Direct action partition. */
  projectActions(layout: ClassicEditorObjectWorkspaceLayout): ClassicEditorObjectActionSurfaceProjection;
  /**
   * Executes an exact retained direct action.
   *
   * @param action - Direct action object received from a projection.
   * @param source - Canonical product action surface.
   * @param payload - Optional surface payload merged with the exact target.
   * @returns Whether the action handled the request.
   */
  execute(
    action: ClassicEditorActionDefinition,
    source: "contextual-popup" | "menu" | "panel",
    payload?: unknown
  ): Promise<boolean>;
  /**
   * Resolves one retained action for exact-target presentation.
   *
   * @param action - Direct action retained by the object or Inspector definition.
   * @param source - Canonical presenting surface.
   * @param payload - Optional field or surface payload.
   * @returns Canonical state, or null for a foreign action object.
   */
  resolveActionState(
    action: ClassicEditorActionDefinition,
    source: "contextual-popup" | "menu" | "panel",
    payload?: unknown
  ): ClassicEditorActionState | null;
  /** @param tabId - Direct Inspector tab identity to select. @returns Whether it changed. */
  selectInspectorTab(tabId: string): boolean;
  /**
   * Opens the Inspector in the unique panel or responsive Sheet.
   *
   * @param layout - Current root-local layout.
   * @param returnFocus - Exact object or trigger focus target.
   * @returns Whether the Inspector opened.
   */
  openInspector(
    layout: ClassicEditorObjectWorkspaceLayout,
    returnFocus: ClassicEditorObjectWorkspaceFocusTarget | null
  ): boolean;
  /** @param reason - Sheet close reason. @returns Whether the Sheet closed. */
  closeSheet(reason?: "back" | "escape" | "explicit"): boolean;
  /**
   * Binds the unique Workspace Panel host and its direct object contribution.
   *
   * @param panel - Root-local unique panel controller.
   * @param contribution - Direct panel contribution object.
   * @returns Cleanup for this exact binding.
   */
  bindWorkspacePanel(
    panel: ClassicEditorWorkspacePanelController,
    contribution: import("../workspace-panel").ClassicEditorWorkspacePanelContribution
  ): () => void;
}
