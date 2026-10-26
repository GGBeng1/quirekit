import type {
  QuireEditor,
  QuireMountedEditorView as CoreMountedEditorView,
  QuireMountedEditorViewElements as CoreMountedEditorViewElements,
  QuireMountedEditorViewOptions as CoreMountedEditorViewOptions
} from "@quirekit/core";
import type {
  EditorUIAnchorRequest,
  EditorUIClientAnchorResolution
} from "@quirekit/editor-ui";
import type {
  QuireDocumentRange,
  QuirePoint,
  QuireViewWidget,
  QuireViewWidgetHit
} from "@quirekit/renderer";
import type {
  EditorProps as PMEditorProps,
  EditorState as PMEditorState,
  Transaction
} from "@quirekit/pm";
import type {
  QuireViewPosAtCoordsResult,
  QuireViewViewportCoords
} from "./geometry";

/** View backend mode mounted by an editor runtime. */
export type QuireViewMode = "canvas" | "svg" | "html";

/** Lifecycle status for a mounted editor view. */
export type QuireEditorViewStatus = "primary" | "lock" | "sync";

/**
 * Caret presentation policy for a mounted editor view.
 *
 * - `blink` follows the editor: it blinks while the view is focused and editable,
 *   stays visible while editable but unfocused, and hides in read-only/preview.
 * - `steady` keeps the caret painted without blinking, regardless of focus.
 * - `hidden` never paints the caret.
 */
export type QuireMountedCaretMode = "blink" | "steady" | "hidden";

/**
 * Backend used to render the editable caret of a mounted view.
 *
 * - `dom` paints the caret as a CSS-animated DOM element above the content; the
 *   overlay display list never carries a caret command, so the blink is free and
 *   the per-page overlay caret-repaint path is removed. This is the default.
 * - `overlay` keeps the caret in the display list painted on each backend's
 *   overlay surface, blinking through an overlay repaint timer. It is the fallback.
 */
export type QuireMountedCaretRenderingMode = "dom" | "overlay";

/** Reason why a mounted view should refresh itself from shared editor state. */
export type QuireMountedViewUpdateReason =
  | "transaction"
  | "document-replace"
  | "selection"
  | "composition"
  | "resize"
  | "image-epoch"
  | "mode-change";

/**
 * Browser elements shared by every mounted editor view.
 *
 * This base describes only the shared geometry and lifecycle anchors: the root
 * element, the optional overlay host, and the optional input proxy. Surface
 * realization (how document pixels are produced) is per-backend and lives in each
 * backend's own elements type — canvas paints per-page surfaces, HTML renders a
 * DOM flow, SVG renders its own nodes — so the shared contract must not mandate a
 * single content or overlay surface.
 */
export type QuireMountedEditorViewElements = CoreMountedEditorViewElements;

/** Options used to mount a mode-specific editor view. */
export interface QuireMountedEditorViewOptions extends CoreMountedEditorViewOptions {
  /** View mode being mounted. */
  readonly mode: QuireViewMode;
}

/** Options used to create a shared mounted editor view base. */
export interface BaseMountedEditorViewOptions<
  Mode extends QuireViewMode,
  Elements extends QuireMountedEditorViewElements
> extends Pick<CoreMountedEditorViewOptions, "editor" | "id" | "status"> {
  /** View backend mode implemented by this mounted view. */
  readonly mode: Mode;
  /** Elements created or claimed by the mounted view. */
  readonly elements: Elements;
}

/** PM-style direct props snapshot exposed by a mounted QuireKit view. */
export interface QuireMountedEditorViewProps extends Partial<PMEditorProps> {
  /** Current ProseMirror state synchronized from the owning editor. */
  readonly state: PMEditorState;
}

/** Options passed to a mounted view update. */
export interface QuireMountedEditorViewUpdateOptions {
  /** Editor whose latest state should be rendered. */
  readonly editor: QuireEditor;
  /** Why the mounted view is being refreshed. */
  readonly reason: QuireMountedViewUpdateReason;
  /** Applied transactions that contributed to this update, when available. */
  readonly transactions?: readonly Transaction[] | undefined;
}

/** Mounted view refinements; common behavior is owned by the Core contract. */
export interface QuireMountedEditorView extends Omit<
  CoreMountedEditorView,
  | "queryBlockFragments"
  | "beginBlockDrag"
> {
  /** View backend mode implemented by this mounted view. */
  readonly mode: QuireViewMode;
  /** Current direct props snapshot exposed by this mounted view. */
  readonly props: QuireMountedEditorViewProps;
  /**
   * Maps viewport coordinates to a document position.
   *
   * @param coords - Viewport coordinates in CSS pixels.
   * @returns Document position near the coordinates, or null when no position is available.
   */
  posAtCoords(coords: QuireViewViewportCoords): QuireViewPosAtCoordsResult | null;
  /**
   * Resolves one version-bound Canvas/SVG UI anchor from retained geometry.
   * @param request - Explicit typed anchor request.
   * @returns Client-space geometry or explicit stale/unsupported state.
   */
  resolveUIAnchor?(
    request: EditorUIAnchorRequest
  ): EditorUIClientAnchorResolution;
  /**
   * Reads virtual widget objects for the latest render result.
   *
   * @returns Widgets in compiler output order.
   */
  getWidgets(): readonly QuireViewWidget[];
  /**
   * Finds a widget by id.
   *
   * @param id - Widget id to search.
   * @returns Widget with the requested id, or undefined.
   */
  getWidgetById(id: string): QuireViewWidget | undefined;
  /**
   * Finds widgets with a semantic role.
   *
   * @param role - Role to search.
   * @returns Widgets with the requested role in compiler output order.
   */
  getWidgetsByRole(role: string): readonly QuireViewWidget[];
  /**
   * Finds widgets with a semantic part name.
   *
   * @param part - Part name to search.
   * @returns Widgets with the requested part in compiler output order.
   */
  getWidgetsByPart(part: string): readonly QuireViewWidget[];
  /**
   * Finds widgets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Widgets containing the position in compiler output order.
   */
  getWidgetsByPosition(position: number): readonly QuireViewWidget[];
  /**
   * Finds widgets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Widgets overlapping the range in compiler output order.
   */
  getWidgetsByRange(range: QuireDocumentRange): readonly QuireViewWidget[];
  /**
   * Hit-tests one renderer-space point against the latest widgets.
   *
   * @param point - Renderer-space point to test.
   * @returns Hit widget result, or null when no widget is hit.
   */
  widgetAtPoint(point: QuirePoint): QuireViewWidgetHit | null;
  /**
   * Finds the rendered DOM position for a document position when the mode owns
   * a DOM content tree. Canvas and SVG modes should leave this unavailable
   * rather than returning fake DOM positions.
   *
   * @param pos - Document position to map.
   * @param side - Side preference for boundary positions.
   * @returns DOM node and offset for the requested position.
   */
  domAtPos?(pos: number, side?: number): { readonly node: Node; readonly offset: number };
  /**
   * Finds the rendered DOM node for the document node after a position when
   * the mode owns a DOM content tree.
   *
   * @param pos - Document position before the node.
   * @returns Rendered DOM node, or null when unavailable.
   */
  nodeDOM?(pos: number): Node | null;
  /**
   * Maps a DOM position owned by the mounted view back to a document position.
   *
   * @param node - DOM node inside the mounted view content tree.
   * @param offset - DOM offset inside the node.
   * @param bias - Side bias for ambiguous boundary positions.
   * @returns Document position represented by the DOM position.
   */
  posAtDOM?(node: Node, offset: number, bias?: number): number;
  /**
   * Renders the latest shared editor state into this mounted view.
   *
   * @param options - Shared editor state and update reason.
   */
  update(options: QuireMountedEditorViewUpdateOptions): void;
}

/** Adapter that creates mounted views for one backend mode. */
export interface QuireViewAdapter {
  /** View mode handled by this adapter. */
  readonly mode: QuireViewMode;
  /**
   * Mounts a view instance into a consumer element.
   *
   * @param options - Editor state, mount element, identity, and runtime status.
   * @returns Mounted editor view instance.
   */
  mount(options: QuireMountedEditorViewOptions): QuireMountedEditorView;
}
