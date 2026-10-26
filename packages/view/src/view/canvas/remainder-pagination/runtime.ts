import { buildQuireBodyMeasuredContainer } from "@quirekit/view-engine";
import { compileQuireInfiniteLayoutDocument } from "@quirekit/view-engine";
import { resolveQuireDocumentProfile, resolveQuirePageBandPageGeometry } from "@quirekit/view-engine";
import { withQuireViewEngineAcceptedCacheAuthority } from "@quirekit/view-engine";
import { requireQuireViewEngineRuntime } from "../../facade/engine-runtime";
import {
  compileQuireRemainderPaginationBatch,
  createQuireLayoutJobCoordinator,
  handleQuireRemainderPaginationJob,
  QUIRE_LAYOUT_JOB_PROTOCOL_VERSION
} from "../../shared";
import { createQuireLayoutJobExecutorWithWorkerFallback } from "../../shared/layout-jobs/worker";
import type {
  CanvasRemainderPaginationRuntime,
  CanvasRemainderPaginationRuntimeOptions
} from "./types";

/**
 * Creates Canvas orchestration for pure remainder page driving.
 *
 * @param options - Mounted editor, retained view, and revision authority.
 * @returns Remainder pagination lifecycle used after tail shaping.
 */
export function createCanvasRemainderPaginationRuntime(
  options: CanvasRemainderPaginationRuntimeOptions
): CanvasRemainderPaginationRuntime {
  const engineRuntime = requireQuireViewEngineRuntime(options.view);
  const deployment = createQuireLayoutJobExecutorWithWorkerFallback({
    ...(options.createWorkerClient === undefined
      ? {}
      : { createWorker: options.createWorkerClient }),
    fallbackHandlers: {
      "remainder-pagination": handleQuireRemainderPaginationJob
    }
  });
  const coordinator = createQuireLayoutJobCoordinator({
    executor: deployment.executor,
    readCurrentRevision: options.readCurrentRevision
  });
  let nextJobSequence = 1;

  return {
    async paginate(request) {
      // Live providers compile only on the main thread. The resulting measured
      // flow is the complete clone-safe authority passed to page driving.
      const { container, batch, requestKey } = withQuireViewEngineAcceptedCacheAuthority(
        engineRuntime,
        (caches) => {
          const compiledDocument = compileQuireInfiniteLayoutDocument({
            state: options.editor.state,
            editor: options.editor,
            viewportRect: request.viewportRect,
            pageGeometry: request.pageGeometry,
            ...(request.font === undefined ? {} : { font: request.font }),
            textBaselineOffset: request.textBaselineOffset,
            textMeasurer: options.textMeasurer,
            lineBreakMode: request.lineBreakMode,
            ...(options.lineBreaker === undefined
              ? {}
              : { lineBreaker: options.lineBreaker }),
            blockShapeCache: caches.blockShapeCache
          }, caches.retainedBlockGraph);
          const measuredContainer = buildQuireBodyMeasuredContainer(
            compiledDocument.document.children,
            caches.measuredSourceCache
          );
          const requestKey = `${options.runtimeId}:remainder-pagination:${nextJobSequence}`;
          const compiledBatch = compileQuireRemainderPaginationBatch({
            requestKey,
            container: measuredContainer,
            pageGeometry: resolveQuirePageBandPageGeometry({
              documentNode: options.editor.state.doc,
              pageGeometry: request.pageGeometry,
              sources: compiledDocument.pageBandSources,
              pageModel: resolveQuireDocumentProfile(options.editor.extensionManager).pageModel
            }),
            ...(request.widows === undefined ? {} : { widows: request.widows }),
            ...(request.orphans === undefined ? {} : { orphans: request.orphans }),
            paginationCheckpointStore: caches.paginationCheckpointStore
          });
          return { container: measuredContainer, batch: compiledBatch, requestKey };
        }
      );
      nextJobSequence += 1;
      const outcome = await coordinator.submit({
        protocolVersion: QUIRE_LAYOUT_JOB_PROTOCOL_VERSION,
        jobId: requestKey,
        supersessionScope: `${options.runtimeId}:remainder-pagination`,
        kind: "remainder-pagination",
        stateVersion: request.revision.stateVersion,
        layoutEpoch: request.revision.layoutEpoch,
        dirtyRange: null,
        window: { kind: "pages", fromIndex: 0, toIndex: container.items.length },
        cacheHints: {
          retainedBlockKeys: [],
          paginationCheckpointKeys: [],
          tableProductKeys: []
        },
        payload: batch.payload
      });
      if (!outcome.accepted) {
        return { accepted: false, reason: outcome.reason };
      }
      return {
        accepted: true,
        attachedPageCount: batch.attachAcceptedOutput(
          outcome.result.output
        ).attachedPageCount
      };
    },
    snapshot: () => ({
      ...coordinator.snapshot(),
      deployment: deployment.snapshot()
    }),
    destroy: coordinator.destroy
  };
}
