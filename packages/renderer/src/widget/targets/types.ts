import type { QuireDocumentRange } from "../../core/document";
import type { QuirePoint } from "../../core/geometry";
import type { QuireViewTarget } from "../events";

/** Result returned when a pointer hits one compiled qkView target. */
export interface QuireViewTargetHit<TContext = unknown> {
  /** Deepest topmost target that accepted the point. */
  readonly target: QuireViewTarget<TContext>;
  /** Target ancestry from deepest to outermost. */
  readonly path: readonly QuireViewTarget<TContext>[];
  /** Pointer position used for the hit test. */
  readonly point: QuirePoint;
}

/** Query index built from one compiled qkView target list. */
export interface QuireViewTargetIndex<TContext = unknown> {
  /** Original target list in compiler output order. */
  readonly targets: readonly QuireViewTarget<TContext>[];
  /**
   * Finds a target by id.
   *
   * @param id - Target id to search.
   * @returns Target with the requested id, or undefined.
   */
  getById(id: string): QuireViewTarget<TContext> | undefined;
  /**
   * Finds a target by qkView node path.
   *
   * @param nodePath - Compiled node path to search.
   * @returns Target with the requested node path, or undefined.
   */
  getByNodePath(nodePath: string): QuireViewTarget<TContext> | undefined;
  /**
   * Finds targets with a semantic role.
   *
   * @param role - Role to match.
   * @returns Targets with the requested role in compiler output order.
   */
  getByRole(role: string): readonly QuireViewTarget<TContext>[];
  /**
   * Finds targets with a semantic part name.
   *
   * @param part - Part name to match.
   * @returns Targets with the requested part in compiler output order.
   */
  getByPart(part: string): readonly QuireViewTarget<TContext>[];
  /**
   * Finds targets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Targets containing the position in compiler output order.
   */
  getByPosition(position: number): readonly QuireViewTarget<TContext>[];
  /**
   * Finds targets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Targets overlapping the range in compiler output order.
   */
  getByRange(range: QuireDocumentRange): readonly QuireViewTarget<TContext>[];
  /**
   * Finds the target ancestry for a target id or target object.
   *
   * @param target - Target id or target object.
   * @returns Target ancestry from deepest to outermost.
   */
  getPath(
    target: string | QuireViewTarget<TContext>
  ): readonly QuireViewTarget<TContext>[];
  /**
   * Hit-tests one renderer-space point.
   *
   * @param point - Renderer-space pointer position.
   * @returns Hit target result, or null when the point misses all pointer targets.
   */
  hitTest(point: QuirePoint): QuireViewTargetHit<TContext> | null;
}
