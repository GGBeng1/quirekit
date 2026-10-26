import type {
  ClassicEditorSidebarOpenOptions,
  ClassicEditorUiController,
  ClassicEditorUiSemanticSnapshot,
  ClassicEditorUiState,
  ClassicEditorUiStateListener,
  ClassicEditorZoomMode
} from "../../types";
import { createState, freezeUiState, sameUiState, withVisible } from "./state";
import { builtinClassicEditorPanelIds } from "../../preset/builtin/ids";
import {
  assertClassicEditorSemanticFreshness,
  freezeClassicEditorSemanticSnapshot
} from "./semantic-snapshot";

/** Runtime-owned implementation of non-document product UI state. */
export class ClassicEditorUiControllerRuntime implements ClassicEditorUiController {
  private stateValue: ClassicEditorUiState;
  private semanticFreshness: number | undefined;
  private readonly listeners = new Set<ClassicEditorUiStateListener>();

  /**
   * Creates UI state from resolved product shell visibility.
   *
   * @param leftVisible - Initial left-sidebar visibility.
   * @param rightVisible - Initial right-sidebar visibility.
   * @param rulerVisible - Initial horizontal-ruler visibility.
   * @param hiddenTextVisible - Initial hidden-text inspection preference.
   */
  constructor(leftVisible: boolean, rightVisible: boolean, rulerVisible = true, hiddenTextVisible = false) {
    this.stateValue = createState(
      leftVisible,
      rightVisible,
      builtinClassicEditorPanelIds.outline,
      builtinClassicEditorPanelIds.documentProperties,
      rulerVisible,
      hiddenTextVisible
    );
  }

  /** @returns Current immutable product UI state. */
  get state(): ClassicEditorUiState {
    return this.stateValue;
  }

  /**
   * Subscribes to product UI state changes.
   *
   * @param listener - Listener called after each effective state change.
   * @returns Cleanup that removes the listener.
   */
  subscribe(listener: ClassicEditorUiStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reconciles visibility after product options change while preserving panel choices.
   *
   * @param leftVisible - Updated left-sidebar visibility.
   * @param rightVisible - Updated right-sidebar visibility.
   * @param rulerVisible - Explicit ruler visibility, otherwise the current preference.
   */
  reconcileVisibility(leftVisible: boolean, rightVisible: boolean, rulerVisible = this.stateValue.rulerVisible): void {
    this.commit({
      ...this.stateValue,
      rulerVisible,
      leftSidebar: withVisible(this.stateValue.leftSidebar, leftVisible),
      rightSidebar: withVisible(this.stateValue.rightSidebar, rightVisible),
      semantic: this.stateValue.semantic
    });
  }

  /** @param visible - Requested ruler visibility, independent from document state. */
  setRulerVisible(visible: boolean): void {
    this.commit({ ...this.stateValue, rulerVisible: visible });
  }

  /** @param visible - Whether to paint nonprinting source hints. */
  setInvisibleCharactersVisible(visible: boolean): void {
    this.commit({ ...this.stateValue, invisibleCharactersVisible: visible });
  }

  /** @param visible - Whether hidden text participates in view layout for inspection. */
  setHiddenTextVisible(visible: boolean): void {
    this.commit({ ...this.stateValue, hiddenTextVisible: visible });
  }

  /** @param percent - Finite reading percentage; UI state never modifies document geometry. */
  setZoom(percent: number): void {
    if (!Number.isFinite(percent)) throw new RangeError("Zoom must be a finite percentage.");
    this.commit({ ...this.stateValue, zoomMode: "manual", zoom: Math.min(400, Math.max(25, Math.round(percent))) });
  }

  /** @param mode - Reading strategy owned by this instance, including while unmounted. */
  setZoomMode(mode: ClassicEditorZoomMode): void {
    if (mode !== "manual" && mode !== "fit-width" && mode !== "fit-page" && mode !== "fit-content") throw new RangeError("Unknown zoom mode.");
    this.commit({ ...this.stateValue, zoomMode: mode });
  }

  /**
   * Accepts a mounted stage's measured percentage only for the still-current intent.
   * @param percent - Effective percentage derived from canonical paper and client viewport geometry.
   * @param mode - Automatic strategy used by the stage; stale results are ignored.
   */
  resolveFitZoom(percent: number, mode: Exclude<ClassicEditorZoomMode, "manual">): void {
    if (this.stateValue.zoomMode !== mode || !Number.isFinite(percent)) return;
    this.commit({ ...this.stateValue, zoom: Math.min(400, Math.max(25, Math.floor(percent))) });
  }

  /**
   * @param side - Sidebar side.
   * @param visible - Requested visibility.
   */
  setSidebarVisible(side: "left" | "right", visible: boolean): void {
    const key = side === "left" ? "leftSidebar" : "rightSidebar";
    this.commit({ ...this.stateValue, [key]: withVisible(this.stateValue[key], visible) });
  }

  /** @param side - Sidebar side. */
  toggleSidebar(side: "left" | "right"): void {
    const key = side === "left" ? "leftSidebar" : "rightSidebar";
    this.setSidebarVisible(side, !this.stateValue[key].visible);
  }

  /**
   * @param side - Sidebar side.
   * @param panelId - Panel contribution id.
   * @param options - Optional target-navigation request.
   */
  openSidebarPanel(
    side: "left" | "right",
    panelId: string,
    options?: ClassicEditorSidebarOpenOptions
  ): void {
    if (panelId.trim().length === 0) {
      throw new RangeError("Classic Editor sidebar panel ids must not be empty.");
    }
    const targetId = options?.targetId?.trim() ?? null;
    if (options?.targetId !== undefined && targetId === "") {
      throw new RangeError("Classic Editor sidebar target ids must not be empty.");
    }
    const key = side === "left" ? "leftSidebar" : "rightSidebar";
    const previous = this.stateValue[key];
    this.commit({
      ...this.stateValue,
      [key]: Object.freeze({
        visible: true,
        activePanelId: panelId,
        targetId,
        navigationRevision: targetId === null
          ? previous.navigationRevision
          : previous.navigationRevision + 1
      })
    });
  }

  /** @param side - Sidebar side. */
  closeSidebar(side: "left" | "right"): void {
    this.setSidebarVisible(side, false);
  }

  /**
   * Replaces shared action semantics without allowing caller-owned references
   * to mutate the published state after notification.
   *
   * @param snapshot - Current selection, target, command, and geometry semantics.
   */
  setSemanticSnapshot(snapshot: ClassicEditorUiSemanticSnapshot): void {
    assertClassicEditorSemanticFreshness(snapshot);
    if (
      this.semanticFreshness !== undefined
      && snapshot.freshness <= this.semanticFreshness
    ) return;
    this.semanticFreshness = snapshot.freshness;
    this.commit(
      { ...this.stateValue, semantic: freezeClassicEditorSemanticSnapshot(snapshot) },
      true
    );
  }

  /**
   * Publishes one immutable state only when its semantic values changed.
   *
   * @param state - Candidate next state.
   * @param semanticChanged - Whether the caller already proved the semantic revision changed.
   */
  private commit(state: ClassicEditorUiState, semanticChanged = false): void {
    if (sameUiState(this.stateValue, state, semanticChanged)) return;
    this.stateValue = freezeUiState(state);
    for (const listener of this.listeners) listener(this.stateValue);
  }
}
