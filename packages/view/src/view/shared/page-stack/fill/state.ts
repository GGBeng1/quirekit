import type {
  QuirePageStackFillAdvance,
  QuirePageStackFillCommit,
  QuirePageStackFillPassResult,
  QuirePageStackFillPassRequest
} from "./types";

/** Canonical window and interaction state for mounted page-stack fill. */
export class MountedPageStackFillState {
  private startedValue = false;
  private blockLimitValue: number | undefined;
  private totalValue: number | undefined;
  private interactionResumePendingValue = false;

  /** @returns Whether viewport-first fill has started for this mount. */
  get started(): boolean {
    return this.startedValue;
  }

  /** @returns Current exclusive shaped-block limit. */
  get blockLimit(): number | undefined {
    return this.blockLimitValue;
  }

  /** @returns Total block count owned by the active generation. */
  get total(): number | undefined {
    return this.totalValue;
  }

  /** @returns Whether fill is waiting for the interaction render. */
  get interactionResumePending(): boolean {
    return this.interactionResumePendingValue;
  }

  /**
   * Starts one viewport-first fill window.
   *
   * @param total - Total top-level block count.
   * @param initialBlockLimit - Exclusive block limit shaped for first paint.
   */
  start(total: number, initialBlockLimit: number): void {
    this.startedValue = true;
    this.blockLimitValue = initialBlockLimit;
    this.totalValue = total;
    this.interactionResumePendingValue = false;
  }

  /**
   * Rebounds fill around a focused interaction window.
   *
   * @param total - Total top-level block count.
   * @param blockLimit - Exclusive block limit required by the interaction.
   */
  activateInteraction(total: number, blockLimit: number): void {
    this.startedValue = true;
    this.blockLimitValue = blockLimit;
    this.totalValue = total;
    this.interactionResumePendingValue = true;
  }

  /** Clears every block-window fact owned by the current document generation. */
  reset(): void {
    this.startedValue = false;
    this.blockLimitValue = undefined;
    this.totalValue = undefined;
    this.interactionResumePendingValue = false;
  }

  /** Marks active fill as waiting for the interaction render. */
  postponeForInteraction(): void {
    this.interactionResumePendingValue = true;
  }

  /**
   * Consumes the pending interaction-resume marker.
   *
   * @returns Whether a resume was pending.
   */
  consumeInteractionResume(): boolean {
    if (!this.interactionResumePendingValue) {
      return false;
    }

    this.interactionResumePendingValue = false;
    return true;
  }

  /** Clears transient interaction state during destruction. */
  clearInteractionResume(): void {
    this.interactionResumePendingValue = false;
  }

  /**
   * Reports whether more blocks remain in the current fill window.
   *
   * @returns Whether canonical fill state is incomplete.
   */
  isIncomplete(): boolean {
    return this.startedValue && this.blockLimitValue !== undefined;
  }

  /**
   * Builds the next canonical block window.
   *
   * @param chunkSize - Positive number of blocks requested by the backend.
   * @param signal - Abort signal for the active scheduled generation.
   * @returns Next pass request, or undefined after completion.
   */
  createPassRequest(
    chunkSize: number,
    signal: AbortSignal
  ): QuirePageStackFillPassRequest | undefined {
    const total = this.totalValue;
    const fromIndex = this.blockLimitValue;
    if (total === undefined || fromIndex === undefined) {
      return undefined;
    }

    const toIndex = Math.min(total, fromIndex + Math.max(1, Math.floor(chunkSize)));
    return {
      total,
      fromIndex,
      toIndex,
      complete: toIndex >= total,
      signal
    };
  }

  /**
   * Applies one accepted backend result to canonical fill state.
   *
   * @param request - Block window executed by the backend.
   * @param result - Backend decision for the completed pass.
   * @returns State projection and follow-up scheduling decision.
   */
  commit(
    request: QuirePageStackFillPassRequest,
    result: QuirePageStackFillPassResult
  ): QuirePageStackFillCommit {
    if (result.action === "stop") {
      return { scheduleNext: false };
    }
    if (result.action === "retry") {
      return {
        scheduleNext: !this.interactionResumePendingValue && this.isIncomplete()
      };
    }

    return {
      advance: this.advance(request, result.render),
      scheduleNext: !request.complete
    };
  }

  /**
   * Advances canonical fill state after one accepted backend pass.
   *
   * @param request - Block window accepted by the backend.
   * @param render - Whether the backend should reconcile paint.
   * @returns State projection consumed by the mounted backend.
   */
  private advance(
    request: QuirePageStackFillPassRequest,
    render: boolean
  ): QuirePageStackFillAdvance {
    this.blockLimitValue = request.complete ? undefined : request.toIndex;
    if (request.complete) {
      this.totalValue = undefined;
    }
    return {
      complete: request.complete,
      blockLimit: this.blockLimitValue,
      render
    };
  }
}
