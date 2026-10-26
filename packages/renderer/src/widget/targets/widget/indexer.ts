import type { QuireDocumentRange } from "../../../core/document";
import type { QuirePoint } from "../../../core/geometry";
import type { QuireViewTarget } from "../../events";
import { createQuireViewTargetIndex } from "../target-index";
import type { QuireViewTargetIndex } from "../types";
import { DefaultQuireViewWidget } from "./object";
import type {
  QuireViewWidget,
  QuireViewWidgetHit,
  QuireViewWidgetIndex,
  QuireViewWidgetIndexOptions
} from "./types";

/**
 * Creates virtual widget objects from compiled qkView targets.
 *
 * @param targets - Targets emitted by the widget compiler.
 * @param options - Optional host getter for runtime-backed widgets.
 * @returns Query index for virtual widget objects.
 */
export function createQuireViewWidgetIndex<TContext = unknown>(
  targets: readonly QuireViewTarget<TContext>[],
  options: QuireViewWidgetIndexOptions = {}
): QuireViewWidgetIndex<TContext> {
  return new DefaultQuireViewWidgetIndex(targets, options);
}

/** Widget query index backed by a target index and widget lookup maps. */
class DefaultQuireViewWidgetIndex<TContext>
  implements QuireViewWidgetIndex<TContext>
{
  /** Widget list in compiler output order. */
  readonly widgets: readonly QuireViewWidget<TContext>[];
  /** Existing target index reused for target-space queries. */
  private readonly targetIndex: QuireViewTargetIndex<TContext>;
  /** Widget lookup by target id. */
  private readonly idWidgets = new Map<string, DefaultQuireViewWidget<TContext>>();
  /** Widget lookup by qkView node path. */
  private readonly pathWidgets = new Map<string, DefaultQuireViewWidget<TContext>>();

  /**
   * Creates one widget query index.
   *
   * @param targets - Targets emitted by the widget compiler.
   * @param options - Optional widget index options.
   */
  constructor(
    targets: readonly QuireViewTarget<TContext>[],
    options: QuireViewWidgetIndexOptions
  ) {
    this.targetIndex = createQuireViewTargetIndex(targets);
    const getWidgetByTarget = (target: QuireViewTarget<TContext>) =>
      this.idWidgets.get(target.id);
    const widgets = this.targetIndex.targets.map((target) =>
      new DefaultQuireViewWidget(
        target,
        () => this.targetIndex,
        getWidgetByTarget,
        options.getHost
      )
    );

    for (const widget of widgets) {
      this.idWidgets.set(widget.id, widget);
      this.pathWidgets.set(widget.nodePath, widget);
    }

    this.widgets = widgets;
  }

  /**
   * Finds a widget by id.
   *
   * @param id - Widget id to search.
   * @returns Widget with the requested id, or undefined.
   */
  getById(id: string): QuireViewWidget<TContext> | undefined {
    return this.idWidgets.get(id);
  }

  /**
   * Finds a widget by qkView node path.
   *
   * @param nodePath - Compiled node path to search.
   * @returns Widget with the requested node path, or undefined.
   */
  getByNodePath(nodePath: string): QuireViewWidget<TContext> | undefined {
    return this.pathWidgets.get(nodePath);
  }

  /**
   * Finds widgets with a semantic role.
   *
   * @param role - Role to match.
   * @returns Widgets with the requested role in compiler output order.
   */
  getByRole(role: string): readonly QuireViewWidget<TContext>[] {
    return this.targetIndex
      .getByRole(role)
      .map((target) => this.idWidgets.get(target.id))
      .filter(isDefinedWidget);
  }

  /**
   * Finds widgets with a semantic part name.
   *
   * @param part - Part name to match.
   * @returns Widgets with the requested part in compiler output order.
   */
  getByPart(part: string): readonly QuireViewWidget<TContext>[] {
    return this.targetIndex
      .getByPart(part)
      .map((target) => this.idWidgets.get(target.id))
      .filter(isDefinedWidget);
  }

  /**
   * Finds widgets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Widgets containing the position in compiler output order.
   */
  getByPosition(position: number): readonly QuireViewWidget<TContext>[] {
    return this.targetIndex
      .getByPosition(position)
      .map((target) => this.idWidgets.get(target.id))
      .filter(isDefinedWidget);
  }

  /**
   * Finds widgets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Widgets overlapping the range in compiler output order.
   */
  getByRange(range: QuireDocumentRange): readonly QuireViewWidget<TContext>[] {
    return this.targetIndex
      .getByRange(range)
      .map((target) => this.idWidgets.get(target.id))
      .filter(isDefinedWidget);
  }

  /**
   * Finds the widget ancestry for a widget id or widget object.
   *
   * @param widget - Widget id or widget object.
   * @returns Widget ancestry from deepest to outermost.
   */
  getPath(
    widget: string | QuireViewWidget<TContext>
  ): readonly QuireViewWidget<TContext>[] {
    const target = typeof widget === "string" ? this.targetIndex.getById(widget) : widget.target;

    if (target === undefined) {
      return [];
    }

    return this.targetIndex
      .getPath(target)
      .map((pathTarget) => this.idWidgets.get(pathTarget.id))
      .filter(isDefinedWidget);
  }

  /**
   * Hit-tests one renderer-space point.
   *
   * @param point - Renderer-space pointer position.
   * @returns Hit widget result, or null when no widget is hit.
   */
  hitTest(point: QuirePoint): QuireViewWidgetHit<TContext> | null {
    const hit = this.targetIndex.hitTest(point);

    if (hit === null) {
      return null;
    }

    const widget = this.idWidgets.get(hit.target.id);

    if (widget === undefined) {
      return null;
    }

    return {
      widget,
      path: this.getPath(widget),
      point
    };
  }
}

/**
 * Narrows an optional widget.
 *
 * @param widget - Optional widget value.
 * @returns Whether the widget is defined.
 */
function isDefinedWidget<TContext>(
  widget: DefaultQuireViewWidget<TContext> | undefined
): widget is DefaultQuireViewWidget<TContext> {
  return widget !== undefined;
}
