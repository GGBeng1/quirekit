/** A set of change listeners with add/notify/clear operations. */
export interface ScrollListenerSet {
  /**
   * Adds a listener.
   *
   * @param listener - Callback invoked on {@link ScrollListenerSet.notify}.
   * @returns Removal function for the listener.
   */
  add(listener: () => void): () => void;
  /** Invokes every registered listener. */
  notify(): void;
  /** Removes every registered listener. */
  clear(): void;
}

/**
 * Creates a listener set shared by scroll sources to fan out change events.
 *
 * @returns Listener set with add, notify, and clear operations.
 */
export function createScrollListenerSet(): ScrollListenerSet {
  const listeners = new Set<() => void>();

  return {
    add(listener: () => void): () => void {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    notify(): void {
      for (const listener of [...listeners]) {
        listener();
      }
    },
    clear(): void {
      listeners.clear();
    }
  };
}
