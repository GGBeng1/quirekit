import type { QuireDocumentRange } from "../../../core/document";
import type {
  QuireHitArea,
  QuirePoint,
  QuireRect
} from "../../../core/geometry";
import type {
  QuireViewEventBindingMap,
  QuireViewHost,
  QuireViewOwner,
  QuireViewPointerEvents,
  QuireViewTarget
} from "../../events";

/** Options used to create widget objects from compiled targets. */
export interface QuireViewWidgetIndexOptions {
  /**
   * Reads the current host surface for widget objects.
   *
   * @returns Current host surface metadata, or undefined.
   */
  readonly getHost?: () => QuireViewHost | undefined;
}

/** Virtual widget object backed by one compiled qkView target. */
export interface QuireViewWidget<TContext = unknown> {
  /** Compiled target backing this widget. */
  readonly target: QuireViewTarget<TContext>;
  /** Target ancestry from this widget to the outermost target. */
  readonly targetPath: readonly QuireViewTarget<TContext>[];
  /** Stable target id. */
  readonly id: string;
  /** Path within the compiled qkView tree. */
  readonly nodePath: string;
  /** Resolved target rectangle in renderer coordinate space. */
  readonly rect: QuireRect;
  /** Optional exact geometry evaluated after the coarse rectangle. */
  readonly hitArea?: QuireHitArea | undefined;
  /** Optional document range represented by this widget. */
  readonly range?: QuireDocumentRange | undefined;
  /** Optional semantic role such as `button` or `callout`. */
  readonly role?: string | undefined;
  /** Optional named part within a semantic widget. */
  readonly part?: string | undefined;
  /** Optional semantic owner that produced or owns this widget. */
  readonly owner?: QuireViewOwner | undefined;
  /** Whether this widget participates in pointer hit testing. */
  readonly pointerEvents: QuireViewPointerEvents;
  /** Optional cursor suggested while this widget is hovered. */
  readonly cursor?: string | undefined;
  /** Optional cursor applied while this widget owns pointer capture. */
  readonly captureCursor?: string | undefined;
  /** Event bindings available on this widget. */
  readonly events: QuireViewEventBindingMap<TContext>;
  /** Current host surface supplied by the owning runtime, if available. */
  readonly host: QuireViewHost | undefined;
  /** Parent widget in the compiled target tree, if available. */
  readonly parent: QuireViewWidget<TContext> | undefined;
  /** Direct child widgets in compiler output order. */
  readonly children: readonly QuireViewWidget<TContext>[];
  /** Ancestor widgets from nearest parent to outermost parent. */
  readonly ancestors: readonly QuireViewWidget<TContext>[];
  /**
   * Checks whether the widget rectangle contains a renderer-space point.
   *
   * @param point - Renderer-space point to test.
   * @returns Whether the point is inside the widget rectangle.
   */
  containsPoint(point: QuirePoint): boolean;
  /**
   * Checks whether the widget range contains a document position.
   *
   * @param position - Document position to test.
   * @returns Whether the position falls inside this widget range.
   */
  containsPosition(position: number): boolean;
  /**
   * Checks whether the widget range overlaps another document range.
   *
   * @param range - Document range to test.
   * @returns Whether the ranges overlap.
   */
  overlapsRange(range: QuireDocumentRange): boolean;
}

/** Result returned when a point hits a widget. */
export interface QuireViewWidgetHit<TContext = unknown> {
  /** Deepest topmost widget hit by the point. */
  readonly widget: QuireViewWidget<TContext>;
  /** Widget ancestry from deepest to outermost. */
  readonly path: readonly QuireViewWidget<TContext>[];
  /** Pointer position used for the hit test. */
  readonly point: QuirePoint;
}

/** Query index built from compiled qkView widgets. */
export interface QuireViewWidgetIndex<TContext = unknown> {
  /** Widget list in compiler output order. */
  readonly widgets: readonly QuireViewWidget<TContext>[];
  /**
   * Finds a widget by id.
   *
   * @param id - Widget id to search.
   * @returns Widget with the requested id, or undefined.
   */
  getById(id: string): QuireViewWidget<TContext> | undefined;
  /**
   * Finds a widget by qkView node path.
   *
   * @param nodePath - Compiled node path to search.
   * @returns Widget with the requested node path, or undefined.
   */
  getByNodePath(nodePath: string): QuireViewWidget<TContext> | undefined;
  /**
   * Finds widgets with a semantic role.
   *
   * @param role - Role to match.
   * @returns Widgets with the requested role in compiler output order.
   */
  getByRole(role: string): readonly QuireViewWidget<TContext>[];
  /**
   * Finds widgets with a semantic part name.
   *
   * @param part - Part name to match.
   * @returns Widgets with the requested part in compiler output order.
   */
  getByPart(part: string): readonly QuireViewWidget<TContext>[];
  /**
   * Finds widgets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Widgets containing the position in compiler output order.
   */
  getByPosition(position: number): readonly QuireViewWidget<TContext>[];
  /**
   * Finds widgets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Widgets overlapping the range in compiler output order.
   */
  getByRange(range: QuireDocumentRange): readonly QuireViewWidget<TContext>[];
  /**
   * Finds the widget ancestry for a widget id or widget object.
   *
   * @param widget - Widget id or widget object.
   * @returns Widget ancestry from deepest to outermost.
   */
  getPath(
    widget: string | QuireViewWidget<TContext>
  ): readonly QuireViewWidget<TContext>[];
  /**
   * Hit-tests one renderer-space point.
   *
   * @param point - Renderer-space pointer position.
   * @returns Hit widget result, or null when no widget is hit.
   */
  hitTest(point: QuirePoint): QuireViewWidgetHit<TContext> | null;
}
