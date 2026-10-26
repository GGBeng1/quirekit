import type {
  QuireDocumentRange,
  QuirePoint,
  QuireRect,
  QuireViewDispatchResult,
  QuireViewEventName,
  QuireViewHost,
  QuireViewScope,
  QuireViewTarget,
  QuireViewTargetHit,
  QuireViewWidget,
  QuireViewWidgetHit
} from "@quirekit/renderer";
import type { QuireClientPoint, QuireClientRect } from "@quirekit/view-engine";

/** Options used to dispatch one mounted pointer event through qkView targets. */
export interface MountedWidgetPointerEventOptions {
  /** qkView event name to dispatch. */
  readonly type: QuireViewEventName;
  /** Browser pointer identifier used to preserve captured session identity. */
  readonly pointerId: number;
  /** Browser client point that initiated the event. */
  readonly clientPoint: QuireClientPoint;
  /** Mounted surface client rectangle used for coordinate conversion. */
  readonly surfaceClientRect: QuireClientRect;
  /** Exact document-space bounds represented by the mounted surface. */
  readonly surfaceBounds: QuireRect;
  /** Original platform event, if one exists. */
  readonly nativeEvent?: unknown;
}

/** Runtime that owns qkView scope state for one mounted editor view. */
export interface MountedWidgetEventRuntime<TContext = unknown> {
  /** Scope exposed to direct and named qkView event handlers. */
  readonly scope: QuireViewScope<TContext>;
  /**
   * Updates host metadata exposed as `event.host`.
   *
   * @param host - Host metadata, or undefined when detached.
   */
  setHost(host: QuireViewHost | undefined): void;
  /**
   * Replaces the compiled target index for the latest render result.
   *
   * @param targets - qkView targets emitted by the renderer compiler.
   */
  setTargets(targets: readonly QuireViewTarget<TContext>[]): void;
  /**
   * Reads the compiled qkView targets from the latest render result.
   *
   * @returns Targets in compiler output order.
   */
  getTargets(): readonly QuireViewTarget<TContext>[];
  /**
   * Finds a target by id.
   *
   * @param id - Target id to search.
   * @returns Target with the requested id, or undefined.
   */
  getTargetById(id: string): QuireViewTarget<TContext> | undefined;
  /**
   * Finds targets with a semantic role.
   *
   * @param role - Role to search.
   * @returns Targets with the requested role in compiler output order.
   */
  getTargetsByRole(role: string): readonly QuireViewTarget<TContext>[];
  /**
   * Finds targets with a semantic part name.
   *
   * @param part - Part name to search.
   * @returns Targets with the requested part in compiler output order.
   */
  getTargetsByPart(part: string): readonly QuireViewTarget<TContext>[];
  /**
   * Finds targets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Targets containing the position in compiler output order.
   */
  getTargetsByPosition(position: number): readonly QuireViewTarget<TContext>[];
  /**
   * Finds targets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Targets overlapping the range in compiler output order.
   */
  getTargetsByRange(range: QuireDocumentRange): readonly QuireViewTarget<TContext>[];
  /**
   * Hit-tests one renderer-space point against the latest targets.
   *
   * @param point - Renderer-space point to test.
   * @returns Hit target result, or null when no target is hit.
   */
  hitTestPoint(point: QuirePoint): QuireViewTargetHit<TContext> | null;
  /**
   * Reads virtual widget objects for the latest render result.
   *
   * @returns Widgets in compiler output order.
   */
  getWidgets(): readonly QuireViewWidget<TContext>[];
  /**
   * Finds a widget by id.
   *
   * @param id - Widget id to search.
   * @returns Widget with the requested id, or undefined.
   */
  getWidgetById(id: string): QuireViewWidget<TContext> | undefined;
  /**
   * Finds widgets with a semantic role.
   *
   * @param role - Role to search.
   * @returns Widgets with the requested role in compiler output order.
   */
  getWidgetsByRole(role: string): readonly QuireViewWidget<TContext>[];
  /**
   * Finds widgets with a semantic part name.
   *
   * @param part - Part name to search.
   * @returns Widgets with the requested part in compiler output order.
   */
  getWidgetsByPart(part: string): readonly QuireViewWidget<TContext>[];
  /**
   * Finds widgets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Widgets containing the position in compiler output order.
   */
  getWidgetsByPosition(position: number): readonly QuireViewWidget<TContext>[];
  /**
   * Finds widgets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Widgets overlapping the range in compiler output order.
   */
  getWidgetsByRange(range: QuireDocumentRange): readonly QuireViewWidget<TContext>[];
  /**
   * Hit-tests one renderer-space point against the latest widgets.
   *
   * @param point - Renderer-space point to test.
   * @returns Hit widget result, or null when no widget is hit.
   */
  widgetAtPoint(point: QuirePoint): QuireViewWidgetHit<TContext> | null;
  /**
   * Dispatches a pointer event by hit-testing the latest target index.
   *
   * @param options - Pointer event dispatch options.
   * @returns Detailed dispatch result.
   */
  dispatchPointerEvent(options: MountedWidgetPointerEventOptions): QuireViewDispatchResult;
  /**
   * Returns whether this runtime owns a captured session for one pointer.
   *
   * @param pointerId - Browser pointer identifier to query.
   * @returns True when a target path currently owns the pointer.
   */
  hasPointerCapture(pointerId: number): boolean;
  /** Releases scope values and target indexes. */
  destroy(): void;
}
