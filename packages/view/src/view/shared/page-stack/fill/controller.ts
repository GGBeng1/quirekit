import type {
  ActivateQuirePageStackInteractionFillOptions,
  QuirePageStackFillController,
  QuirePageStackFillControllerOptions,
  StartQuirePageStackFillOptions
} from "./types";
import { PageStackFillWorkGeneration } from "./generation";
import { executePageStackFillPass } from "./pass";
import { MountedPageStackFillState } from "./state";

/** Canonical mounted page-stack fill lifecycle orchestrator. */
export class MountedPageStackFillController implements QuirePageStackFillController {
  private readonly options: QuirePageStackFillControllerOptions;
  private readonly state = new MountedPageStackFillState();
  private readonly work = new PageStackFillWorkGeneration();
  private destroyed = false;

  /**
   * Creates one shared page-stack fill lifecycle.
   *
   * @param options - Backend scheduling and chunk execution strategy.
   */
  constructor(options: QuirePageStackFillControllerOptions) {
    this.options = options;
  }

  /** @returns Whether viewport-first fill has started for this mount. */
  get started(): boolean {
    return this.state.started;
  }

  /** @returns Current exclusive shaped-block limit. */
  get blockLimit(): number | undefined {
    return this.state.blockLimit;
  }

  /** @returns Total block count owned by the active generation. */
  get total(): number | undefined {
    return this.state.total;
  }

  /** @returns Whether fill is waiting for the interaction render. */
  get interactionResumePending(): boolean {
    return this.state.interactionResumePending;
  }

  /**
   * Starts viewport-first fill after the initial bounded render.
   *
   * @param options - Initial block limit and total block count.
   * @returns Whether a new fill generation was started.
   */
  start(options: StartQuirePageStackFillOptions): boolean {
    if (
      this.destroyed
      || this.state.started
      || !this.options.isAvailable()
      || options.initialBlockLimit >= options.total
    ) {
      return false;
    }

    this.work.invalidate();
    this.state.start(options.total, options.initialBlockLimit);
    this.scheduleInitialBridge();
    return true;
  }

  /**
   * Starts a new bounded generation around focused interaction work.
   *
   * @param options - Interaction block limit and total block count.
   */
  activateInteraction(
    options: ActivateQuirePageStackInteractionFillOptions
  ): void {
    if (this.destroyed || !this.options.isAvailable()) {
      return;
    }

    this.work.invalidate();
    this.state.activateInteraction(options.total, options.blockLimit);
  }

  /** Cancels active work and clears state before a replacement document renders. */
  reset(): void {
    if (this.destroyed) {
      return;
    }

    this.work.invalidate();
    this.state.reset();
  }

  /** Defers incomplete fill so interaction rendering owns the next frame. */
  postponeForInteraction(): void {
    if (!this.isIncomplete()) {
      return;
    }

    this.work.invalidate();
    this.state.postponeForInteraction();
  }

  /** Resumes postponed fill after the interaction render has painted. */
  resumeAfterInteraction(): void {
    if (!this.state.consumeInteractionResume() || !this.isIncomplete()) {
      return;
    }

    this.work.scheduleDelay(
      this.options.scheduler,
      (signal) => {
        if (this.canRun(signal) && this.isIncomplete()) {
          this.schedulePass();
        }
      },
      this.options.resumeCooldownMs
    );
  }

  /**
   * Reports whether fill remains active for an available mounted backend.
   *
   * @returns Whether unmaterialized blocks remain.
   */
  isIncomplete(): boolean {
    return !this.destroyed
      && this.options.isAvailable()
      && this.state.isIncomplete();
  }

  /** Permanently cancels the controller and all scheduled work. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.state.clearInteractionResume();
    this.work.invalidate();
  }

  /** Schedules the bridge that lets the bounded initial render paint first. */
  private scheduleInitialBridge(): void {
    this.work.scheduleBridge(this.options.scheduler, (signal) => {
      if (!this.canRun(signal)) {
        return;
      }

      this.options.onInitialBridge();
      this.schedulePass();
    });
  }

  /** Schedules one backend-selected fill chunk. */
  private schedulePass(): void {
    if (this.destroyed || !this.isIncomplete()) {
      return;
    }

    this.work.schedulePass(this.options.scheduler, (signal) => {
      if (!this.canRun(signal)) {
        return;
      }

      const request = this.state.createPassRequest(
        this.options.resolveChunkSize(),
        signal
      );
      if (request === undefined) {
        return;
      }

      executePageStackFillPass(request, this.options.executePass, (result) => {
        if (!this.canRun(signal)) {
          return;
        }

        // Only the active generation may advance canonical state or schedule follow-up work.
        const commit = this.state.commit(request, result);
        if (commit.advance !== undefined) {
          this.options.onAdvance(commit.advance);
        }
        if (commit.scheduleNext) {
          this.schedulePass();
        }
      });
    });
  }

  /**
   * Checks whether work still belongs to a live mounted generation.
   *
   * @param signal - Signal captured by the scheduled callback.
   * @returns Whether the callback may commit work.
   */
  private canRun(signal: AbortSignal): boolean {
    return !this.destroyed
      && !signal.aborted
      && signal === this.work.signal
      && this.options.isAvailable();
  }
}
