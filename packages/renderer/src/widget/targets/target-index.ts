import type { QuireDocumentRange } from "../../core/document";
import type { QuirePoint } from "../../core/geometry";
import type { QuireViewTarget } from "../events";
import { findHitTarget } from "./hit-test";
import { resolveNodePathAncestors } from "./node-path";
import { containsDocumentPosition, rangesOverlap } from "./range";
import type {
  QuireViewTargetHit,
  QuireViewTargetIndex
} from "./types";

/**
 * Creates a query index from compiled qkView targets.
 *
 * @param targets - Targets emitted by the widget compiler.
 * @returns Query index for hit testing and semantic lookup.
 */
export function createQuireViewTargetIndex<TContext = unknown>(
  targets: readonly QuireViewTarget<TContext>[]
): QuireViewTargetIndex<TContext> {
  return new DefaultQuireViewTargetIndex(targets);
}

/** Query index backed by small maps and stable compiler order arrays. */
class DefaultQuireViewTargetIndex<TContext> implements QuireViewTargetIndex<TContext> {
  /** Original target list in compiler output order. */
  readonly targets: readonly QuireViewTarget<TContext>[];
  /** Target lookup by id. */
  private readonly idTargets = new Map<string, QuireViewTarget<TContext>>();
  /** Target lookup by qkView node path. */
  private readonly pathTargets = new Map<string, QuireViewTarget<TContext>>();

  /**
   * Creates a target index.
   *
   * @param targets - Targets emitted by the widget compiler.
   */
  constructor(targets: readonly QuireViewTarget<TContext>[]) {
    this.targets = [...targets];

    for (const target of this.targets) {
      this.idTargets.set(target.id, target);
      this.pathTargets.set(target.nodePath, target);
    }
  }

  /**
   * Finds a target by id.
   *
   * @param id - Target id to search.
   * @returns Target with the requested id, or undefined.
   */
  getById(id: string): QuireViewTarget<TContext> | undefined {
    return this.idTargets.get(id);
  }

  /**
   * Finds a target by qkView node path.
   *
   * @param nodePath - Compiled node path to search.
   * @returns Target with the requested node path, or undefined.
   */
  getByNodePath(nodePath: string): QuireViewTarget<TContext> | undefined {
    return this.pathTargets.get(nodePath);
  }

  /**
   * Finds targets with a semantic role.
   *
   * @param role - Role to match.
   * @returns Targets with the requested role in compiler output order.
   */
  getByRole(role: string): readonly QuireViewTarget<TContext>[] {
    return this.targets.filter((target) => target.role === role);
  }

  /**
   * Finds targets with a semantic part name.
   *
   * @param part - Part name to match.
   * @returns Targets with the requested part in compiler output order.
   */
  getByPart(part: string): readonly QuireViewTarget<TContext>[] {
    return this.targets.filter((target) => target.part === part);
  }

  /**
   * Finds targets whose document range contains a position.
   *
   * @param position - Document position to search.
   * @returns Targets containing the position in compiler output order.
   */
  getByPosition(position: number): readonly QuireViewTarget<TContext>[] {
    return this.targets.filter((target) =>
      target.range === undefined ? false : containsDocumentPosition(target.range, position)
    );
  }

  /**
   * Finds targets whose document range overlaps another range.
   *
   * @param range - Document range to search.
   * @returns Targets overlapping the range in compiler output order.
   */
  getByRange(range: QuireDocumentRange): readonly QuireViewTarget<TContext>[] {
    return this.targets.filter((target) =>
      target.range === undefined ? false : rangesOverlap(target.range, range)
    );
  }

  /**
   * Finds the target ancestry for a target id or target object.
   *
   * @param target - Target id or target object.
   * @returns Target ancestry from deepest to outermost.
   */
  getPath(
    target: string | QuireViewTarget<TContext>
  ): readonly QuireViewTarget<TContext>[] {
    const resolved = typeof target === "string" ? this.getById(target) : target;

    if (resolved === undefined) {
      return [];
    }

    const [, ...ancestorPaths] = resolveNodePathAncestors(resolved.nodePath);

    // The hit target object is the deepest-path authority. Re-reading that same
    // path through the convenience map could substitute a later malformed
    // sibling that reused the path and dispatch the wrong semantic payload.
    return [
      resolved,
      ...ancestorPaths
        .map((nodePath) => this.pathTargets.get(nodePath))
        .filter((ancestor): ancestor is QuireViewTarget<TContext> => ancestor !== undefined)
    ];
  }

  /**
   * Hit-tests one renderer-space point.
   *
   * @param point - Renderer-space pointer position.
   * @returns Hit target result, or null when the point misses all pointer targets.
   */
  hitTest(point: QuirePoint): QuireViewTargetHit<TContext> | null {
    const target = findHitTarget(this.targets, point);

    if (target === undefined) {
      return null;
    }

    return {
      target,
      path: this.getPath(target),
      point
    };
  }
}
