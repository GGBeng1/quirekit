import type {
  EditorUIDragAutoScrollDecision,
  EditorUIDragSessionPorts,
  EditorUIDragTargetResolution
} from "./types";

/** Owns the release-once transient resources of one drag session. */
export class DragSessionTransientOwner<SourcePayload, TargetPayload> {
  private cleaned = false;
  private autoScrollActive = false;
  private indicatorVisible = false;
  private lockAcquired = false;

  /**
   * Creates a transient owner over the session ports.
   *
   * @param ports - Lock, indicator, auto-scroll, and listener ports.
   */
  constructor(
    private readonly ports: EditorUIDragSessionPorts<SourcePayload, TargetPayload>
  ) {}

  /**
   * Acquires the optional preview lock.
   *
   * @returns Whether arming may continue.
   */
  acquireLock(): boolean {
    if (this.ports.lock === undefined) return true;
    this.lockAcquired = this.ports.lock.acquire();
    return this.lockAcquired;
  }

  /**
   * Applies one target indicator and mounted auto-scroll decision.
   *
   * @param target - Normalized target resolution.
   * @param autoScroll - Current mounted auto-scroll decision.
   */
  apply(
    target: EditorUIDragTargetResolution<TargetPayload>,
    autoScroll: EditorUIDragAutoScrollDecision
  ): void {
    if (target.status === "ready") {
      this.ports.indicator?.show(target.indicator);
      this.indicatorVisible = this.ports.indicator !== undefined;
    } else {
      this.clearIndicator();
    }
    if (autoScroll.kind === "scroll") {
      this.ports.autoScroll?.update(autoScroll);
      this.autoScrollActive = this.ports.autoScroll !== undefined;
    } else {
      this.stopAutoScroll();
    }
  }

  /** Clears one currently visible indicator. */
  clearIndicator(): void {
    if (!this.indicatorVisible) return;
    this.ports.indicator?.clear();
    this.indicatorVisible = false;
  }

  /** Stops mounted auto-scroll while preserving the remaining session resources. */
  stopAutoScroll(): void {
    if (!this.autoScrollActive) return;
    this.ports.autoScroll?.stop();
    this.autoScrollActive = false;
  }

  /** Releases all transient ports exactly once. */
  cleanup(): void {
    if (this.cleaned) return;
    this.cleaned = true;
    this.clearIndicator();
    this.stopAutoScroll();
    if (this.lockAcquired) this.ports.lock?.release();
    this.lockAcquired = false;
    this.ports.listeners?.release();
  }
}
