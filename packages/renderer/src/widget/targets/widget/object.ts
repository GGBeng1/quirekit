import type { QuireDocumentRange } from "../../../core/document";
import {
  containsQuireTargetPoint,
  type QuirePoint
} from "../../../core/geometry";
import type { QuireViewHost, QuireViewTarget } from "../../events";
import type { QuireViewTargetIndex } from "../types";
import {
  getQuireViewWidgetAncestors,
  getQuireViewWidgetChildren
} from "./relationships";
import type { QuireViewWidget } from "./types";

/** Runtime widget object backed by one compiled target. */
export class DefaultQuireViewWidget<TContext>
  implements QuireViewWidget<TContext>
{
  /** Compiled target backing this widget. */
  readonly target: QuireViewTarget<TContext>;
  readonly id: QuireViewTarget<TContext>["id"];
  readonly nodePath: QuireViewTarget<TContext>["nodePath"];
  readonly rect: QuireViewTarget<TContext>["rect"];
  readonly hitArea: QuireViewTarget<TContext>["hitArea"];
  readonly range: QuireViewTarget<TContext>["range"];
  readonly role: QuireViewTarget<TContext>["role"];
  readonly part: QuireViewTarget<TContext>["part"];
  readonly owner: QuireViewTarget<TContext>["owner"];
  readonly pointerEvents: QuireViewTarget<TContext>["pointerEvents"];
  readonly cursor: QuireViewTarget<TContext>["cursor"];
  readonly captureCursor: QuireViewTarget<TContext>["captureCursor"];
  readonly events: QuireViewTarget<TContext>["events"];
  /** Target index getter used for ancestry lookup. */
  private readonly getTargetIndex: () => QuireViewTargetIndex<TContext>;
  /** Widget lookup used to keep parent and child object identities stable. */
  private readonly getWidgetByTarget: (
    target: QuireViewTarget<TContext>
  ) => QuireViewWidget<TContext> | undefined;
  /** Host getter supplied by the runtime. */
  private readonly getHost: (() => QuireViewHost | undefined) | undefined;

  /**
   * Creates one widget object.
   *
   * @param target - Compiled target backing the widget.
   * @param getTargetIndex - Target index getter used for ancestry lookup.
   * @param getWidgetByTarget - Widget lookup for stable relationship objects.
   * @param getHost - Optional host getter supplied by the runtime.
   */
  constructor(
    target: QuireViewTarget<TContext>,
    getTargetIndex: () => QuireViewTargetIndex<TContext>,
    getWidgetByTarget: (
      target: QuireViewTarget<TContext>
    ) => QuireViewWidget<TContext> | undefined,
    getHost: (() => QuireViewHost | undefined) | undefined
  ) {
    this.target = target;
    this.id = target.id;
    this.nodePath = target.nodePath;
    this.rect = target.rect;
    this.hitArea = target.hitArea;
    this.range = target.range;
    this.role = target.role;
    this.part = target.part;
    this.owner = target.owner;
    this.pointerEvents = target.pointerEvents;
    this.cursor = target.cursor;
    this.captureCursor = target.captureCursor;
    this.events = target.events;
    this.getTargetIndex = getTargetIndex;
    this.getWidgetByTarget = getWidgetByTarget;
    this.getHost = getHost;
  }

  /**
   * Reads target ancestry from this widget to the outermost target.
   *
   * @returns Target path suitable for view-scope event dispatch.
   */
  get targetPath(): readonly QuireViewTarget<TContext>[] {
    return this.getTargetIndex().getPath(this.target);
  }

  /**
   * Reads the current host surface supplied by the owning runtime.
   *
   * @returns Current host surface, or undefined.
   */
  get host(): QuireViewHost | undefined {
    return this.getHost?.();
  }

  /**
   * Reads the parent widget in the compiled target tree.
   *
   * @returns Parent widget, or undefined.
   */
  get parent(): QuireViewWidget<TContext> | undefined {
    return this.ancestors[0];
  }

  /**
   * Reads direct child widgets in compiler output order.
   *
   * @returns Direct child widgets.
   */
  get children(): readonly QuireViewWidget<TContext>[] {
    return getQuireViewWidgetChildren(
      this.nodePath,
      this.getTargetIndex(),
      this.getWidgetByTarget
    );
  }

  /**
   * Reads ancestor widgets from nearest parent to outermost parent.
   *
   * @returns Ancestor widgets.
   */
  get ancestors(): readonly QuireViewWidget<TContext>[] {
    return getQuireViewWidgetAncestors(
      this.target,
      this.getTargetIndex(),
      this.getWidgetByTarget
    );
  }

  /**
   * Checks whether the widget rectangle contains a renderer-space point.
   *
   * @param point - Renderer-space point to test.
   * @returns Whether the point is inside the widget rectangle.
   */
  containsPoint(point: QuirePoint): boolean {
    return containsQuireTargetPoint(this.rect, this.hitArea, point);
  }

  /**
   * Checks whether the widget range contains a document position.
   *
   * @param position - Document position to test.
   * @returns Whether the position falls inside this widget range.
   */
  containsPosition(position: number): boolean {
    return this.range === undefined
      ? false
      : position >= this.range.from && position <= this.range.to;
  }

  /**
   * Checks whether the widget range overlaps another document range.
   *
   * @param range - Document range to test.
   * @returns Whether the ranges overlap.
   */
  overlapsRange(range: QuireDocumentRange): boolean {
    return this.range === undefined
      ? false
      : this.range.from <= range.to && range.from <= this.range.to;
  }
}
