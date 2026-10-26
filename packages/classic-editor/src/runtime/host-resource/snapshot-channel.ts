import type {
  ClassicEditorHostJobListener,
  ClassicEditorHostJobSnapshot
} from "../../types/host";

/** Read-only observer channel kept separate from Host effect coordination. */
export class ClassicEditorHostSnapshotChannel {
  private readonly listeners = new Set<ClassicEditorHostJobListener>();

  /**
   * Subscribes a consumer and immediately replays current state.
   *
   * @param snapshot - Current immutable Host state.
   * @param listener - Read-only consumer.
   * @returns Idempotent unsubscribe callback.
   */
  subscribe(
    snapshot: ClassicEditorHostJobSnapshot | null,
    listener: ClassicEditorHostJobListener
  ): () => void {
    this.listeners.add(listener);
    listener(snapshot);
    return () => this.listeners.delete(listener);
  }

  /**
   * Publishes one committed Host snapshot to a defensive listener copy.
   *
   * @param snapshot - Current immutable Host state.
   */
  publish(snapshot: ClassicEditorHostJobSnapshot | null): void {
    for (const listener of [...this.listeners]) listener(snapshot);
  }

  /** Releases all observers during final Host destruction. */
  clear(): void {
    this.listeners.clear();
  }
}
