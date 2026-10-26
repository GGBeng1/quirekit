import type { QuireEditor } from "@quirekit/core";
import {
  createQuireBrowserImageResourceDecoder,
  createQuireMountedImageResourceManager,
  type QuireMountedImageResourceManager
} from "../shared";
import { createQuireView, type QuireView } from "../facade";
import {
  createSvgBrowserTextMeasurer,
  type SvgBrowserTextMeasurer
} from "./browser-text-measurer";
import type { SvgMountedViewRuntimeOptions } from "./types";
import type { QuireHiddenTextViewMode } from "@quirekit/view-engine";

/** Runtime copy whose hidden-text mode is owned by the mounted SVG view. */
export type SvgMountedMutableRuntime = Omit<
  SvgMountedViewRuntimeOptions,
  "hiddenTextViewMode"
> & {
  /** Mutable hidden-text presentation policy controlled by the mounted view. */
  hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
};

/** Browser and renderer-neutral resources owned by one mounted SVG view. */
export interface SvgMountedResourceBundle {
  /** Runtime options after browser text measurement has been attached. */
  readonly runtime: SvgMountedMutableRuntime;
  /** Optional browser-backed SVG text measurer. */
  readonly browserTextMeasurer?: SvgBrowserTextMeasurer | undefined;
  /** Shared renderer-neutral view facade used to build render artifacts. */
  readonly view: QuireView;
  /** Mounted image resources and display-list transform. */
  readonly imageResources: QuireMountedImageResourceManager;
}

/** Options used to create mounted SVG resources. */
export interface CreateSvgMountedResourcesOptions {
  /** Editor whose current state should be rendered by the view facade. */
  readonly editor: QuireEditor;
  /** Optional mounted SVG runtime configuration. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
  /** Document that owns browser-only resource probes and decoders. */
  readonly ownerDocument: Document;
  /** Callback invoked when browser font metrics change. */
  readonly onFontSetChange: () => void;
  /** Callback invoked when mounted image resource state changes. */
  readonly onImageStateChange: () => void;
}

/**
 * Creates browser and renderer-neutral resources for one mounted SVG view.
 *
 * @param options - Editor, runtime options, document, and refresh callbacks.
 * @returns Resource bundle owned by the mounted SVG lifecycle.
 */
export function createSvgMountedResources(
  options: CreateSvgMountedResourcesOptions
): SvgMountedResourceBundle {
  const browserTextMeasurer = createSvgMountedBrowserTextMeasurer(
    options.runtime,
    options.ownerDocument,
    options.onFontSetChange
  );
  const runtime = browserTextMeasurer === undefined
    ? { ...options.runtime }
    : {
        ...options.runtime,
        textMeasurer: browserTextMeasurer
      };
  const imageResources = createQuireMountedImageResourceManager({
    ...(runtime?.mediaResolver === undefined
      ? {}
      : { resolver: runtime.mediaResolver }),
    decoder: runtime?.imageDecoder
      ?? createQuireBrowserImageResourceDecoder(options.ownerDocument),
    onStateChange: options.onImageStateChange
  });
  const view = createQuireView({
    editor: options.editor
  });

  return {
    runtime,
    ...(browserTextMeasurer === undefined ? {} : { browserTextMeasurer }),
    view,
    imageResources
  };
}

/**
 * Creates the optional SVG browser-backed text measurer for mounted layout.
 *
 * @param runtime - Mounted SVG runtime options.
 * @param ownerDocument - Document that should own the hidden SVG probe surface.
 * @param onFontSetChange - Callback that requests fresh mounted geometry.
 * @returns Browser text measurer when requested, otherwise undefined.
 */
function createSvgMountedBrowserTextMeasurer(
  runtime: SvgMountedViewRuntimeOptions | undefined,
  ownerDocument: Document,
  onFontSetChange: () => void
): SvgBrowserTextMeasurer | undefined {
  if (runtime?.textMeasurementBackend !== "browser") {
    return undefined;
  }

  return createSvgBrowserTextMeasurer({
    ownerDocument,
    onFontSetChange,
    ...(runtime.textMeasurer === undefined
      ? {}
      : { fallbackMeasurer: runtime.textMeasurer })
  });
}
