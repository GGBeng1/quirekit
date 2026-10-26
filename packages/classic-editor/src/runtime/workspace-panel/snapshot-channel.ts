import type {
  ClassicEditorWorkspacePanelEntry,
  ClassicEditorWorkspacePanelListener,
  ClassicEditorWorkspacePanelSnapshot
} from "../../types/workspace-panel";
import { freezeWorkspacePanelSnapshot } from "./freeze";

/** Immutable replay channel for one instance-local Workspace Panel stack. */
export class ClassicEditorWorkspacePanelSnapshotChannel {
  private readonly listeners = new Set<ClassicEditorWorkspacePanelListener>();
  private snapshotValue = freezeWorkspacePanelSnapshot(0, [], null);
  private destroyed = false;

  /** @returns Current immutable panel snapshot. */
  get snapshot(): ClassicEditorWorkspacePanelSnapshot {
    return this.snapshotValue;
  }

  /**
   * Subscribes with immediate replay.
   *
   * @param listener - Immutable snapshot consumer.
   * @returns Idempotent unsubscribe callback.
   */
  subscribe(listener: ClassicEditorWorkspacePanelListener): () => void {
    if (this.destroyed) {
      throw new Error("Classic Editor Workspace Panel host has been destroyed.");
    }
    this.listeners.add(listener);
    listener(this.snapshotValue);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.listeners.delete(listener);
    };
  }

  /**
   * Publishes one stack revision.
   *
   * @param stack - Next single visible stack.
   * @param closeReason - Lifecycle reason associated with the transition.
   */
  publish(
    stack: readonly ClassicEditorWorkspacePanelEntry[],
    closeReason: ClassicEditorWorkspacePanelSnapshot["closeReason"]
  ): void {
    this.snapshotValue = freezeWorkspacePanelSnapshot(
      this.snapshotValue.revision + 1,
      stack,
      closeReason
    );
    for (const listener of [...this.listeners]) listener(this.snapshotValue);
  }

  /**
   * Publishes final closed state and releases all observers.
   *
   * @param closeReason - Final unmount or destroy reason.
   */
  destroy(closeReason: ClassicEditorWorkspacePanelSnapshot["closeReason"]): void {
    if (this.destroyed) return;
    this.publish([], closeReason);
    this.listeners.clear();
    this.destroyed = true;
  }
}
