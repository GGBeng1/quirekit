/** Product-surface audience declared by plugins and UI contributions. */
export type ClassicEditorAudience = "user" | "developer";

/** Create-time product-surface registration mode. */
export type ClassicEditorSurfaceMode = "user" | "developer";

/** Instance-owned reading strategy; automatic modes adapt to the workspace. */
export type ClassicEditorZoomMode = "manual" | "fit-width" | "fit-page" | "fit-content";

/** Immutable sidebar state owned by the product UI runtime. */
export interface ClassicEditorSidebarState {
  /** Whether the sidebar region is visible. */
  readonly visible: boolean;
  /** Active panel id, or null when the side has no selected panel. */
  readonly activePanelId: string | null;
  /** Requested semantic target inside the active panel, or null. */
  readonly targetId: string | null;
  /** Monotonic revision of target-navigation requests. */
  readonly navigationRevision: number;
}

/** Optional navigation carried while opening a product sidebar panel. */
export interface ClassicEditorSidebarOpenOptions {
  /** Stable semantic target that the panel should reveal. */
  readonly targetId?: string | undefined;
}

/** Immutable product UI state exposed to actions and hosts. */
export interface ClassicEditorUiState {
  /** Document-only reading scale as a percentage, from 25 through 400. */
  readonly zoom: number;
  /** Requested reading strategy, preserved across backend remounts. */
  readonly zoomMode: ClassicEditorZoomMode;
  /** Whether the mounted horizontal ruler is visible. */
  readonly rulerVisible: boolean;
  /** Whether nonprinting character hints are visible in the document view. */
  readonly invisibleCharactersVisible: boolean;
  /** Whether hidden text participates in the current inspection view. */
  readonly hiddenTextVisible: boolean;
  /** Left product sidebar state. */
  readonly leftSidebar: ClassicEditorSidebarState;
  /** Right product sidebar state. */
  readonly rightSidebar: ClassicEditorSidebarState;
  /** Immutable semantic data shared by every product action surface. */
  readonly semantic: ClassicEditorUiSemanticSnapshot;
}

/** Immutable selection identity used by product action surfaces. */
export interface ClassicEditorUiSelectionSnapshot {
  /** Inclusive document selection start. */
  readonly from: number;
  /** Exclusive document selection end. */
  readonly to: number;
  /** Whether the selection is empty. */
  readonly empty: boolean;
}

/** Immutable viewport geometry associated with the active semantic target. */
export interface ClassicEditorUiGeometrySnapshot {
  /** Viewport-relative left coordinate. */
  readonly left: number;
  /** Viewport-relative top coordinate. */
  readonly top: number;
  /** Viewport-relative width. */
  readonly width: number;
  /** Viewport-relative height. */
  readonly height: number;
}

/** Shared semantic state read by all Classic Editor action surfaces. */
export interface ClassicEditorUiSemanticSnapshot {
  /** Current document selection, or null when no editor selection is available. */
  readonly selection: ClassicEditorUiSelectionSnapshot | null;
  /** Stable target identity such as a table, image, or text-selection target. */
  readonly target: string | null;
  /** Current resolved values keyed by semantic property. */
  readonly values: Readonly<Record<string, unknown>>;
  /** Property keys whose current selection has mixed values. */
  readonly mixed: readonly string[];
  /** Action ids that are currently executable. */
  readonly can: Readonly<Record<string, boolean>>;
  /** Disabled explanations keyed by action id. */
  readonly reasons: Readonly<Record<string, string>>;
  /** Action ids with owned asynchronous work in progress. */
  readonly busy: readonly string[];
  /** Current target geometry, when one product surface owns it. */
  readonly geometry: ClassicEditorUiGeometrySnapshot | null;
  /** Monotonic revision supplied by the semantic-state producer. */
  readonly freshness: number;
}

/** Listener notified after the product UI state changes. */
export type ClassicEditorUiStateListener = (
  state: ClassicEditorUiState
) => void;

/** Typed runtime authority for non-document product UI state. */
export interface ClassicEditorUiController {
  /** Current immutable product UI state. */
  readonly state: ClassicEditorUiState;
  /**
   * Sets a fixed percentage and exits automatic fit without changing document history.
   * @param percent - Finite reading percentage, clamped to 25–400.
   */
  setZoom(percent: number): void;
  /** @param mode - Automatic page fit or fixed reading percentage; never changes document history. */
  setZoomMode(mode: ClassicEditorZoomMode): void;
  /**
   * Shows or hides the ruler without recreating the document view.
   * @param visible - Requested ruler visibility.
   */
  setRulerVisible(visible: boolean): void;
  /** @param visible - View-only hint visibility; does not change document history. */
  setInvisibleCharactersVisible(visible: boolean): void;
  /** @param visible - View-only hidden-text visibility, independent of document formatting and history. */
  setHiddenTextVisible(visible: boolean): void;
  /**
   * Subscribes to product UI state changes.
   *
   * @param listener - Listener called with each new immutable snapshot.
   * @returns Cleanup that removes the listener.
   */
  subscribe(listener: ClassicEditorUiStateListener): () => void;
  /**
   * Sets one sidebar's visibility.
   *
   * @param side - Product sidebar side.
   * @param visible - Requested visibility.
   */
  setSidebarVisible(side: "left" | "right", visible: boolean): void;
  /**
   * Toggles one sidebar's visibility.
   *
   * @param side - Product sidebar side.
   */
  toggleSidebar(side: "left" | "right"): void;
  /**
   * Opens one panel and its owning sidebar.
   *
   * @param side - Product sidebar side.
   * @param panelId - Stable sidebar-panel contribution id.
   * @param options - Optional semantic target inside the panel.
   */
  openSidebarPanel(
    side: "left" | "right",
    panelId: string,
    options?: ClassicEditorSidebarOpenOptions
  ): void;
  /**
   * Closes one sidebar without discarding its active panel selection.
   *
   * @param side - Product sidebar side.
   */
  closeSidebar(side: "left" | "right"): void;
  /**
   * Replaces the product semantic snapshot with an immutable value.
   *
   * @param snapshot - Current selection, target, command, and geometry semantics.
   */
  setSemanticSnapshot(snapshot: ClassicEditorUiSemanticSnapshot): void;
}

/** Ordered allowlist for one configurable product surface. */
export interface ClassicEditorUiSurfaceProfile {
  /** Item contribution ids in final presentation order. */
  readonly items?: readonly string[] | undefined;
}

/** Consumer composition for action-backed product surfaces. */
export interface ClassicEditorUiProfileOptions {
  /** Toolbar composition, or false to hide every toolbar item. */
  readonly toolbar?: ClassicEditorUiSurfaceProfile | false | undefined;
  /** Context-menu composition, or false to disable the surface. */
  readonly contextMenu?: ClassicEditorUiSurfaceProfile | false | undefined;
  /** Text-selection popup composition, or false to disable the surface. */
  readonly selectionPopup?: ClassicEditorUiSurfaceProfile | false | undefined;
}
