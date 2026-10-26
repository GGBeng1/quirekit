import { withQuireViewEngineAcceptedCacheAuthority } from "@quirekit/view-engine";
import { requireQuireViewEngineRuntime } from "../../facade/engine-runtime";
import {
  createQuireLayoutJobCoordinator,
  createQuireMainThreadLayoutJobExecutor,
  QUIRE_LAYOUT_JOB_PROTOCOL_VERSION
} from "../../shared";
import {
  compileQuireEditorBackgroundShaping,
  createQuireBackgroundShapingJobHandler
} from "../../shared/layout-jobs/background-shaping";
import type { QuireBackgroundShapingCapabilitySnapshot } from "../../shared/layout-jobs/background-shaping";
import type {
  CanvasBackgroundShapingRequest,
  CanvasBackgroundShapingRuntime,
  CanvasBackgroundShapingRuntimeOptions
} from "./types";

/**
 * Creates Canvas orchestration for pure background text shaping.
 *
 * @param options - Mounted editor, retained view, local capabilities, and revision reader.
 * @returns Background shaping lifecycle used by cooperative page-stack fill.
 */
export function createCanvasBackgroundShapingRuntime(
  options: CanvasBackgroundShapingRuntimeOptions
): CanvasBackgroundShapingRuntime {
  const engineRuntime = requireQuireViewEngineRuntime(options.view);
  const capabilities = createLocalCapabilities(options);
  const executor = createQuireMainThreadLayoutJobExecutor({
    "background-shaping": createQuireBackgroundShapingJobHandler({
      capabilities,
      textMeasurer: options.textMeasurer,
      ...(options.lineBreaker === undefined
        ? {}
        : { lineBreaker: options.lineBreaker })
    })
  });
  const coordinator = createQuireLayoutJobCoordinator({
    executor,
    readCurrentRevision: options.readCurrentRevision
  });
  let nextJobSequence = 1;

  return {
    async shape(request: CanvasBackgroundShapingRequest) {
      const compilation = withQuireViewEngineAcceptedCacheAuthority(
        engineRuntime,
        (caches) => compileQuireEditorBackgroundShaping({
          editor: options.editor,
          fromIndex: request.fromIndex,
          toIndex: request.toIndex,
          capabilities,
          width: request.width,
          font: request.font,
          applyDocumentFontTheme: request.applyDocumentFontTheme ?? false,
          lineHeight: request.lineHeight,
          textBaselineOffset: request.textBaselineOffset,
          lineBreakMode: request.lineBreakMode,
          cache: caches.blockShapeCache
        })
      );
      if (compilation.batch.payload.blocks.length === 0) {
        return {
          accepted: true,
          attachedBlockCount: 0,
          cachedBlockCount: compilation.cachedBlockCount,
          gaps: compilation.gaps
        };
      }

      const jobId = `${options.runtimeId}:background-shaping:${nextJobSequence}`;
      nextJobSequence += 1;
      const outcome = await coordinator.submit({
        protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
        jobId,
        supersessionScope: `${options.runtimeId}:background-shaping`,
        kind: "background-shaping",
        stateVersion: request.revision.stateVersion,
        layoutEpoch: request.revision.layoutEpoch,
        dirtyRange: null,
        window: {
          kind: "blocks",
          fromIndex: request.fromIndex,
          toIndex: request.toIndex
        },
        cacheHints: {
          retainedBlockKeys: [],
          paginationCheckpointKeys: [],
          tableProductKeys: []
        },
        payload: compilation.batch.payload
      });
      if (!outcome.accepted) {
        return {
          accepted: false,
          reason: outcome.reason,
          cachedBlockCount: compilation.cachedBlockCount,
          gaps: compilation.gaps
        };
      }
      const attachment = withQuireViewEngineAcceptedCacheAuthority(
        engineRuntime,
        (caches) => compilation.batch.attachAcceptedOutput(
          outcome.result.output,
          caches.blockShapeCache
        )
      );

      return {
        accepted: true,
        attachedBlockCount: attachment.attachedBlockCount,
        cachedBlockCount: compilation.cachedBlockCount,
        gaps: compilation.gaps
      };
    },
    snapshot: coordinator.snapshot,
    destroy: coordinator.destroy
  };
}

/**
 * Describes the current local-only fallback without claiming Worker readiness.
 *
 * @param options - Mounted runtime implementations and identity.
 * @returns Exact capability descriptor shared by compiler and handler.
 */
function createLocalCapabilities(
  options: CanvasBackgroundShapingRuntimeOptions
): QuireBackgroundShapingCapabilitySnapshot {
  return {
    measurement: {
      id: `${options.runtimeId}:text-measurer`,
      version: options.textMeasurer.version ?? 0,
      mode: options.textMeasurer.shapeRun === undefined
        ? "measure-only"
        : "cluster-shaping",
      transferability: "local-only"
    },
    lineBreakerName: options.lineBreaker?.name ?? null
  };
}
