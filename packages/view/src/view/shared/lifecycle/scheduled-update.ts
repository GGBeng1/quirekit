import {
  createMountedViewUpdateRevisionClock,
  createMountedViewUpdateScheduler,
  mergeMountedViewUpdateTransactions
} from "../update-scheduler";
import { resolveMountedViewUpdateScheduleMode } from "./update-mode";
import type {
  CreateMountedViewScheduledUpdateLifecycleOptions,
  MountedViewScheduledUpdate,
  MountedViewScheduledUpdateLifecycle,
  MountedViewScheduledUpdateRequest
} from "./types";

/**
 * Creates the canonical scheduling and revision authority for one mounted view.
 *
 * @param options - Backend render callback and mounted lifecycle integrations.
 * @returns Lifecycle that owns cadence, revision, coalescing, and teardown.
 */
export function createMountedViewScheduledUpdateLifecycle<
  TRequest extends MountedViewScheduledUpdateRequest
>(
  options: CreateMountedViewScheduledUpdateLifecycleOptions<TRequest>
): MountedViewScheduledUpdateLifecycle<TRequest> {
  const revisionClock = createMountedViewUpdateRevisionClock();
  let destroyed = false;
  const scheduler = createMountedViewUpdateScheduler<
    MountedViewScheduledUpdate<TRequest>
  >({
    execute: (update) => {
      options.execute(update);

      // A sync request can absorb a frame's obligations; newer renders own completion.
      if (!destroyed && update.revision.stateVersion === revisionClock.current().stateVersion) {
        options.completeDeferredPostUpdate?.();
      }

      // Background fill resumes only after the mutation that suspended it renders.
      if (
        !destroyed && update.revision.stateVersion === revisionClock.current().stateVersion &&
        isMountedInteractionUpdate(update.reason)
      ) {
        options.resumeInteraction?.();
      }

      options.onSchedule?.({
        phase: "render",
        update,
        counters: scheduler.getCounters()
      });
    },
    mergeFrameUpdates: mergeMountedViewUpdateTransactions,
    freshness: {
      readUpdateRevision: (update) => update.revision,
      readCurrentRevision: () => revisionClock.current()
    },
    ...(options.requestFrame !== undefined && options.cancelFrame !== undefined
      ? {
          requestFrame: options.requestFrame,
          cancelFrame: options.cancelFrame
        }
      : {})
  });

  return {
    request: (request) => {
      if (destroyed) return;
      const scheduleMode = resolveMode(request.reason);
      const update = {
        ...request,
        scheduleMode,
        revision: revisionClock.advance(options.invalidatesLayout(request))
      } as MountedViewScheduledUpdate<TRequest>;

      if (scheduleMode === "frame") {
        options.requestDeferredPostUpdate?.();
        // Only interaction updates resume fill after rendering.
        if (isMountedInteractionUpdate(request.reason)) options.postponeInteraction?.();
      }
      scheduler.request(update, { mode: scheduleMode });
      options.onSchedule?.({
        phase: "request",
        update,
        counters: scheduler.getCounters()
      });
    },
    resolveMode,
    currentRevision: () => revisionClock.current(),
    flush: () => scheduler.flush(),
    getCounters: () => scheduler.getCounters(),
    destroy: () => {
      destroyed = true;
      scheduler.destroy();
    }
  };

  /**
   * Resolves cadence against focus at request time rather than mount time.
   *
   * @param reason - Semantic reason for the mounted update.
   * @returns Synchronous or frame-coalesced schedule mode.
   */
  function resolveMode(
    reason: TRequest["reason"]
  ): ReturnType<typeof resolveMountedViewUpdateScheduleMode> {
    return resolveMountedViewUpdateScheduleMode({
      reason,
      focused: options.readFocused()
    });
  }
}

/**
 * Reports whether one update participates in focused mutation interaction.
 *
 * @param reason - Semantic mounted update reason.
 * @returns Whether background fill and deferred post-update hooks apply.
 */
function isMountedInteractionUpdate(reason: string): boolean {
  return reason === "transaction" || reason === "composition";
}
