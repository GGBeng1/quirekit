import {
  type QuireDocumentRange,
  type QuirePoint,
  createQuireViewTargetIndex,
  createQuireViewWidgetIndex,
  type QuireViewScope,
  type QuireViewTarget,
  type QuireViewTargetHit,
  type QuireViewTargetIndex,
  type QuireViewWidget,
  type QuireViewWidgetHit,
  type QuireViewWidgetIndex
} from "@quirekit/renderer";

/** Queryable target and widget indexes owned by one mounted widget runtime. */
export class MountedWidgetEventIndexes<TContext> {
  /** Scope exposed to direct and named qkView event handlers. */
  readonly scope: QuireViewScope<TContext>;
  /** Latest compiled target index. */
  private targetIndex: QuireViewTargetIndex<TContext> | undefined;
  /** Latest virtual widget index. */
  private widgetIndex: QuireViewWidgetIndex<TContext> | undefined;

  /**
   * Creates queryable indexes for one qkView scope.
   *
   * @param scope - Scope whose host provider backs virtual widgets.
   */
  constructor(scope: QuireViewScope<TContext>) {
    this.scope = scope;
  }

  /**
   * Replaces the compiled target index for the latest render result.
   *
   * @param targets - qkView targets emitted by the renderer compiler.
   */
  setTargets(targets: readonly QuireViewTarget<TContext>[]): void {
    this.targetIndex = createQuireViewTargetIndex(targets);
    this.widgetIndex = createQuireViewWidgetIndex(targets, {
      getHost: () => this.scope.getHost()
    });
  }

  /**
   * Reads the compiled qkView targets from the latest render result.
   *
   * @returns Targets in compiler output order.
   */
  getTargets(): readonly QuireViewTarget<TContext>[] {
    return this.targetIndex?.targets ?? [];
  }

  /**
   * Finds a target by id.
   *
   * @param id - Target id to search.
   * @returns Target with the requested id, or undefined.
   */
  getTargetById(id: string): QuireViewTarget<TContext> | undefined {
    return this.targetIndex?.getById(id);
  }

  /**
   * Finds targets with a semantic role.
   *
   * @param role - Role to search.
   * @returns Targets with the requested role in compiler output order.
   */
  getTargetsByRole(role: string): readonly QuireViewTarget<TContext>[] {
    return this.targetIndex?.getByRole(role) ?? [];
  }

  /**
   * Finds targets with a semantic part name.
   *
   * @param part - Part name to search.
   * @returns Targets with the requested part in compiler output order.
   */
  getTargetsByPart(part: string): readonly QuireViewTarget<TContext>[] {
    return this.targetIndex?.getByPart(part) ?? [];
  }

  /**
   * Finds targets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Targets containing the position in compiler output order.
   */
  getTargetsByPosition(position: number): readonly QuireViewTarget<TContext>[] {
    return this.targetIndex?.getByPosition(position) ?? [];
  }

  /**
   * Finds targets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Targets overlapping the range in compiler output order.
   */
  getTargetsByRange(range: QuireDocumentRange): readonly QuireViewTarget<TContext>[] {
    return this.targetIndex?.getByRange(range) ?? [];
  }

  /**
   * Hit-tests one renderer-space point against the latest targets.
   *
   * @param point - Renderer-space point to test.
   * @returns Hit target result, or null when no target is hit.
   */
  hitTestPoint(point: QuirePoint): QuireViewTargetHit<TContext> | null {
    return this.targetIndex?.hitTest(point) ?? null;
  }

  /**
   * Reads virtual widget objects for the latest render result.
   *
   * @returns Widgets in compiler output order.
   */
  getWidgets(): readonly QuireViewWidget<TContext>[] {
    return this.widgetIndex?.widgets ?? [];
  }

  /**
   * Finds a widget by id.
   *
   * @param id - Widget id to search.
   * @returns Widget with the requested id, or undefined.
   */
  getWidgetById(id: string): QuireViewWidget<TContext> | undefined {
    return this.widgetIndex?.getById(id);
  }

  /**
   * Finds widgets with a semantic role.
   *
   * @param role - Role to search.
   * @returns Widgets with the requested role in compiler output order.
   */
  getWidgetsByRole(role: string): readonly QuireViewWidget<TContext>[] {
    return this.widgetIndex?.getByRole(role) ?? [];
  }

  /**
   * Finds widgets with a semantic part name.
   *
   * @param part - Part name to search.
   * @returns Widgets with the requested part in compiler output order.
   */
  getWidgetsByPart(part: string): readonly QuireViewWidget<TContext>[] {
    return this.widgetIndex?.getByPart(part) ?? [];
  }

  /**
   * Finds widgets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Widgets containing the position in compiler output order.
   */
  getWidgetsByPosition(position: number): readonly QuireViewWidget<TContext>[] {
    return this.widgetIndex?.getByPosition(position) ?? [];
  }

  /**
   * Finds widgets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Widgets overlapping the range in compiler output order.
   */
  getWidgetsByRange(range: QuireDocumentRange): readonly QuireViewWidget<TContext>[] {
    return this.widgetIndex?.getByRange(range) ?? [];
  }

  /**
   * Hit-tests one renderer-space point against the latest widgets.
   *
   * @param point - Renderer-space point to test.
   * @returns Hit widget result, or null when no widget is hit.
   */
  widgetAtPoint(point: QuirePoint): QuireViewWidgetHit<TContext> | null {
    return this.widgetIndex?.hitTest(point) ?? null;
  }

  /** Clears target and widget indexes. */
  clearIndexes(): void {
    this.targetIndex = undefined;
    this.widgetIndex = undefined;
  }
}
