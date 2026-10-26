import type { QuireEditor, QuireEditorState } from "@quirekit/core";
import { buildQuireLayoutSnapshot } from "../editor-layout";
import type { QuireLayoutSnapshotOptions, QuireRetainedLayoutSnapshot } from "../editor-layout";
import { canReuseQuireLayoutProductSnapshot } from "../editor-layout/snapshot/reuse/cache";
import { resolveQuireViewEngineFrameState } from "./state";
import type {
  CanReuseQuireViewEngineLayoutSnapshotOptions,
  QuireViewEngineFrameBuildOptions,
  QuireViewEngineFrameCacheAuthority
} from "./types";

/**
 * Builds geometry from the same state and configuration used by every frame phase.
 *
 * @param editor - Editor providing committed source authority.
 * @param options - Renderer-neutral frame inputs.
 * @param caches - Runtime-owned accepted or transient cache authority.
 * @returns Current-state snapshot with canonical geometry built or reused.
 */
export function buildQuireViewEngineLayoutSnapshot(
  editor: QuireEditor,
  options: QuireViewEngineFrameBuildOptions,
  caches: QuireViewEngineFrameCacheAuthority
): QuireRetainedLayoutSnapshot {
  return buildQuireLayoutSnapshot({
    ...createLayoutOptions(resolveQuireViewEngineFrameState(editor.state, options), options),
    editor,
    ...caches
  }, caches.retainedBlockGraph);
}

/**
 * Proves a mounted snapshot against current frame configuration and state.
 *
 * @param input - Accepted snapshot and exact current frame inputs.
 * @returns Whether current geometry may bypass another adaptation.
 */
export function canReuseQuireViewEngineLayoutSnapshot(
  input: CanReuseQuireViewEngineLayoutSnapshotOptions
): boolean {
  return canReuseQuireLayoutProductSnapshot(
    input.snapshot,
    createLayoutOptions(input.state, input.options),
    input.requireSelectionIndependentGeometry === true
  );
}

/**
 * Normalizes the frame-only names once for compilation and reuse admission.
 *
 * @param state - Exact committed or speculative frame state.
 * @param options - Current frame inputs, never the previous request object.
 * @returns Complete layout configuration with explicit frame-only translations.
 */
function createLayoutOptions(
  state: QuireEditorState,
  options: QuireViewEngineFrameBuildOptions
): QuireLayoutSnapshotOptions {
  return {
    ...options,
    state,
    font: options.displayListStyles?.font,
    textBaselineOffset: options.displayListStyles?.textBaselineOffset,
    snapshotClipRects: options.layoutSnapshotClipRects,
    transientPreview: options.imePreedit !== undefined
      || options.transientNodeLayoutPatch !== undefined
      || options.presentationOverlay !== undefined
  };
}
