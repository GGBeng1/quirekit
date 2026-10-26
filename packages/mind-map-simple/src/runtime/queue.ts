/**
 * Serializes accepted edits while keeping rejected work from poisoning later operations.
 * @param changed - Constant-sized pending-state notification.
 * @returns Per-instance authoring queue; every consumer still checks its lifetime.
 */
export function createMindMapQueue(changed: () => void) {
  let tail = Promise.resolve(), pending = 0;
  return {
    /** @returns Whether an operation has been accepted but not yet settled. */
    busy: () => pending > 0,
    /** @returns Completion of all currently accepted operations. */
    settled: () => tail,
    /** @param action - Guarded write. @returns Completion or failure of that write only. */
    run<T>(action: () => Promise<T>): Promise<T> {
      pending++; changed();
      const result = tail.then(action).finally(() => { pending--; changed(); });
      tail = result.then(() => undefined, () => undefined);
      return result;
    },
  };
}
