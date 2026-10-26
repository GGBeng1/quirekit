import {
  createQuireViewScope,
  type QuirePoint,
  type QuireViewDispatchResult,
  type QuireViewHost,
  type QuireViewPointerSession,
  type QuireViewScopeOptions
} from "@quirekit/renderer";
import { mapClientPointToQuirePoint } from "@quirekit/view-engine";
import { MountedWidgetEventIndexes } from "./indexes";
import type {
  MountedWidgetEventRuntime,
  MountedWidgetPointerEventOptions
} from "./types";

/**
 * Creates qkView event runtime state for one mounted editor view.
 *
 * @param options - Initial scope options.
 * @returns Mounted widget event runtime.
 */
export function createMountedWidgetEventRuntime<TContext = unknown>(
  options: QuireViewScopeOptions<TContext> = {}
): MountedWidgetEventRuntime<TContext> {
  return new DefaultMountedWidgetEventRuntime(options);
}

/** Mounted qkView event runtime backed by a scope and target index. */
class DefaultMountedWidgetEventRuntime<TContext>
  extends MountedWidgetEventIndexes<TContext>
  implements MountedWidgetEventRuntime<TContext>
{
  /** Captured target sessions keyed by browser pointer id. */
  private readonly pointerCaptures = new Map<number, MountedWidgetPointerCapture<TContext>>();

  /**
   * Creates one mounted widget event runtime.
   *
   * @param options - Initial scope options.
   */
  constructor(options: QuireViewScopeOptions<TContext>) {
    super(createQuireViewScope(options));
  }

  /**
   * Updates host metadata exposed as `event.host`.
   *
   * @param host - Host metadata, or undefined when detached.
   */
  setHost(host: QuireViewHost | undefined): void {
    this.scope.setHost(host);
  }

  /**
   * Dispatches a pointer event by hit-testing the latest target index.
   *
   * @param options - Pointer event dispatch options.
   * @returns Detailed dispatch result.
   */
  dispatchPointerEvent(options: MountedWidgetPointerEventOptions): QuireViewDispatchResult {
    const point = mapClientPointToQuirePoint({
      clientPoint: options.clientPoint,
      canvasClientRect: options.surfaceClientRect,
      surfaceBounds: options.surfaceBounds
    });
    const capture = this.pointerCaptures.get(options.pointerId);
    const hit = capture === undefined ? this.hitTestPoint(point) : undefined;
    const target = capture?.target ?? hit?.target;
    const path = capture?.path ?? hit?.path;

    if (target === undefined || path === undefined) {
      return emptyMountedWidgetDispatchResult;
    }

    const pointerSession = createPointerSession(options, point, capture);
    const result = this.scope.dispatchViewEventResult({
      type: options.type,
      target,
      path,
      point,
      ...(pointerSession === undefined ? {} : { pointerSession }),
      clientPoint: {
        x: options.clientPoint.clientX,
        y: options.clientPoint.clientY
      },
      nativeEvent: options.nativeEvent
    });

    // Capture is established only by an explicit pointer-down request. The mounted
    // runtime then keeps semantic target identity stable while coordinates continue
    // to update in renderer space.
    if (
      capture === undefined
      && options.type === "pointerDown"
      && result.pointerCaptureRequested
    ) {
      this.pointerCaptures.set(options.pointerId, {
        target,
        path,
        startPoint: point,
        previousPoint: point
      });
    } else if (capture !== undefined) {
      if (options.type === "pointerUp" || options.type === "pointerCancel") {
        this.pointerCaptures.delete(options.pointerId);
      } else if (options.type === "pointerMove") {
        capture.previousPoint = point;
      }
    }

    return result;
  }

  /**
   * Returns whether one browser pointer is owned by a captured target path.
   *
   * @param pointerId - Browser pointer identifier to query.
   * @returns True when a captured session is active.
   */
  hasPointerCapture(pointerId: number): boolean {
    return this.pointerCaptures.has(pointerId);
  }

  /** Releases scope values and target indexes. */
  destroy(): void {
    this.pointerCaptures.clear();
    this.scope.destroy();
    this.clearIndexes();
  }
}

/** Empty dispatch result used when pointer hit testing misses every qkView target. */
const emptyMountedWidgetDispatchResult: QuireViewDispatchResult = {
  handled: false,
  defaultPrevented: false,
  pointerCaptureRequested: false
};

/** Captured semantic target and geometry facts retained by one pointer session. */
interface MountedWidgetPointerCapture<TContext> {
  /** Original target selected by pointer-down hit testing. */
  readonly target: NonNullable<ReturnType<MountedWidgetEventRuntime<TContext>["hitTestPoint"]>>["target"];
  /** Original target ancestry from deepest to outermost. */
  readonly path: NonNullable<ReturnType<MountedWidgetEventRuntime<TContext>["hitTestPoint"]>>["path"];
  /** Renderer-space point where capture began. */
  readonly startPoint: QuirePoint;
  /** Renderer-space point dispatched immediately before the current event. */
  previousPoint: QuirePoint;
}

/**
 * Creates session facts for a pointer-down or an already captured pointer.
 *
 * @param options - Mounted pointer dispatch options.
 * @param point - Current renderer-space point.
 * @param capture - Existing captured target state, if any.
 * @returns Pointer-session facts, or undefined for uncaptured non-start events.
 */
function createPointerSession<TContext>(
  options: MountedWidgetPointerEventOptions,
  point: QuirePoint,
  capture: MountedWidgetPointerCapture<TContext> | undefined
): QuireViewPointerSession | undefined {
  if (capture === undefined && options.type !== "pointerDown") {
    return undefined;
  }

  const startPoint = capture?.startPoint ?? point;
  const previousPoint = capture?.previousPoint ?? point;

  return {
    pointerId: options.pointerId,
    phase: resolvePointerSessionPhase(options.type),
    startPoint,
    previousPoint,
    point,
    delta: {
      x: point.x - startPoint.x,
      y: point.y - startPoint.y
    }
  };
}

/**
 * Resolves a mounted event name into a captured-session lifecycle phase.
 *
 * @param type - qkView event name.
 * @returns Captured pointer-session phase.
 */
function resolvePointerSessionPhase(
  type: MountedWidgetPointerEventOptions["type"]
): QuireViewPointerSession["phase"] {
  if (type === "pointerUp") {
    return "end";
  }

  if (type === "pointerCancel") {
    return "cancel";
  }

  return type === "pointerDown" ? "start" : "update";
}
