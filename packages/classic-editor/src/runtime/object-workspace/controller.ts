import type {
  ClassicEditorActionDefinition,
  ClassicEditorActionState,
  ClassicEditorRenderContext,
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelController
} from "../../types";
import type {
  ClassicEditorObjectFreshness,
  ClassicEditorObjectWorkspaceContribution,
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceFocusTarget,
  ClassicEditorObjectWorkspaceLayout,
  ClassicEditorObjectWorkspaceListener,
  ClassicEditorObjectWorkspaceSnapshot
} from "../../types/object-workspace";
import {
  executeClassicEditorAction,
  resolveClassicEditorActionState
} from "../ui";
import { targetReason } from "./actions";
import { projectObjectWorkspaceActions } from "./actions";
import {
  createInitialObjectWorkspaceSnapshot,
  freezeObjectWorkspaceSnapshot
} from "./snapshot";
import { ClassicEditorObjectInspectorRuntime } from "./inspector";
import {
  createObjectTargetMismatchFreshness,
  haveSameObjectTarget,
  isRetainedObjectAction,
  resolveFirstObjectInspectorTab,
  validateObjectWorkspaceContribution
} from "./validation";

/** Instance-local controller for all object action and Inspector projections. */
export class ClassicEditorObjectWorkspaceRuntime
implements ClassicEditorObjectWorkspaceController {
  private contextValue: ClassicEditorRenderContext;
  private snapshotValue = createInitialObjectWorkspaceSnapshot();
  private readonly listeners = new Set<ClassicEditorObjectWorkspaceListener>();
  private readonly inspector: ClassicEditorObjectInspectorRuntime;
  /** @param context - Mounted product context owned by one Classic root. */
  constructor(context: ClassicEditorRenderContext) {
    this.contextValue = context;
    this.inspector = new ClassicEditorObjectInspectorRuntime({
      snapshot: () => this.snapshotValue,
      revalidate: () => this.revalidate(),
      commit: (contribution, freshness, sheetOpen, activeTabId) => {
        this.commit(contribution, freshness, sheetOpen, activeTabId);
      }
    });
  }

  /** @returns Latest mounted product context used by canonical direct actions. */
  get context(): ClassicEditorRenderContext {
    return this.contextValue;
  }

  /**
   * Replaces presentation context without changing the retained exact target.
   *
   * @param context - Latest context from the owning workspace widget lifecycle.
   */
  updateContext(context: ClassicEditorRenderContext): void {
    this.contextValue = context;
    this.revalidate();
  }
  /** @returns Current immutable controller state. */
  get snapshot(): ClassicEditorObjectWorkspaceSnapshot {
    return this.snapshotValue;
  }
  /** @param listener - Immediate-replay subscriber. @returns Idempotent cleanup. */
  subscribe(listener: ClassicEditorObjectWorkspaceListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshotValue);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.listeners.delete(listener);
    };
  }
  /** @param contribution - Exact object contribution. @returns Whether state changed. */
  activate(contribution: ClassicEditorObjectWorkspaceContribution): boolean {
    validateObjectWorkspaceContribution(contribution);
    const previous = this.snapshotValue;
    const continuesInspector = previous.contribution?.id === contribution.id
      && previous.target !== null
      && haveSameObjectTarget(contribution, previous.target);
    if (contribution.inspector === undefined) {
      this.inspector.closeOwnedPanel();
      this.inspector.restoreSheetFocus();
    }
    const resolution = contribution.resolveTarget();
    const freshness = haveSameObjectTarget(contribution, resolution.target)
      ? resolution.freshness
      : createObjectTargetMismatchFreshness(resolution.freshness.revision);
    const retainedTab = continuesInspector
      && contribution.inspector?.tabs.some(tab => tab.id === previous.activeTabId)
      ? previous.activeTabId
      : resolveFirstObjectInspectorTab(contribution);
    this.commit(
      contribution,
      freshness,
      continuesInspector && freshness.status === "ready" && previous.sheetOpen,
      retainedTab
    );
    return true;
  }
  /** @param _reason - Presentation close reason. @returns Whether state changed. */
  clear(_reason: "selection" | "stale" | "unmount" | "explicit" = "explicit"): boolean {
    if (this.snapshotValue.contribution === null) return false;
    this.inspector.closeOwnedPanel();
    this.inspector.restoreSheetFocus();
    this.commit(null, null, false, null);
    return true;
  }
  /** @returns Latest freshness for the exact target. */
  revalidate(): ClassicEditorObjectFreshness | null {
    const contribution = this.snapshotValue.contribution;
    if (contribution === null) return null;
    const resolution = contribution.resolveTarget();
    const freshness = haveSameObjectTarget(contribution, resolution.target)
      ? resolution.freshness
      : createObjectTargetMismatchFreshness(resolution.freshness.revision);
    this.commit(
      contribution,
      freshness,
      contribution.inspector !== undefined
        && freshness.status === "ready"
        && this.snapshotValue.sheetOpen,
      contribution.inspector === undefined ? null : this.snapshotValue.activeTabId
    );
    return freshness;
  }
  /** @param layout - Responsive recipe. @returns Direct action partition. */
  projectActions(layout: ClassicEditorObjectWorkspaceLayout) {
    const contribution = this.snapshotValue.contribution;
    const freshness = this.snapshotValue.freshness;
    if (contribution === null || freshness === null) {
      return Object.freeze({ primary: Object.freeze([]), overflow: Object.freeze([]) });
    }
    return projectObjectWorkspaceActions(contribution, freshness, this.context, layout);
  }
  /** @inheritdoc */
  async execute(
    action: ClassicEditorActionDefinition,
    source: "contextual-popup" | "menu" | "panel",
    payload?: unknown
  ): Promise<boolean> {
    const contribution = this.snapshotValue.contribution;
    if (contribution === null || !isRetainedObjectAction(contribution, action)) {
      return false;
    }
    const freshness = this.revalidate();
    if (freshness?.status !== "ready") return false;
    return executeClassicEditorAction(
      action,
      this.context,
      Object.freeze({ target: contribution.target, input: payload }),
      source
    );
  }
  /** @inheritdoc */
  resolveActionState(
    action: ClassicEditorActionDefinition,
    source: "contextual-popup" | "menu" | "panel",
    payload?: unknown
  ): ClassicEditorActionState | null {
    const contribution = this.snapshotValue.contribution;
    const freshness = this.snapshotValue.freshness;
    if (
      contribution === null
      || freshness === null
      || !isRetainedObjectAction(contribution, action)
    ) return null;
    const state = resolveClassicEditorActionState(
      action,
      this.context,
      Object.freeze({ target: contribution.target, input: payload }),
      source
    );
    if (!state.available) return state;
    return freshness.status === "ready"
      ? state
      : Object.freeze({ ...state, canExecute: false, reason: targetReason(freshness) });
  }
  /** @param tabId - Direct tab identity. @returns Whether the active tab changed. */
  selectInspectorTab(tabId: string): boolean {
    return this.inspector.selectTab(tabId);
  }

  /** @inheritdoc */
  openInspector(
    layout: ClassicEditorObjectWorkspaceLayout,
    returnFocus: ClassicEditorObjectWorkspaceFocusTarget | null
  ): boolean {
    return this.inspector.open(layout, returnFocus);
  }

  /** @param _reason - Sheet close reason. @returns Whether the Sheet closed. */
  closeSheet(_reason: "back" | "escape" | "explicit" = "explicit"): boolean {
    return this.inspector.closeSheet();
  }

  /** @inheritdoc */
  bindWorkspacePanel(
    panel: ClassicEditorWorkspacePanelController,
    contribution: ClassicEditorWorkspacePanelContribution
  ): () => void {
    return this.inspector.bindPanel(panel, contribution);
  }
  /** Commits one immutable snapshot and notifies root-local subscribers. */
  private commit(
    contribution: ClassicEditorObjectWorkspaceContribution | null,
    freshness: ClassicEditorObjectFreshness | null,
    sheetOpen: boolean,
    activeTabId: string | null
  ): void {
    this.snapshotValue = freezeObjectWorkspaceSnapshot(
      this.snapshotValue.revision + 1,
      contribution,
      freshness,
      sheetOpen,
      activeTabId
    );
    for (const listener of this.listeners) listener(this.snapshotValue);
  }
}
