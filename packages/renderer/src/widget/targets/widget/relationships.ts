import type { QuireViewTarget } from "../../events";
import { getNodePathDepth } from "../node-path";
import type { QuireViewTargetIndex } from "../types";
import type { QuireViewWidget } from "./types";

/**
 * Reads direct child widgets in compiler output order.
 *
 * @param nodePath - Parent widget node path.
 * @param targetIndex - Target index used for compiled target traversal.
 * @param getWidgetByTarget - Stable widget lookup by target object.
 * @returns Direct child widgets.
 */
export function getQuireViewWidgetChildren<TContext>(
  nodePath: string,
  targetIndex: QuireViewTargetIndex<TContext>,
  getWidgetByTarget: (
    target: QuireViewTarget<TContext>
  ) => QuireViewWidget<TContext> | undefined
): readonly QuireViewWidget<TContext>[] {
  const childPrefix = `${nodePath}.`;
  const childDepth = getNodePathDepth(nodePath) + 1;

  return targetIndex.targets
    .filter((target) =>
      target.nodePath.startsWith(childPrefix) &&
      getNodePathDepth(target.nodePath) === childDepth
    )
    .map((target) => targetIndex.getById(target.id))
    .filter((target): target is QuireViewTarget<TContext> => target !== undefined)
    .map((target) => getWidgetByTarget(target))
    .filter((widget): widget is QuireViewWidget<TContext> => widget !== undefined);
}

/**
 * Reads ancestor widgets from nearest parent to outermost parent.
 *
 * @param target - Target whose ancestors should be resolved.
 * @param targetIndex - Target index used for compiled target traversal.
 * @param getWidgetByTarget - Stable widget lookup by target object.
 * @returns Ancestor widgets.
 */
export function getQuireViewWidgetAncestors<TContext>(
  target: QuireViewTarget<TContext>,
  targetIndex: QuireViewTargetIndex<TContext>,
  getWidgetByTarget: (
    target: QuireViewTarget<TContext>
  ) => QuireViewWidget<TContext> | undefined
): readonly QuireViewWidget<TContext>[] {
  return targetIndex
    .getPath(target)
    .slice(1)
    .map((pathTarget) => getWidgetByTarget(pathTarget))
    .filter((widget): widget is QuireViewWidget<TContext> => widget !== undefined);
}
