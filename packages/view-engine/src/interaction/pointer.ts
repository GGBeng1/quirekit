import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutSnapshot } from "../editor-layout";
import {
  createIdentitySurfaceBounds,
  resolveViewCoordinateAuthority
} from "./coordinate-authority";
import {
  createQuireInteractionCoordinatePathDiagnostics,
  withQuireInteractionDiagnostics
} from "./diagnostics";
import type { QuireInteractionCoordinatePathDiagnostics } from "./diagnostics";
import {
  createQuireInteractionGeometryAuthority,
  mapQuireInteractionNearestCaretAtPointToHitTestResult
} from "./geometry";
import type {
  QuireClientPointMappingOptions,
  QuireHitTestResult,
  QuirePointerClickEvent,
  QuirePointerClickState,
  QuirePointerClickTracker,
  QuirePointerClickTrackerOptions,
  QuirePointerHitTestOptions
} from "./types";

/** Point and diagnostics produced by one client-to-document coordinate query. */
interface QuirePointerDocumentPointMapping {
  /** Document-space point produced by the coordinate authority. */
  readonly point: QuirePoint;
  /** Diagnostics describing the coordinate path used for this point. */
  readonly diagnostics: QuireInteractionCoordinatePathDiagnostics;
}

const defaultPointerClickIntervalMs = 500;
const defaultPointerClickDistancePx = 6;

/** Default canvas pointer click tracker implementation. */
class DefaultCanvasPointerClickTracker implements QuirePointerClickTracker {
  private readonly intervalMs: number;
  private readonly distancePx: number;
  private clickState: QuirePointerClickState | null = null;

  /**
   * Creates a canvas pointer click tracker.
   *
   * @param options - Optional timing and distance thresholds.
   */
  constructor(options: QuirePointerClickTrackerOptions = {}) {
    this.intervalMs = options.intervalMs ?? defaultPointerClickIntervalMs;
    this.distancePx = options.distancePx ?? defaultPointerClickDistancePx;
  }

  /**
   * Resolves a stable click count for a browser pointer click event.
   *
   * @param event - Pointer event shape containing client coordinates and timing.
   * @returns Normalized click count for the active click series.
   */
  resolveClickCount(event: QuirePointerClickEvent): number {
    if ((event.detail ?? 0) > 1) {
      return this.setClickState(event, event.detail ?? 1);
    }

    if (!this.clickState || !this.isContinuousClick(event)) {
      return this.setClickState(event, 1);
    }

    return this.setClickState(event, Math.min(this.clickState.count + 1, 3));
  }

  /**
   * Reads the latest click series metadata.
   *
   * @returns Current click series state, or null before the first click.
   */
  snapshot(): QuirePointerClickState | null {
    return this.clickState;
  }

  /** Clears the current click series state. */
  reset(): void {
    this.clickState = null;
  }

  /**
   * Checks whether a pointer event continues the current click series.
   *
   * @param event - Pointer event shape containing client coordinates and timing.
   * @returns Whether the event belongs to the current click series.
   */
  private isContinuousClick(event: QuirePointerClickEvent): boolean {
    if (!this.clickState) {
      return false;
    }

    return (
      event.timeStamp - this.clickState.timeStamp <= this.intervalMs &&
      measureQuireClientPointDistance(event, this.clickState.clientPoint) <= this.distancePx
    );
  }

  /**
   * Stores click series state and returns the assigned count.
   *
   * @param event - Pointer event shape containing client coordinates and timing.
   * @param count - Normalized click count to store.
   * @returns Stored click count.
   */
  private setClickState(event: QuirePointerClickEvent, count: number): number {
    this.clickState = {
      timeStamp: event.timeStamp,
      clientPoint: { clientX: event.clientX, clientY: event.clientY },
      count
    };

    return count;
  }
}

/**
 * Converts browser client coordinates into canvas CSS-pixel coordinates.
 *
 * @param options - Client point and canvas client rectangle used for mapping.
 * @returns Canvas point relative to the canvas element origin.
 */
export function mapClientPointToQuirePoint(
  options: QuireClientPointMappingOptions
): QuirePoint {
  return mapClientPointToQuirePointWithDiagnostics(options).point;
}

/**
 * Converts browser client coordinates and captures the coordinate path.
 *
 * @param options - Client point and surface projection used for mapping.
 * @returns Document point plus coordinate-path diagnostics.
 */
function mapClientPointToQuirePointWithDiagnostics(
  options: QuireClientPointMappingOptions
): QuirePointerDocumentPointMapping {
  const surfaceBounds =
    options.surfaceBounds ?? createIdentitySurfaceBounds(options.canvasClientRect);
  const authority = resolveViewCoordinateAuthority(
    options.canvasClientRect,
    surfaceBounds
  );
  const mapping = authority.clientToDocumentPoint({
    left: options.clientPoint.clientX,
    top: options.clientPoint.clientY
  });
  const point = {
    x: mapping.to.x,
    y: mapping.to.y
  };

  return {
    point,
    diagnostics: createQuireInteractionCoordinatePathDiagnostics({
      path: mapping.path,
      clientPoint: {
        clientX: options.clientPoint.clientX,
        clientY: options.clientPoint.clientY
      },
      surfaceClientRect: {
        left: options.canvasClientRect.left,
        top: options.canvasClientRect.top,
        width: options.canvasClientRect.width,
        height: options.canvasClientRect.height
      },
      surfaceBounds,
      documentPoint: point
    })
  };
}

/**
 * Hit-tests a document-space point and clamps blanks to the nearest caret.
 *
 * Programmatic callers use this to obtain the same hit a pointer would produce
 * at a point they already know in document coordinates.
 *
 * @param snapshot - Layout snapshot owning retained geometry.
 * @param point - Document-space point.
 * @returns Nearest-caret hit-test result.
 */
export function hitTestQuireDocumentPointNearestCaret(
  snapshot: QuireLayoutSnapshot,
  point: QuirePoint
): QuireHitTestResult {
  return mapQuireInteractionNearestCaretAtPointToHitTestResult(
    createQuireInteractionGeometryAuthority({ snapshot }).nearestCaret(point)
  );
}

/**
 * Hit-tests a browser pointer point and clamps document blanks to the nearest caret.
 *
 * @param options - Layout snapshot, client point, and canvas client rectangle.
 * @returns Nearest-caret hit-test result for the converted canvas point.
 */
export function hitTestQuirePointerNearestCaret(
  options: QuirePointerHitTestOptions
): QuireHitTestResult {
  const mapping = mapClientPointToQuirePointWithDiagnostics(options);
  const geometryAuthority = createQuireInteractionGeometryAuthority({
    snapshot: options.snapshot
  });

  return withQuireInteractionDiagnostics(
    mapQuireInteractionNearestCaretAtPointToHitTestResult(
      geometryAuthority.nearestCaret(mapping.point)
    ),
    { coordinatePath: mapping.diagnostics }
  );
}

/**
 * Creates a pointer click tracker for double-click and triple-click selection.
 *
 * @param options - Optional timing and distance thresholds.
 * @returns Stateful pointer click tracker.
 */
export function createQuirePointerClickTracker(
  options?: QuirePointerClickTrackerOptions
): QuirePointerClickTracker {
  return new DefaultCanvasPointerClickTracker(options);
}

/**
 * Measures the CSS-pixel distance between two client points.
 *
 * @param first - First client point.
 * @param second - Second client point.
 * @returns Euclidean distance in CSS pixels.
 */
export function measureQuireClientPointDistance(
  first: QuireClientPointMappingOptions["clientPoint"],
  second: QuireClientPointMappingOptions["clientPoint"]
): number {
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}
