import type { QuireClientPoint } from "@quirekit/view-engine";
import type {
  CreateMountedPointerDragFrameCoordinatorOptions,
  MountedPointerDragFrameCoordinator,
  MountedPointerDragFrameCounters
} from "./types";

/** Mutable counters owned by one active-drag frame coordinator. */
interface MutableMountedPointerDragFrameCounters {
  /** Number of client points received. */
  receivedPoints: number;
  /** Number of pending points replaced before application. */
  coalescedPoints: number;
  /** Number of points applied through current geometry. */
  appliedPoints: number;
  /** Number of pending points applied by an explicit flush. */
  flushedPoints: number;
}

/** Cancelable animation-frame scheduler used by active pointer drags. */
interface MountedPointerDragFrameScheduler {
  /**
   * Requests one callback.
   *
   * @param callback - Callback to run on the next frame.
   * @returns Cancelable frame handle, or undefined when a non-browser host
   * applies the callback synchronously.
   */
  readonly request: (callback: FrameRequestCallback) => number | undefined;
  /**
   * Cancels one callback.
   *
   * @param handle - Frame handle to cancel.
   */
  readonly cancel: (handle: number) => void;
}

/**
 * Creates the renderer-neutral active pointer-drag frame coordinator.
 *
 * Native pointer events can arrive faster than layout hit testing and PM
 * transaction dispatch can complete. The coordinator therefore retains only
 * the latest client point per animation frame while preserving a synchronous
 * completion flush for the final pointerup coordinate.
 *
 * @param options - Root, point application hook, and optional frame scheduler.
 * @returns Cancelable latest-point coordinator with diagnostic counters.
 */
export function createMountedPointerDragFrameCoordinator(
  options: CreateMountedPointerDragFrameCoordinatorOptions
): MountedPointerDragFrameCoordinator {
  const scheduler = resolveMountedPointerDragFrameScheduler(options);
  const counters: MutableMountedPointerDragFrameCounters = {
    receivedPoints: 0,
    coalescedPoints: 0,
    appliedPoints: 0,
    flushedPoints: 0
  };
  let pendingPoint: QuireClientPoint | undefined;
  let lastAppliedPoint: QuireClientPoint | undefined;
  let pendingFrame: number | undefined;

  /** Applies and clears the latest pending point. */
  const applyPendingPoint = (): boolean => {
    if (pendingPoint === undefined) {
      return false;
    }

    const point = pendingPoint;
    pendingPoint = undefined;
    lastAppliedPoint = point;
    counters.appliedPoints += 1;
    options.applyPoint(point);
    return true;
  };

  /** Cancels the scheduled callback while preserving any pending point. */
  const cancelPendingFrame = (): void => {
    if (pendingFrame === undefined) {
      return;
    }

    scheduler.cancel(pendingFrame);
    pendingFrame = undefined;
  };

  return {
    update(clientPoint, geometryChanged = false): void {
      counters.receivedPoints += 1;
      if (
        !geometryChanged && pendingPoint === undefined
        && lastAppliedPoint !== undefined
        && isSameClientPoint(lastAppliedPoint, clientPoint)
      ) {
        counters.coalescedPoints += 1;
        return;
      }

      if (pendingPoint !== undefined) {
        counters.coalescedPoints += 1;
      }

      // Copy the primitive coordinates instead of retaining a pooled native
      // event whose fields may no longer describe the drag at frame time.
      pendingPoint = {
        clientX: clientPoint.clientX,
        clientY: clientPoint.clientY
      };

      if (pendingFrame !== undefined) {
        return;
      }

      pendingFrame = scheduler.request(() => {
        pendingFrame = undefined;
        applyPendingPoint();
      });
    },
    flush(): boolean {
      if (pendingPoint === undefined) {
        return false;
      }

      cancelPendingFrame();
      counters.flushedPoints += 1;
      return applyPendingPoint();
    },
    cancel(): void {
      cancelPendingFrame();
      pendingPoint = undefined;
      lastAppliedPoint = undefined;
    },
    readCounters(): MountedPointerDragFrameCounters {
      return { ...counters };
    }
  };
}

/**
 * Compares two client-space points without retaining native event identity.
 *
 * @param left - Previously applied client point.
 * @param right - Incoming client point.
 * @returns Whether both primitive coordinates are equal.
 */
function isSameClientPoint(
  left: QuireClientPoint,
  right: QuireClientPoint
): boolean {
  return left.clientX === right.clientX && left.clientY === right.clientY;
}

/**
 * Resolves injected or owner-window frame scheduling as one cancelable pair.
 *
 * @param options - Coordinator options carrying host scheduler hooks.
 * @returns Frame request and cancellation functions.
 */
function resolveMountedPointerDragFrameScheduler(
  options: CreateMountedPointerDragFrameCoordinatorOptions
): MountedPointerDragFrameScheduler {
  if (options.requestFrame !== undefined && options.cancelFrame !== undefined) {
    return {
      request: options.requestFrame,
      cancel: options.cancelFrame
    };
  }

  const ownerWindow = options.root.ownerDocument.defaultView;
  if (
    ownerWindow !== null
    && ownerWindow !== undefined
    && typeof ownerWindow.requestAnimationFrame === "function"
    && typeof ownerWindow.cancelAnimationFrame === "function"
  ) {
    return {
      request: (callback) => ownerWindow.requestAnimationFrame(callback),
      cancel: (handle) => ownerWindow.cancelAnimationFrame(handle)
    };
  }

  // Headless mounts and SSR-like hosts have no native pointer frame authority.
  // Preserve their deterministic synchronous contract instead of inventing an
  // unrelated timer queue that production browser sessions never use.
  return {
    request: (callback) => {
      callback(Date.now());
      return undefined;
    },
    cancel: () => {}
  };
}
