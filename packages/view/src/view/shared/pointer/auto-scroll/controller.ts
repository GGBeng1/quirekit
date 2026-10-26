import type { QuireClientPoint, QuireClientRect } from "@quirekit/view-engine";
import { findScrollableAncestor } from "../../viewport";
import { getMountedViewScrollInsetSide } from "../../scroll";
import { resolveMountedPointerAutoScrollAxisDelta } from "./delta";
import type {
  CreateMountedPointerAutoScrollControllerOptions,
  MountedPointerAutoScrollController
} from "./types";
import type { AncestorScroller } from "../../viewport";

/**
 * Resolves the visible client rectangle owned by a scroll ancestor.
 *
 * @param root - Mounted root used to identify its owner window.
 * @param scroller - Element or window controlling the visible scrollport.
 * @returns Scrollport rectangle in client coordinates.
 */
function resolveScrollerClientRect(
  root: HTMLElement,
  scroller: AncestorScroller
): QuireClientRect {
  const win = root.ownerDocument.defaultView;

  if (win && scroller === win) {
    return {
      left: 0,
      top: 0,
      width: Number.isFinite(win.innerWidth) ? win.innerWidth : 0,
      height: Number.isFinite(win.innerHeight) ? win.innerHeight : 0
    };
  }

  return (scroller as HTMLElement).getBoundingClientRect();
}

/**
 * Reads the current scroll offset without coupling the controller to one host.
 *
 * @param root - Mounted root used to identify its owner window.
 * @param scroller - Element or window controlling the visible scrollport.
 * @returns Current horizontal and vertical scroll offsets.
 */
function readScrollerOffset(
  root: HTMLElement,
  scroller: AncestorScroller
): Readonly<{ x: number; y: number }> {
  const win = root.ownerDocument.defaultView;

  if (win && scroller === win) {
    return { x: win.scrollX ?? 0, y: win.scrollY ?? 0 };
  }

  const element = scroller as HTMLElement;
  return { x: element.scrollLeft, y: element.scrollTop };
}

/**
 * Applies one signed scroll step to an element or window ancestor.
 *
 * @param root - Mounted root used to identify its owner window.
 * @param scroller - Element or window controlling the visible scrollport.
 * @param deltaX - Horizontal CSS-pixel scroll step.
 * @param deltaY - Vertical CSS-pixel scroll step.
 */
function scrollAncestorBy(
  root: HTMLElement,
  scroller: AncestorScroller,
  deltaX: number,
  deltaY: number
): void {
  const win = root.ownerDocument.defaultView;

  if (win && scroller === win) {
    if (typeof win.scrollBy === "function") {
      win.scrollBy(deltaX, deltaY);
    }
    return;
  }

  const element = scroller as HTMLElement;
  element.scrollLeft += deltaX;
  element.scrollTop += deltaY;
}

/**
 * Creates continuous edge scrolling for the active mounted text-range drag.
 *
 * The controller owns only viewport movement. Its callback returns authority to
 * the pointer session, which re-hit-tests the retained target against the latest
 * render products after every successful scroll step.
 *
 * @param options - Mounted root, post-scroll callback, and optional test hooks.
 * @returns Controller scoped to one mounted pointer-session lifecycle.
 */
export function createMountedPointerAutoScrollController(
  options: CreateMountedPointerAutoScrollControllerOptions
): MountedPointerAutoScrollController {
  const win = options.root.ownerDocument.defaultView;
  const requestFrame = options.requestFrame ?? (
    typeof win?.requestAnimationFrame === "function"
      ? win.requestAnimationFrame.bind(win)
      : typeof win?.setTimeout === "function"
        ? (callback: FrameRequestCallback): number =>
            win.setTimeout(() => callback(Date.now()), 16)
        : (_callback: FrameRequestCallback): number => 0
  );
  const cancelFrame = options.cancelFrame ?? (
    typeof win?.cancelAnimationFrame === "function"
      ? win.cancelAnimationFrame.bind(win)
      : typeof win?.clearTimeout === "function"
        ? win.clearTimeout.bind(win)
        : (_frameId: number): void => {}
  );
  const resolveScroller = options.resolveScroller ?? (
    (): AncestorScroller | undefined => findScrollableAncestor(options.root)
  );
  let clientPoint: QuireClientPoint | null = null;
  let frameId: number | null = null;
  let awaitsPostScrollRealization = false;

  /**
   * Scrolls toward the retained target and re-enters the pointer hit-test path.
   *
   * @param _timestamp - Animation-frame timestamp, unused by velocity mapping.
   */
  function runFrame(_timestamp: number): void {
    frameId = null;
    const point = clientPoint;
    const scroller = point ? resolveScroller() : undefined;

    if (!point || !scroller) {
      return;
    }

    // A scroll frame first changes the scrollport. Re-enter pointer hit testing
    // only on the following frame, after scroll observers have had a chance to
    // realize the new mounted-page set and publish current render products.
    if (awaitsPostScrollRealization) {
      awaitsPostScrollRealization = false;
      options.onScrollFrame(point);
    }

    const rect = resolveScrollerClientRect(options.root, scroller);
    const deltaX = resolveMountedPointerAutoScrollAxisDelta(
      point.clientX,
      rect.left,
      rect.width,
      getMountedViewScrollInsetSide(options.edgeThreshold, "left"),
      getMountedViewScrollInsetSide(options.edgeThreshold, "right")
    );
    const deltaY = resolveMountedPointerAutoScrollAxisDelta(
      point.clientY,
      rect.top,
      rect.height,
      getMountedViewScrollInsetSide(options.edgeThreshold, "top"),
      getMountedViewScrollInsetSide(options.edgeThreshold, "bottom")
    );

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    const before = readScrollerOffset(options.root, scroller);
    scrollAncestorBy(options.root, scroller, deltaX, deltaY);
    const after = readScrollerOffset(options.root, scroller);

    if (before.x === after.x && before.y === after.y) {
      return;
    }

    awaitsPostScrollRealization = true;
    schedule();
  }

  /** Schedules the next frame exactly once. */
  function schedule(): void {
    if (frameId !== null || !clientPoint) {
      return;
    }
    frameId = requestFrame(runFrame);
  }

  return {
    /** @inheritdoc */
    update(nextClientPoint): void {
      clientPoint = {
        clientX: nextClientPoint.clientX,
        clientY: nextClientPoint.clientY
      };
      schedule();
    },
    /** @inheritdoc */
    stop(): void {
      clientPoint = null;
      awaitsPostScrollRealization = false;
      if (frameId === null) {
        return;
      }
      cancelFrame(frameId);
      frameId = null;
    }
  };
}
