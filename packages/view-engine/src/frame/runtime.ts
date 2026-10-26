import { confirmQuireLayoutProductFrame } from "../editor-layout/snapshot/reuse/cache";
import type { QuireEditor } from "@quirekit/core";
import { createQuirePaginationCheckpointStore } from "@quirekit/layout/pagination";
import { createQuireDisplayCommandCache } from "../display-list";
import {
  createQuireBlockShapeCache,
  createQuireMeasuredSourceCache,
  createQuireRetainedBlockLayoutGraph
} from "../layout";
import { buildQuireViewEngineFrame } from "./build";
import type {
  CreateQuireViewEngineRuntimeOptions,
  QuireViewEngineFrameCacheAuthority,
  QuireViewEngineFrameBuildOptions,
  QuireViewEngineFrame,
  QuireViewEngineRuntime
} from "./types";

/** Runtime-private accepted and transient cache lanes. */
interface QuireViewEngineRuntimeState {
  /** Editor whose immutable states key both lanes. */
  readonly editor: QuireEditor;
  /** Caches admitted by committed frames and accepted accelerators. */
  readonly accepted: QuireViewEngineFrameCacheAuthority;
  /** Isolated caches used by non-dispatched preview frames. */
  readonly transient: QuireViewEngineFrameCacheAuthority;
}

const stateByRuntime = new WeakMap<QuireViewEngineRuntime, QuireViewEngineRuntimeState>();

/**
 * Creates one editor-scoped View Engine frame runtime.
 *
 * @param options - Editor source authority.
 * @returns Opaque runtime with isolated accepted and transient cache lanes.
 */
export function createQuireViewEngineRuntime(
  options: CreateQuireViewEngineRuntimeOptions
): QuireViewEngineRuntime {
  const state: QuireViewEngineRuntimeState = {
    editor: options.editor,
    accepted: createCacheAuthority(),
    transient: createCacheAuthority()
  };
  const runtime: QuireViewEngineRuntime = {
    buildFrame: (frameOptions) => buildCommittedFrame(
      state.editor,
      frameOptions,
      state.accepted
    ),
    buildTransientFrame: (frameOptions) => buildCommittedFrame(
      state.editor,
      frameOptions,
      state.transient
    )
  };
  stateByRuntime.set(runtime, state);
  return runtime;
}

/**
 * Executes one internal accelerator compilation against accepted cache authority.
 *
 * Mounted consumers receive no cache fields on the runtime itself. This narrow
 * callback exists only so accepted background work can warm the same engine
 * authority before the next frame.
 *
 * @param runtime - Opaque Engine runtime.
 * @param callback - Internal cache-aware accelerator compilation.
 * @returns Callback result.
 */
export function withQuireViewEngineAcceptedCacheAuthority<Result>(
  runtime: QuireViewEngineRuntime,
  callback: (caches: QuireViewEngineFrameCacheAuthority) => Result
): Result {
  const state = stateByRuntime.get(runtime);
  if (state === undefined) {
    throw new Error("Unknown Quire View Engine runtime.");
  }
  return callback(state.accepted);
}

/** @returns Fresh cache authority for one runtime lane. */
function createCacheAuthority(): QuireViewEngineFrameCacheAuthority {
  return {
    blockShapeCache: createQuireBlockShapeCache(),
    retainedBlockGraph: createQuireRetainedBlockLayoutGraph(),
    measuredSourceCache: createQuireMeasuredSourceCache(),
    paginationCheckpointStore: createQuirePaginationCheckpointStore(),
    displayCommandCache: createQuireDisplayCommandCache()
  };
}

/**
 * Confirms geometry only after every frame phase returns successfully.
 *
 * @param editor - Editor owning the exact committed or speculative source.
 * @param options - Complete current frame inputs.
 * @param caches - Accepted or transient lane used by this invocation.
 * @returns Fully built frame; failures never publish pending geometry.
 */
function buildCommittedFrame(
  editor: QuireEditor,
  options: QuireViewEngineFrameBuildOptions,
  caches: QuireViewEngineFrameCacheAuthority
): QuireViewEngineFrame {
  const frame = buildQuireViewEngineFrame(editor, options, caches);
  confirmQuireLayoutProductFrame(frame.layoutSnapshot);
  return frame;
}
