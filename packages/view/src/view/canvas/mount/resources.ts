import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { createQuireView, type QuireView } from "../../facade";
import {
  createQuireBrowserImageResourceDecoder,
  createQuireMountedImageResourceManager,
  type MountedViewUpdateRevision,
  type QuireMountedImageResourceManager
} from "../../shared";
import { adaptQuireBrowserLayoutWorker } from "../../shared/layout-jobs/worker";
import {
  createCanvasBackgroundShapingRuntime,
  type CanvasBackgroundShapingRuntime
} from "../background-shaping";
import {
  createCanvasBrowserTextMeasurer,
  type CanvasBrowserTextMeasurer
} from "../browser-text-measurer";
import { resolveCanvasDevicePixelRatio } from "../device-pixel-ratio";
import { resolveCanvasMountedTextLayoutConfig } from "../layout-config";
import {
  createCanvasRemainderPaginationRuntime,
  type CanvasRemainderPaginationRuntime
} from "../remainder-pagination";
import type {
  CanvasMountedTextLayoutConfig,
  CanvasMountedViewOptions,
  CanvasMountedViewRuntimeOptions
} from "../types";
import type { QuireHiddenTextViewMode } from "@quirekit/view-engine";

/** Runtime copy whose hidden-text mode is owned by the mounted view. */
export type CanvasMountedMutableRuntime = Omit<
  CanvasMountedViewRuntimeOptions,
  "hiddenTextViewMode"
> & {
  /** View-local hidden-text presentation mode. */
  hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
};

/** Callbacks needed by mounted resource lifetimes. */
export interface CanvasMountedResourceLifecycleCallbacks {
  /** Schedules a document refresh when browser font metrics change. */
  readonly onFontSetChange: () => void;
  /** Schedules a resource-only refresh when image availability changes. */
  readonly onImageStateChange: () => void;
  /** Reads the latest authoritative transaction revision. */
  readonly readCurrentRevision: () => MountedViewUpdateRevision;
}

/** Inputs used to create Canvas mount resources. */
export interface CreateCanvasMountedResourceRuntimeOptions {
  /** Mount options that own editor identity and optional runtime policies. */
  readonly options: CanvasMountedViewOptions;
  /** Document that owns browser-backed measurement and decoding resources. */
  readonly ownerDocument: Document;
  /** View lifecycle callbacks consumed by long-lived browser resources. */
  readonly lifecycle: CanvasMountedResourceLifecycleCallbacks;
}

/** Long-lived resources owned by one mounted Canvas view. */
export interface CanvasMountedResourceRuntime {
  /** Mutable runtime policies copied from mount options. */
  readonly runtime: CanvasMountedMutableRuntime;
  /** Browser text measurer when the embedding did not supply one. */
  readonly browserTextMeasurer: CanvasBrowserTextMeasurer | undefined;
  /** Text measurer consumed by synchronous and background layout. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Resolved Canvas text layout defaults. */
  readonly textLayoutConfig: CanvasMountedTextLayoutConfig;
  /** View facade used to build document products. */
  readonly view: QuireView;
  /** Cooperative background shaping runtime. */
  readonly backgroundShapingRuntime: CanvasBackgroundShapingRuntime;
  /** Cooperative remainder-pagination runtime. */
  readonly remainderPaginationRuntime: CanvasRemainderPaginationRuntime;
  /** Image resource decoder, epoch tracking, and display-list transform. */
  readonly imageResources: QuireMountedImageResourceManager;
}

/**
 * Creates the browser and layout resources whose lifetime matches a Canvas mount.
 *
 * The mount owns teardown and refresh scheduling; this factory only centralizes
 * resource construction so rendering orchestration cannot accidentally recreate
 * retained browser state.
 *
 * @param options - Mount inputs, owner document, and lifecycle callbacks.
 * @returns Long-lived resources for the mounted Canvas view.
 */
export function createCanvasMountedResourceRuntime(
  options: CreateCanvasMountedResourceRuntimeOptions
): CanvasMountedResourceRuntime {
  const providedRuntime = options.options.runtime;
  const usesBrowserTextMeasurer = providedRuntime?.textMeasurer === undefined;
  const browserTextMeasurer = usesBrowserTextMeasurer
    ? createCanvasBrowserTextMeasurer({
        ownerDocument: options.ownerDocument,
        onFontSetChange: options.lifecycle.onFontSetChange
      })
    : undefined;
  const textMeasurer: QuireTextMeasurer = browserTextMeasurer
    ?? (providedRuntime?.textMeasurer as QuireTextMeasurer);
  const runtime: CanvasMountedMutableRuntime = {
    ...providedRuntime,
    ...(browserTextMeasurer === undefined ? {} : { textMeasurer: browserTextMeasurer })
  };
  const imageResources = createQuireMountedImageResourceManager({
    ...(runtime.mediaResolver === undefined
      ? {}
      : { resolver: runtime.mediaResolver }),
    decoder: runtime.imageDecoder
      ?? createQuireBrowserImageResourceDecoder(options.ownerDocument),
    onStateChange: options.lifecycle.onImageStateChange,
    rasterScale: resolveCanvasDevicePixelRatio(runtime.devicePixelRatio, runtime.getDevicePixelRatio)
  });
  const textLayoutConfig = resolveCanvasMountedTextLayoutConfig(runtime);
  const view = createQuireView({
    editor: options.options.editor,
    ...(providedRuntime?.devicePixelRatio === undefined
      ? {}
      : { devicePixelRatio: providedRuntime.devicePixelRatio })
  });
  const layoutWorkerHost = providedRuntime?.layoutWorkerHost;

  return {
    runtime,
    browserTextMeasurer,
    textMeasurer,
    textLayoutConfig,
    view,
    backgroundShapingRuntime: createCanvasBackgroundShapingRuntime({
      editor: options.options.editor,
      view,
      textMeasurer,
      ...(providedRuntime?.lineBreaker === undefined
        ? {}
        : { lineBreaker: providedRuntime.lineBreaker }),
      readCurrentRevision: options.lifecycle.readCurrentRevision,
      runtimeId: `canvas:${options.options.id}`
    }),
    remainderPaginationRuntime: createCanvasRemainderPaginationRuntime({
      editor: options.options.editor,
      view,
      textMeasurer,
      ...(providedRuntime?.lineBreaker === undefined
        ? {}
        : { lineBreaker: providedRuntime.lineBreaker }),
      readCurrentRevision: options.lifecycle.readCurrentRevision,
      runtimeId: `canvas:${options.options.id}`,
      ...(layoutWorkerHost === undefined
        ? {}
        : {
            createWorkerClient: () => adaptQuireBrowserLayoutWorker(
              layoutWorkerHost.createWorker()
            )
          })
    }),
    imageResources
  };
}
