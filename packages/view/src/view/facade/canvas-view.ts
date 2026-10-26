import type { QuireEditor } from "@quirekit/core";
import {
  buildQuireSelectionInvalidationPlan,
  createQuireViewEngineRuntime,
  type QuireViewEngineRuntime
} from "@quirekit/view-engine";
import type {
  QuireViewBuildOptions,
  QuireViewOptions,
  QuireViewPointerHitTestResult,
  QuireViewPointerSelectionOptions,
  QuireViewRenderOptions,
  QuireViewRenderResult,
  QuireViewSelectionUpdateOptions,
  QuireViewSelectionUpdateResult,
  QuireViewSnapshot
} from "../types";
import {
  renderQuireViewResult,
  renderQuireViewSelectionUpdate
} from "./paint";
import { hitTestQuireViewPointer } from "./pointer";
import { transformQuireViewRenderResultDisplayLists } from "./display-list-transform";
import { traceQuireViewPhase } from "./trace";
import {
  registerQuireViewEngineRuntime
} from "./engine-runtime";
import { resolveCanvasDevicePixelRatio } from "../canvas/device-pixel-ratio";
import { readMountedPresentationOverlay } from "../../mounted-services/presentation-overlay";

/** Lightweight facade for canvas-oriented editor state access. */
export class QuireView {
  private readonly editor: QuireEditor;
  private readonly devicePixelRatio: number;
  private readonly surfaceConfig: QuireViewOptions["surfaceConfig"];

  /** Opaque View Engine authority for accepted and speculative frames. */
  private readonly engineRuntime: QuireViewEngineRuntime;

  /**
   * Creates a canvas view facade.
   *
   * @param options - Canvas view creation options.
   */
  constructor(options: QuireViewOptions) {
    this.editor = options.editor;
    this.devicePixelRatio = resolveCanvasDevicePixelRatio(options.devicePixelRatio);
    this.surfaceConfig = options.surfaceConfig;
    this.engineRuntime = createQuireViewEngineRuntime({ editor: options.editor });
    registerQuireViewEngineRuntime(this, this.engineRuntime);
  }

  /**
   * Captures the current editor state and device pixel ratio.
   *
   * @returns Current canvas view snapshot.
   */
  snapshot(): QuireViewSnapshot {
    return {
      state: this.editor.state,
      devicePixelRatio: this.devicePixelRatio
    };
  }

  /**
   * Runs a one-shot canvas render pass for the current editor state.
   *
   * @param options - Viewport, target, and style inputs for rendering.
   * @returns Intermediate render artifacts produced during the pass.
   */
  render(options: QuireViewRenderOptions): QuireViewRenderResult {
    const renderOptions = this.resolveSurfaceConfig(options);
    const renderResult = traceQuireViewPhase(
      renderOptions.trace,
      "build-render-result",
      () => transformQuireViewRenderResultDisplayLists(
        this.engineRuntime.buildFrame(renderOptions),
        renderOptions
      )
    );

    traceQuireViewPhase(renderOptions.trace, "paint", () => {
      renderQuireViewResult(renderResult, renderOptions);
    });

    return renderResult;
  }

  /**
   * Builds render artifacts for the current editor state without painting.
   *
   * Used by page-stack rendering, which paints the result across per-page surfaces
   * itself instead of to one composite target, so no paint target is required.
   *
   * @param options - Targetless viewport and style inputs for render artifact generation.
   * @returns Intermediate render artifacts for the current editor state.
   */
  buildRenderResult(options: QuireViewBuildOptions): QuireViewRenderResult {
    const renderOptions = this.resolveSurfaceConfig(options);
    return traceQuireViewPhase(
      renderOptions.trace,
      "build-render-result",
      () => transformQuireViewRenderResultDisplayLists(
        this.engineRuntime.buildFrame(renderOptions),
        renderOptions
      )
    );
  }

  /**
   * Builds a non-dispatched layout preview through an isolated retained runtime.
   *
   * Preview products may retain work across pointer frames, but they cannot
   * admit speculative source identities into the accepted view caches.
   *
   * @param options - Targetless build options carrying a transient node patch.
   * @returns Renderer-neutral artifacts for the speculative editor state.
   */
  buildTransientRenderResult(
    options: QuireViewBuildOptions
  ): QuireViewRenderResult {
    const renderOptions = this.resolveSurfaceConfig(options);
    return traceQuireViewPhase(
      renderOptions.trace,
      "build-transient-render-result",
      () => transformQuireViewRenderResultDisplayLists(
        this.engineRuntime.buildTransientFrame(renderOptions),
        renderOptions
      )
    );
  }

  /**
   * Runs a selection-driven invalidated render update for the current state.
   *
   * @param options - Previous render result, viewport, target, and style inputs.
   * @returns Updated render artifacts and the invalidation plan computed for diagnostics.
   */
  renderSelectionUpdate(
    options: QuireViewSelectionUpdateOptions
  ): QuireViewSelectionUpdateResult {
    const renderOptions = this.resolveSurfaceConfig(options);
    const renderResult = traceQuireViewPhase(
      renderOptions.trace,
      "build-render-result",
      () => transformQuireViewRenderResultDisplayLists(
        this.engineRuntime.buildFrame(renderOptions),
        renderOptions
      )
    );
    const invalidationPlan = traceQuireViewPhase(
      renderOptions.trace,
      "selection-invalidation",
      () =>
        buildQuireSelectionInvalidationPlan({
          previousSelectionGeometry: renderOptions.previousRenderResult.selectionGeometry,
          nextSelectionGeometry: renderResult.selectionGeometry
        })
    );

    traceQuireViewPhase(renderOptions.trace, "paint", () => {
      renderQuireViewSelectionUpdate(renderResult, renderOptions);
    });

    return {
      ...renderResult,
      invalidationPlan
    };
  }

  /**
   * Applies view-level surface config and the source view's presentation overlay when a call does not override them.
   *
   * @param options - Render or build options supplied by the caller.
   * @returns Options with view-level frame inputs attached when applicable.
   */
  private resolveSurfaceConfig<
    Options extends QuireViewBuildOptions
      | QuireViewRenderOptions
      | QuireViewSelectionUpdateOptions
  >(options: Options): Options {
    const surfaceConfig = options.surfaceConfig === undefined && this.surfaceConfig !== undefined;
    const overlay = options.presentationOverlay === undefined
      ? readMountedPresentationOverlay(options.decorationSourceView)
      : undefined;
    if (!surfaceConfig && overlay === undefined) return options;

    return {
      ...options,
      ...(surfaceConfig ? { surfaceConfig: this.surfaceConfig } : {}),
      ...(overlay === undefined ? {} : { presentationOverlay: overlay })
    };
  }

  /**
   * Hit-tests a pointer position without mutating editor selection.
   *
   * @param options - Pointer coordinates and retained geometry inputs for hit testing.
   * @returns Pointer hit-test result and retained geometry snapshot.
   */
  hitTestPointer(
    options: QuireViewPointerSelectionOptions
  ): QuireViewPointerHitTestResult {
    return hitTestQuireViewPointer(options);
  }

}
