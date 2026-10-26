import {
  createMountedViewUpdateScheduler,
  mergeMountedViewUpdateTransactions
} from "@quirekit/view/mounted-backend";
import type { QuireViewMeasuredPhase } from "@quirekit/view/mounted-backend";
import { measureHtmlRenderPhase } from "./diagnostics";
import type {
  CreateHtmlRenderSchedulerOptions,
  HtmlRenderDiagnostics,
  HtmlRenderPhase,
  HtmlRenderPhaseContext,
  HtmlRenderScheduler,
  HtmlScheduledUpdate
} from "./types";

/**
 * Creates the internal retained HTML phase scheduler.
 *
 * @param options - Phase callbacks and shared frame hooks.
 * @returns Scheduler with strict write/read/write phase authority.
 */
export function createHtmlRenderScheduler<TContent, TGeometry>(
  options: CreateHtmlRenderSchedulerOptions<TContent, TGeometry>
): HtmlRenderScheduler {
  let currentPhase: HtmlRenderPhase | undefined;
  let forcedLayoutRisks = 0;
  let latestPhases: readonly QuireViewMeasuredPhase[] = [];
  let reconciliationFrames = 0;
  let contentWrites = 0;
  let stateVersions: readonly number[] = [];
  const now = options.now ?? defaultNow;

  const context = (phase: HtmlRenderPhase): HtmlRenderPhaseContext => ({
    phase,
    readGeometry: <T>(read: () => T): T => {
      if (currentPhase !== "geometry-read") {
        forcedLayoutRisks += 1;
        throw new Error(
          `HTML geometry read is forbidden during ${currentPhase ?? "no render phase"}.`
        );
      }
      return read();
    },
    recordContentWrite: () => {
      contentWrites += 1;
    },
    recordReconciliation: () => {
      reconciliationFrames += 1;
    }
  });

  const shared = createMountedViewUpdateScheduler<HtmlScheduledUpdate>({
    execute: (update) => {
      const phases: QuireViewMeasuredPhase[] = [];
      reconciliationFrames = 0;
      contentWrites = 0;
      stateVersions = update.stateVersions;
      let content: TContent | undefined;

      try {
        currentPhase = "content-write";
        measureHtmlRenderPhase(
          "content-write",
          now,
          () => {
            if (!update.selectionOnly) {
              content = options.runContentWrite(update, context("content-write"));
            }
          },
          phases
        );

        currentPhase = "geometry-read";
        const geometry = measureHtmlRenderPhase(
          "geometry-read",
          now,
          () => options.runGeometryRead(update, content, context("geometry-read")),
          phases
        );

        currentPhase = "overlay-write";
        measureHtmlRenderPhase(
          "overlay-write",
          now,
          () => options.runOverlayWrite(update, content, geometry, context("overlay-write")),
          phases
        );
        latestPhases = phases;
        options.onRender?.(getDiagnostics());
      } finally {
        currentPhase = undefined;
      }
    },
    mergeFrameUpdates: mergeHtmlScheduledUpdates,
    freshness: {
      readUpdateRevision: (update) => update.revision,
      readCurrentRevision: options.readCurrentRevision
    },
    ...(options.requestFrame === undefined ? {} : { requestFrame: options.requestFrame }),
    ...(options.cancelFrame === undefined ? {} : { cancelFrame: options.cancelFrame })
  });

  const getDiagnostics = (): HtmlRenderDiagnostics => ({
    phases: latestPhases,
    scheduler: shared.getCounters(),
    reconciliationFrames,
    contentWrites,
    forcedLayoutRisks,
    stateVersions
  });

  return {
    request: (update, requestOptions = { mode: "frame" }) => {
      shared.request(update, requestOptions);
    },
    flush: () => {
      shared.flush();
      return getDiagnostics();
    },
    destroy: () => {
      currentPhase = undefined;
      shared.destroy();
    },
    getDiagnostics
  };
}

/**
 * Merges frame updates without losing transaction or state-version order.
 *
 * @param pending - Earlier pending update.
 * @param next - Newer update.
 * @returns Coalesced update carrying the latest state and full evidence.
 */
function mergeHtmlScheduledUpdates(
  pending: HtmlScheduledUpdate,
  next: HtmlScheduledUpdate
): HtmlScheduledUpdate {
  const merged = mergeMountedViewUpdateTransactions(pending, next);
  return {
    ...merged,
    stateVersions: [...pending.stateVersions, ...next.stateVersions],
    selectionOnly: Boolean(pending.selectionOnly && next.selectionOnly)
  };
}

/** @returns Current monotonic runtime time. */
function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now();
}
