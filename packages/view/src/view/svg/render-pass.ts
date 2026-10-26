import type { QuireView } from "../facade";
import type {
  QuireViewBuildOptions,
  QuireViewRenderResult
} from "../types";
import { createMountedFrameBuildOptions } from "../shared/render-result/build-options/runtime";
import { withMountedRenderResultBounds } from "../shared/render-result/bounds";
import type { SvgMountedView, SvgMountedViewRuntimeOptions } from "./types";
import type { SvgMountedRenderSurfaceState } from "./surface";

/** Options used to build one mounted SVG render pass result. */
export interface RunSvgMountedRenderPassOptions extends Omit<QuireViewBuildOptions, "viewportRect"> {
  /** Shared render facade that owns backend-neutral caches. */
  readonly view: QuireView;
  /** Mounted SVG view used as decoration and widget source. */
  readonly decorationSourceView: SvgMountedView;
  /** Prepared SVG surface state for this render pass. */
  readonly surfaceState: SvgMountedRenderSurfaceState;
  /** Optional runtime display and measurement inputs. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
}

/**
 * Builds renderer-neutral render artifacts for a mounted SVG view.
 *
 * @param options - Editor, mounted view, surface state, IME preedit, and runtime inputs.
 * @returns Render result consumed by SVG content and overlay synchronization.
 */
export function runSvgMountedRenderPass(
  options: RunSvgMountedRenderPassOptions
): QuireViewRenderResult {
  const { view, surfaceState, runtime, ...inputs } = options;
  const buildOptions = createMountedFrameBuildOptions({
    ...inputs,
    viewportRect: surfaceState.viewportRect
  }, runtime);
  const renderResult = options.transientNodeLayoutPatch === undefined
    ? view.buildRenderResult(buildOptions)
    : view.buildTransientRenderResult(buildOptions);

  return withMountedRenderResultBounds(renderResult, surfaceState.surfaceBounds);
}
