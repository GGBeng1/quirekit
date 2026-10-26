import type { EditorState } from "@quirekit/cm-state";
import type { StateSubscription } from "./types";

/** Instance-local accepted-state observers; selectors never run for unpublished command drafts. */
export class StateSubscriptions {
  private readonly listeners = new Set<(state: EditorState) => void>();
  /** @param report - Host error sink. */
  constructor(private readonly report: (error: unknown) => void) {}
  /** @param state - Initial state, consumed without emitting. @param subscription - Pure selector and change observer.
   * @returns Idempotent disposal callback. */
  add<T>(state: EditorState, subscription: StateSubscription<T>): () => void {
    let value = subscription.select(state);
    /** @param next - Accepted state snapshot. */
    const listener = (next: EditorState): void => {
      const selected = subscription.select(next);
      if ((subscription.equal ?? Object.is)(value, selected)) return;
      const previous = value; value = selected;
      subscription.change(selected, previous);
    };
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  /** @param state - Canonical post-commit state. */
  publish(state: EditorState): void {
    for (const listener of [...this.listeners]) {
      if (!this.listeners.has(listener)) continue;
      try { listener(state); } catch (error) { this.report(error); }
    }
  }
  /** Ends all subscriptions before editor teardown. */
  clear(): void { this.listeners.clear(); }
}
