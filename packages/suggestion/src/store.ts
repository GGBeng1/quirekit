// The store publishes immutable snapshots without importing framework state tools.
import type { SuggestionState, SuggestionStateListener } from "./types";

/** Minimal immutable state publisher isolated from suggestion lifecycle logic. */
export class SuggestionStateStore<Bookmark, Action> {
  private readonly listeners = new Set<SuggestionStateListener<Bookmark, Action>>();

  /**
   * Creates one store with a complete immutable snapshot.
   *
   * @param stateValue - Initial controller state.
   */
  constructor(private stateValue: SuggestionState<Bookmark, Action>) {}

  /** @returns Current immutable state. */
  get state(): SuggestionState<Bookmark, Action> {
    return this.stateValue;
  }

  /**
   * Subscribes and immediately delivers current state.
   *
   * @param listener - Surface-owned observer.
   * @returns Cleanup that removes the observer.
   */
  subscribe(listener: SuggestionStateListener<Bookmark, Action>): () => void {
    this.listeners.add(listener);
    listener(this.stateValue);
    return () => this.listeners.delete(listener);
  }

  /**
   * Publishes a complete immutable replacement.
   *
   * @param state - Next controller snapshot.
   */
  publish(state: SuggestionState<Bookmark, Action>): void {
    this.stateValue = state;
    for (const listener of [...this.listeners]) listener(state);
  }

  /** Removes every listener during controller destruction. */
  destroy(): void {
    this.listeners.clear();
  }
}
