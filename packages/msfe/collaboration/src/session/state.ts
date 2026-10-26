import type { CollaborationState } from "./types";

/** Session observations isolated from source commits and from each other's exceptions. */
export class SessionState {
  value: CollaborationState = { lifecycle: "idle", connection: "disconnected", permission: "read", synced: false, durability: "unsupported" };
  private readonly listeners = new Set<(state: CollaborationState) => void>();

  /** @param patch - New observed facts; no inferred durability. */
  update(patch: Partial<CollaborationState>): void {
    const next = Object.freeze({ ...this.value, ...patch });
    if (Object.keys(patch).every(key => this.value[key as keyof CollaborationState] === next[key as keyof CollaborationState])) return;
    this.value = next;
    for (const listener of [...this.listeners]) try { listener(next); } catch (error) { console.error(error); }
  }

  /** @param listener - State observer; current state is available separately. @returns Unsubscribe function. */
  subscribe(listener: (state: CollaborationState) => void): () => void {
    if (this.value.lifecycle !== "closed") this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Releases all host observers. */
  destroy(): void { this.listeners.clear(); }
}
