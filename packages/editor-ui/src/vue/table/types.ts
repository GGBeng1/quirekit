import type { QuireMountedCapabilityRect, QuireMountedTableChromeAnchor, QuireMountedTableChromeFragment, QuireMountedTableChromeModel } from "@quirekit/core";
import type { Ref } from "vue";

/** Locale shared by editing controls. */
export type EditorUILocale = "zh-CN" | "en";
/** Axis addressed by table controls. */
export type EditorUITableAxis = "row" | "column";

/** Request to insert at one zero-based Table axis boundary. */
export interface EditorUITableInsertionRequest {
  /** Axis whose topology will be extended. */
  readonly axis: EditorUITableAxis;
  /** Boundary before an item, ranging from zero through the axis length. */
  readonly boundaryIndex: number;
}

/** Request to commit one previewed Table axis size. */
export interface EditorUITableResizeRequest {
  /** Axis whose size will be persisted. */
  readonly axis: EditorUITableAxis;
  /** Source row or grid-column index owning the trailing edge. */
  readonly index: number;
  /** Final unscaled document-pixel size after preview clamping. */
  readonly size: number;
}

/** Structurally selected source range available to a reorder gesture. */
export interface EditorUITableMoveSource {
  /** Axis whose selected items can move. */
  readonly axis: EditorUITableAxis;
  /** First selected source axis index. */
  readonly from: number;
  /** Last selected source axis index, inclusive. */
  readonly to: number;
}

/** Request to move a selected Table axis range to one source boundary. */
export interface EditorUITableMoveRequest
  extends EditorUITableMoveSource {
  /** Source-table boundary before which the moved range is inserted. */
  readonly targetIndex: number;
}

/** Viewport preview for one captured row or column reorder gesture. */
export interface EditorUITableMovePreview
  extends EditorUITableMoveRequest {
  /** Current preview guide coordinate on the active axis. */
  readonly position: number;
  /** Active page-local Table bounds at pointer capture. */
  readonly tableRect: QuireMountedCapabilityRect;
}

/** Result returned when one captured reorder gesture finishes. */
export interface EditorUITableMoveFinish {
  /** Whether pointer movement crossed the drag threshold. */
  readonly didDrag: boolean;
  /** Semantic move request, or null for a no-op destination. */
  readonly request: EditorUITableMoveRequest | null;
}

/** Pointer-capture controller used by selected Table axis bars. */
export interface EditorUITableMoveController {
  /** Current reorder preview, or null before the drag threshold is crossed. */
  readonly preview: Ref<EditorUITableMovePreview | null>;
  /**
   * Captures one selected row or column bar.
   *
   * @param event - Initial pointer event.
   * @param source - Structurally selected source range.
   * @param fragment - Active page-local Table fragment.
   */
  readonly start: (
    event: PointerEvent,
    source: EditorUITableMoveSource,
    fragment: QuireMountedTableChromeFragment
  ) => void;
  /**
   * Updates the reorder target from captured pointer movement.
   *
   * @param event - Captured pointer movement.
   */
  readonly update: (event: PointerEvent) => void;
  /**
   * Finishes the captured gesture.
   *
   * @param event - Captured pointer release.
   * @returns Drag result, or null when the pointer does not own the session.
   */
  readonly finish: (event: PointerEvent) => EditorUITableMoveFinish | null;
  /**
   * Cancels the current captured gesture.
   *
   * @param event - Optional pointer event used to validate ownership.
   */
  readonly cancel: (event?: PointerEvent) => void;
}

/** Viewport preview for one captured row or column resize gesture. */
export interface EditorUITableResizePreview
  extends EditorUITableResizeRequest {
  /** Clamped pointer delta from the captured boundary. */
  readonly delta: number;
  /** Current preview guide coordinate on the active axis. */
  readonly position: number;
  /** Active page-local Table bounds at pointer capture. */
  readonly tableRect: QuireMountedCapabilityRect;
}

/** Pointer-capture controller used by the Table boundary layer. */
export interface EditorUITableResizeController {
  /** Current preview state, or null outside a drag gesture. */
  readonly preview: Ref<EditorUITableResizePreview | null>;
  /**
   * Captures one row or column resize boundary.
   *
   * @param event - Initial pointer event.
   * @param anchor - Mounted trailing-edge resize anchor.
   * @param fragment - Active page-local Table fragment.
   * @param sizing - Unscaled source-flow measurements from the same mounted model.
   */
  readonly start: (
    event: PointerEvent,
    anchor: QuireMountedTableChromeAnchor,
    fragment: QuireMountedTableChromeFragment,
    sizing: QuireMountedTableChromeModel["sizing"]
  ) => void;
  /**
   * Updates the current preview from a captured pointer move.
   *
   * @param event - Captured pointer movement.
   */
  readonly update: (event: PointerEvent) => void;
  /**
   * Finishes the captured gesture and returns a semantic commit request.
   *
   * @param event - Captured pointer release.
   * @returns Final request, or null when the pointer does not own the session.
   */
  readonly finish: (event: PointerEvent) => EditorUITableResizeRequest | null;
  /**
   * Cancels the current captured gesture.
   *
   * @param event - Optional pointer event used to validate session ownership.
   */
  readonly cancel: (event?: PointerEvent) => void;
}

/** Product-neutral inputs for the shared spatial table controls. */
export interface EditorUITableChromeProps {
 /** Geometry in the scroll owner's coordinates. */ readonly fragment: QuireMountedTableChromeFragment;
 /** Same fragment in client coordinates for hit testing. */ readonly hitFragment: QuireMountedTableChromeFragment;
 /** Source CSS pixel sizes. */ readonly sizing: QuireMountedTableChromeModel["sizing"];
 /** Physical overlay host. */ readonly teleportTarget: HTMLElement;
 /** Document event owner when distinct from the overlay host. */ readonly interactionRoot?: HTMLElement | undefined;
 /** Owning browser document. */ readonly ownerDocument: Document;
 /** Theme owner. */ readonly themeRoot: HTMLElement;
 /** Captured document/layout identity, changed to cancel gestures. */ readonly identity: unknown;
 /** Product locale. */ readonly locale: EditorUILocale;
 /** Whether canonical selection owns the visual state. */ readonly selectionOwned: boolean;
 /** Current row. */ readonly rowIndex: number;
 /** Current column. */ readonly columnIndex: number;
 /** Full row rail paint. */ readonly rowBackground: string;
 /** Full column rail paint. */ readonly columnBackground: string;
 /** @param mode - Selection kind. @param index - Source index. @returns Structural coverage. */
 readonly selected: (mode: "row" | "column" | "table", index?: number) => boolean;
 /** @param axis - Axis. @param index - Source index. @returns Whether the current cell crosses this track. */
 readonly current: (axis: EditorUITableAxis, index?: number) => boolean;
 /** @param axis - Axis. @returns Movable structural selection, or null. */
 readonly moveSource: (axis: EditorUITableAxis) => EditorUITableMoveSource | null;
}
