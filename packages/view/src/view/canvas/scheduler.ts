import type {
  CanvasViewRenderScheduleOptions,
  CanvasViewRenderStrategy,
  CanvasViewRenderStrategyOptions,
  CanvasViewScheduledRenderResult
} from "./types";

/**
 * Chooses the safest Canvas 2D render strategy for one update reason.
 *
 * @param options - Update reason and optional previous render artifacts.
 * @returns Render strategy to use for the next paint pass.
 */
export function resolveCanvasViewRenderStrategy(
  options: CanvasViewRenderStrategyOptions
): CanvasViewRenderStrategy {
  if (options.reason === "selection" && options.previousRenderResult) {
    return "selection-update";
  }

  return "full";
}

/**
 * Runs a Canvas 2D render pass through the strategy resolver.
 *
 * @param options - Canvas renderer, render inputs, update reason, and previous artifacts.
 * @returns Scheduled render result with the selected strategy.
 */
export function runCanvasViewRenderSchedule(
  options: CanvasViewRenderScheduleOptions
): CanvasViewScheduledRenderResult {
  const previousRenderResult = options.previousRenderResult;
  const strategy = resolveCanvasViewRenderStrategy(options);

  if (strategy === "selection-update" && previousRenderResult) {
    const selectionUpdateResult = options.view.renderSelectionUpdate({
      ...options.renderOptions,
      previousRenderResult
    });

    return {
      strategy,
      renderResult: selectionUpdateResult,
      selectionUpdateResult
    };
  }

  return {
    strategy,
    renderResult: options.view.render(options.renderOptions)
  };
}
