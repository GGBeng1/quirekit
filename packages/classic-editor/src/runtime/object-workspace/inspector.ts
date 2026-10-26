import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelController,
  ClassicEditorWorkspacePanelFreshness
} from "../../types";
import type {
  ClassicEditorObjectFreshness,
  ClassicEditorObjectWorkspaceContribution,
  ClassicEditorObjectWorkspaceFocusTarget,
  ClassicEditorObjectWorkspaceLayout,
  ClassicEditorObjectWorkspaceSnapshot
} from "../../types/object-workspace";

/** State/transition ports supplied by the parent object controller. */
export interface ClassicEditorObjectInspectorRuntimeHost {
  /** @returns Current immutable object snapshot. */
  readonly snapshot: () => ClassicEditorObjectWorkspaceSnapshot;
  /** @returns Latest exact-target freshness. */
  readonly revalidate: () => ClassicEditorObjectFreshness | null;
  /** Commits Inspector-only state without changing the retained object. */
  readonly commit: (
    contribution: ClassicEditorObjectWorkspaceContribution | null,
    freshness: ClassicEditorObjectFreshness | null,
    sheetOpen: boolean,
    activeTabId: string | null
  ) => void;
}

/** Coordinates unique-panel and responsive-Sheet Inspector projections. */
export class ClassicEditorObjectInspectorRuntime {
  private readonly host: ClassicEditorObjectInspectorRuntimeHost;
  private panelBinding: {
    readonly panel: ClassicEditorWorkspacePanelController;
    readonly contribution: ClassicEditorWorkspacePanelContribution;
  } | null = null;
  private sheetReturnFocus: ClassicEditorObjectWorkspaceFocusTarget | null = null;

  /** @param host - Parent snapshot and transition ports. */
  constructor(host: ClassicEditorObjectInspectorRuntimeHost) {
    this.host = host;
  }

  /** @param tabId - Direct tab identity. @returns Whether active tab changed. */
  selectTab(tabId: string): boolean {
    const snapshot = this.host.snapshot();
    const contribution = snapshot.contribution;
    if (
      contribution?.inspector === undefined
      || !contribution.inspector.tabs.some((tab) => tab.id === tabId)
    ) {
      return false;
    }
    if (snapshot.activeTabId === tabId) return false;
    this.host.commit(contribution, snapshot.freshness, snapshot.sheetOpen, tabId);
    return true;
  }

  /**
   * Opens the unique wide panel or responsive modal Sheet.
   *
   * @param layout - Root-local object layout.
   * @param returnFocus - Exact trigger or object focus target.
   * @returns Whether the Inspector opened.
   */
  open(
    layout: ClassicEditorObjectWorkspaceLayout,
    returnFocus: ClassicEditorObjectWorkspaceFocusTarget | null
  ): boolean {
    const snapshot = this.host.snapshot();
    const contribution = snapshot.contribution;
    const freshness = this.host.revalidate();
    if (
      contribution?.inspector === undefined
      || freshness?.status !== "ready"
    ) return false;
    if (layout !== "wide") {
      this.sheetReturnFocus = returnFocus;
      this.host.commit(contribution, freshness, true, snapshot.activeTabId);
      return true;
    }
    const binding = this.panelBinding;
    if (binding === null) return false;
    return binding.panel.open({
      contribution: binding.contribution,
      target: {
        kind: "object",
        id: contribution.target.id,
        ownerId: contribution.target.ownerId,
        revision: contribution.target.revision,
        label: contribution.target.label
      },
      freshness: toWorkspacePanelFreshness(freshness),
      returnFocus
    });
  }

  /** @returns Whether the responsive Sheet closed. */
  closeSheet(): boolean {
    const snapshot = this.host.snapshot();
    if (!snapshot.sheetOpen) return false;
    this.host.commit(
      snapshot.contribution,
      snapshot.freshness,
      false,
      snapshot.activeTabId
    );
    this.restoreSheetFocus();
    return true;
  }

  /** Closes only this controller's currently active unique panel. */
  closeOwnedPanel(): void {
    const binding = this.panelBinding;
    if (
      binding !== null
      && binding.panel.snapshot.active?.contribution === binding.contribution
    ) binding.panel.close("explicit");
  }

  /** Returns responsive Sheet focus to the exact captured target. */
  restoreSheetFocus(): void {
    const target = this.sheetReturnFocus;
    this.sheetReturnFocus = null;
    if (target?.isConnected !== false) target?.focus({ preventScroll: true });
  }

  /**
   * Binds one unique Workspace Panel host.
   *
   * @param panel - Root-local panel controller.
   * @param contribution - Direct object panel contribution.
   * @returns Cleanup for this exact binding.
   */
  bindPanel(
    panel: ClassicEditorWorkspacePanelController,
    contribution: ClassicEditorWorkspacePanelContribution
  ): () => void {
    const binding = { panel, contribution } as const;
    this.panelBinding = binding;
    return () => {
      if (this.panelBinding === binding) this.panelBinding = null;
    };
  }
}

/** @param freshness - Object freshness. @returns Workspace Panel freshness. */
function toWorkspacePanelFreshness(
  freshness: ClassicEditorObjectFreshness
): ClassicEditorWorkspacePanelFreshness {
  const status = freshness.status === "read-only" ? "locked" : freshness.status;
  return Object.freeze({
    revision: freshness.revision,
    status,
    reason: freshness.reason === null ? null : `object-target-${freshness.status}`
  });
}
