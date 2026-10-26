import type { Node as PMNode } from "@quirekit/pm";
import type { QuireMountedEditorView } from "../types";

/** PM pointer click prop names supported by mounted views. */
type MountedPointerClickProp =
  | "handleClick"
  | "handleDoubleClick"
  | "handleTripleClick";

/** PM pointer click-on prop names supported by mounted views. */
type MountedPointerClickOnProp =
  | "handleClickOn"
  | "handleDoubleClickOn"
  | "handleTripleClickOn";

/** PM click prop handler shape accepted by mounted view bridges. */
type MountedPointerClickHandler = (
  view: QuireMountedEditorView,
  pos: number,
  event: MouseEvent
) => boolean | void;

/** PM click-on prop handler shape accepted by mounted view bridges. */
type MountedPointerClickOnHandler = (
  view: QuireMountedEditorView,
  pos: number,
  node: PMNode,
  nodePos: number,
  event: MouseEvent,
  direct: boolean
) => boolean | void;

/**
 * Dispatches PM-style click props for a mounted pointer event.
 *
 * @param view - Mounted view receiving the pointer event.
 * @param pos - Hit-tested document position.
 * @param inside - Start position of the nearest inner document node.
 * @param event - Browser pointer event that initiated the click.
 * @param clickCount - Normalized click count from the mounted click tracker.
 * @returns Whether a plugin handled the click.
 */
export function dispatchMountedPointerClickProps(
  view: QuireMountedEditorView,
  pos: number,
  inside: number,
  event: PointerEvent,
  clickCount: number
): boolean {
  const propName = resolveMountedPointerClickProp(clickCount);
  const onPropName = resolveMountedPointerClickOnProp(clickCount);

  return (
    dispatchMountedPointerClickOnProps(view, pos, inside, event, onPropName) ||
    dispatchMountedPointerClickProp(view, pos, event, propName)
  );
}

/**
 * Dispatches one PM-style whole-editor click prop.
 *
 * @param view - Mounted view receiving the pointer event.
 * @param pos - Hit-tested document position.
 * @param event - Browser pointer event that initiated the click.
 * @param propName - PM click prop to dispatch.
 * @returns Whether a plugin handled the click.
 */
function dispatchMountedPointerClickProp(
  view: QuireMountedEditorView,
  pos: number,
  event: PointerEvent,
  propName: MountedPointerClickProp
): boolean {
  return (
    view.someProp(propName, (handler) =>
      typeof handler === "function" &&
      (handler as MountedPointerClickHandler)(view, pos, event) === true
    ) === true
  );
}

/**
 * Dispatches PM-style node-context click props from inside out.
 *
 * @param view - Mounted view receiving the pointer event.
 * @param pos - Hit-tested document position.
 * @param inside - Start position of the nearest inner document node.
 * @param event - Browser pointer event that initiated the click.
 * @param propName - PM click-on prop to dispatch.
 * @returns Whether a plugin handled the click.
 */
function dispatchMountedPointerClickOnProps(
  view: QuireMountedEditorView,
  pos: number,
  inside: number,
  event: PointerEvent,
  propName: MountedPointerClickOnProp
): boolean {
  if (inside < 0) {
    return false;
  }

  const $pos = view.state.doc.resolve(inside);

  for (let depth = $pos.depth + 1; depth > 0; depth -= 1) {
    const node = depth > $pos.depth ? $pos.nodeAfter : $pos.node(depth);

    if (!node) {
      continue;
    }

    const nodePos = $pos.before(depth);
    const direct = depth > $pos.depth;
    const handled = view.someProp(propName, (handler) =>
      typeof handler === "function" &&
      (handler as MountedPointerClickOnHandler)(
        view,
        pos,
        node,
        nodePos,
        event,
        direct
      ) === true
    );

    if (handled === true) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves the PM click prop for a normalized click count.
 *
 * @param clickCount - Normalized click count from the mounted click tracker.
 * @returns PM click prop name.
 */
function resolveMountedPointerClickProp(
  clickCount: number
): MountedPointerClickProp {
  if (clickCount >= 3) {
    return "handleTripleClick";
  }

  if (clickCount === 2) {
    return "handleDoubleClick";
  }

  return "handleClick";
}

/**
 * Resolves the PM click-on prop for a normalized click count.
 *
 * @param clickCount - Normalized click count from the mounted click tracker.
 * @returns PM click-on prop name.
 */
function resolveMountedPointerClickOnProp(
  clickCount: number
): MountedPointerClickOnProp {
  if (clickCount >= 3) {
    return "handleTripleClickOn";
  }

  if (clickCount === 2) {
    return "handleDoubleClickOn";
  }

  return "handleClickOn";
}
