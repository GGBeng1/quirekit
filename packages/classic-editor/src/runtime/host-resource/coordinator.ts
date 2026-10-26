import type {
  ClassicEditorHostJobProgress,
  ClassicEditorHostJobListener,
  ClassicEditorHostJobSnapshot,
  ClassicEditorHostResourceController,
  ClassicEditorHostResourceIntent,
  ClassicEditorHostResourceResult,
  ClassicEditorHostServices
} from "../../types/host";
import {
  createHostCancelledResult,
  createHostFailedResult,
  createHostInitialProgress,
  doesHostResultMatch,
  freezeHostIntent,
  freezeHostSnapshot,
  isHostProgressAdvance,
  isNewerHostIntent,
  isSameHostOperation,
  isSameHostTuple
} from "./protocol";
import { ClassicEditorHostSnapshotChannel } from "./snapshot-channel";

/** Coordinates typed Host effects, abort, progress, retry, and late-result rejection. */
export class ClassicEditorHostResourceCoordinator
implements ClassicEditorHostResourceController {
  private snapshotValue: ClassicEditorHostJobSnapshot | null = null;
  private controller: AbortController | null = null;
  private activeIntent: ClassicEditorHostResourceIntent | null = null;
  private readonly snapshots = new ClassicEditorHostSnapshotChannel();
  private destroyed = false;
  /** @param services - Explicit typed Host adapter surface. */
  constructor(private readonly services: ClassicEditorHostServices) {}

  /** @returns Current immutable state, or null when idle. */
  get snapshot(): ClassicEditorHostJobSnapshot | null { return this.snapshotValue; }

  /**
   * Subscribes to immutable snapshots and immediately replays current state.
   *
   * @param listener - Read-only snapshot consumer.
   * @returns Idempotent unsubscribe callback.
   */
  subscribe(listener: ClassicEditorHostJobListener): () => void {
    return this.snapshots.subscribe(this.snapshotValue, listener);
  }

  /**
   * Starts an intent, superseding and aborting any pending execution.
   *
   * @param intent - Signal-free typed Host intent.
   * @returns Matching accepted terminal result, or null for late/superseded work.
   */
  async start(intent: ClassicEditorHostResourceIntent): Promise<ClassicEditorHostResourceResult | null> {
    this.assertActive();
    const active = freezeHostIntent(intent);
    if (
      this.activeIntent !== null
      && isSameHostOperation(this.activeIntent, active)
      && !isNewerHostIntent(active, this.activeIntent)
    ) return null;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.activeIntent = active;
    this.snapshotValue = freezeHostSnapshot(
      active,
      createHostInitialProgress(active),
      null
    );
    this.snapshots.publish(this.snapshotValue);
    const reporter = {
      report: (progress: ClassicEditorHostJobProgress) => {
        this.acceptProgress(active, controller, progress);
      }
    };
    let result: ClassicEditorHostResourceResult;
    try { result = await execute(this.services, active, controller.signal, reporter); }
    catch { result = createHostFailedResult(active); }
    if (
      !doesHostResultMatch(active, result)
      || this.controller !== controller
      || this.activeIntent !== active
      || this.snapshotValue?.result !== null
    ) return null;
    this.snapshotValue = freezeHostSnapshot(
      active,
      { ...this.snapshotValue.progress, phase: "result", canCancel: false },
      result
    );
    this.snapshots.publish(this.snapshotValue);
    this.controller = null;
    return this.snapshotValue.result;
  }

  /**
   * Cancels the exact active intent and aborts its adapter signal.
   *
   * @param intent - Exact active intent identity.
   */
  cancel(intent: ClassicEditorHostResourceIntent): void {
    const active = this.activeIntent;
    if (active === null || !isSameHostTuple(active, intent) || this.snapshotValue?.result !== null) return;
    this.controller?.abort();
    this.controller = null;
    this.snapshotValue = freezeHostSnapshot(
      active,
      { ...this.snapshotValue.progress, phase: "result", canCancel: false },
      createHostCancelledResult(active)
    );
    this.snapshots.publish(this.snapshotValue);
  }

  /**
   * Retries only a matching retryable denied/failed terminal result.
   *
   * @param intent - Exact terminal intent identity.
   * @returns New accepted result, or null when retry is not admissible.
   */
  retry(intent: ClassicEditorHostResourceIntent): Promise<ClassicEditorHostResourceResult | null> {
    if (this.destroyed) {
      return Promise.reject(new Error("Classic Editor Host resources have been destroyed."));
    }
    const active = this.activeIntent;
    if (active === null || !isSameHostTuple(active, intent)) {
      return Promise.resolve(null);
    }
    const result = this.snapshotValue?.result ?? null;
    if (
      result === null
      || (result.outcome !== "failed" && result.outcome !== "denied")
      || !result.diagnostic.retryable
    ) return Promise.resolve(null);
    return this.start(Object.freeze({
      ...active,
      attempt: active.attempt + 1,
      generation: active.generation + 1
    }));
  }

  /** Aborts pending work and permanently closes the instance-owned coordinator. */
  destroy(): void {
    if (this.destroyed) return;
    const active = this.activeIntent;
    const current = this.snapshotValue;
    this.destroyed = true;
    this.controller?.abort();
    this.controller = null;
    if (active !== null && current !== null && current.result === null) {
      this.snapshotValue = freezeHostSnapshot(
        active,
        { ...current.progress, phase: "result", canCancel: false },
        createHostCancelledResult(active)
      );
      this.snapshots.publish(this.snapshotValue);
    }
    this.snapshots.clear();
  }

  /** @param intent - Active intent. @param controller - Active controller. @param progress - Candidate update. */
  private acceptProgress(
    intent: ClassicEditorHostResourceIntent,
    controller: AbortController,
    progress: ClassicEditorHostJobProgress
  ): void {
    const current = this.snapshotValue;
    if (
      this.destroyed
      || this.activeIntent !== intent
      || this.controller !== controller
      || current?.result !== null
    ) return;
    if (!isHostProgressAdvance(current.progress, progress, intent.attempt)) return;
    this.snapshotValue = freezeHostSnapshot(intent, progress, null);
    this.snapshots.publish(this.snapshotValue);
  }

  /** Throws when a caller attempts to start work after instance destruction. */
  private assertActive(): void {
    if (this.destroyed) {
      throw new Error("Classic Editor Host resources have been destroyed.");
    }
  }
}

/** @param services - Typed adapters. @param intent - Intent. @param signal - Coordinator signal. @param progress - Reporter. @returns Matching result. */
function execute(
  services: ClassicEditorHostServices,
  intent: ClassicEditorHostResourceIntent,
  signal: AbortSignal,
  progress: { report(progress: ClassicEditorHostJobProgress): void }
): Promise<ClassicEditorHostResourceResult> {
  switch (intent.kind) {
    case "acquire": return services.acquire({ intent, signal, progress });
    case "resolve": return services.resolve({ intent, signal, progress });
    case "upload": return services.upload({ intent, signal, progress });
    case "open": return services.open({ intent, signal, progress });
  }
}
