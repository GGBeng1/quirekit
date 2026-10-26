import type {
  QuireViewBuildOptions,
  QuireViewMeasuredPhase,
  QuireViewRenderOptions,
  QuireViewRenderResult
} from "../types";
import { createMountedFrameBuildOptions } from "../shared/render-result/build-options/runtime";
import type { QuireMountedEditorView } from "../shared";
import type { QuireView } from "../facade";
import { runCanvasViewRenderSchedule } from "./scheduler";
import { createQuireViewTraceSink } from "../facade/trace";
import type {
  CanvasMountedViewRuntimeOptions,
  CanvasViewRenderScheduleReason,
  CanvasViewScheduledRenderResult
} from "./types";
import type {
  CanvasMountedContentSurfaceState,
  CanvasMountedSurfaceMetrics
} from "./surface";

/** Options used to run one mounted canvas render pass. */
export interface RunCanvasMountedRenderPassOptions extends CreateCanvasMountedRenderOptionsInput {
  /** Canvas view facade that executes layout and paint. */
  readonly view: QuireView;
  /** Why the render pass was requested. */
  readonly reason: CanvasViewRenderScheduleReason;
  /** Previous render result when incremental rendering can be considered. */
  readonly previousRenderResult?: QuireViewRenderResult | undefined;
}

/**
 * Runs a scheduled mounted canvas render pass.
 *
 * @param options - Canvas view, surface state, runtime inputs, and render reason.
 * @returns Scheduled render result and selected strategy.
 */
export function runCanvasMountedRenderPass(
  options: RunCanvasMountedRenderPassOptions
): CanvasViewScheduledRenderResult {
  const phases: QuireViewMeasuredPhase[] = [];
  const { view, reason, previousRenderResult, ...inputs } = options;
  const scheduledRender = runCanvasViewRenderSchedule({
    view,
    reason,
    previousRenderResult,
    renderOptions: createCanvasMountedRenderOptions({
      ...inputs,
      trace: createQuireViewTraceSink(phases)
    })
  });

  return {
    ...scheduledRender,
    phases
  };
}

/** Inputs for assembling targetless mounted canvas build options. */
export interface CreateCanvasMountedBuildOptionsInput extends Omit<QuireViewBuildOptions, "viewportRect"> {
  /** Surface geometry providing the viewport rectangle. */
  readonly metrics: CanvasMountedSurfaceMetrics;
  /** Mounted view used as decoration geometry source. */
  readonly decorationSourceView: QuireMountedEditorView;
  /** Optional mounted runtime inputs. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
}

/**
 * Assembles the targetless canvas build options shared by the single-surface
 * pass and the page-stack build, so both derive identical layout and runtime
 * inputs from one place. The single-surface pass adds the paint targets on top.
 *
 * @param input - Surface metrics, decoration source, composition, and runtime.
 * @returns Targetless canvas view build options.
 */
export function createCanvasMountedBuildOptions(
  input: CreateCanvasMountedBuildOptionsInput
): QuireViewBuildOptions {
  const { metrics, runtime, ...inputs } = input;
  return createMountedFrameBuildOptions({
    ...inputs,
    viewportRect: metrics.viewportRect
  }, runtime);
}

/** Inputs for assembling single-surface mounted canvas render options. */
export interface CreateCanvasMountedRenderOptionsInput extends Omit<CreateCanvasMountedBuildOptionsInput, "metrics"> {
  /** Prepared single-surface state with a content paint target. */
  readonly surfaceState: CanvasMountedContentSurfaceState;
}

/**
 * Assembles single-surface canvas render options by adding the content and
 * overlay paint targets plus paint bounds onto the shared build options.
 *
 * @param input - Surface state, decoration source, composition, and runtime.
 * @returns Canvas view render options.
 */
export function createCanvasMountedRenderOptions(
  input: CreateCanvasMountedRenderOptionsInput
): QuireViewRenderOptions {
  const { surfaceState, ...inputs } = input;
  return {
    ...createCanvasMountedBuildOptions({ ...inputs, metrics: surfaceState }),
    glyphRunPainter: input.runtime?.glyphRunPainter,
    paintBounds: input.surfaceState.surfaceBounds,
    target: input.surfaceState.contentTarget,
    ...(input.surfaceState.overlayTarget === undefined
      ? {}
      : { overlayTarget: input.surfaceState.overlayTarget })
  };
}
