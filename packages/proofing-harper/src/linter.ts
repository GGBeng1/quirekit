import { Dialect, WorkerLinter } from "harper.js";
import { slimBinary } from "harper.js/slimBinary";

/** @returns One lazily allocated worker with atomic dialect/check operations. */
export function createHarperLinter() {
  let worker: WorkerLinter | undefined;
  let currentDialect: Dialect | undefined;
  let tail = Promise.resolve();
  let closing: Promise<void> | undefined;
  let disposed = false;

  /** Rejects operations admitted after shutdown or still waiting when it began. */
  function assertOpen(): void {
    if (disposed) throw new Error("Harper provider is disposed");
  }

  /**
   * Serializes a complete operation, not individual worker RPCs. Otherwise a
   * concurrent request could switch the dialect between setDialect and lint.
   * @param run - Operation using the shared engine.
   * @returns Operation result; failure does not poison the next queue entry.
   */
  function enqueue<T>(run: () => Promise<T>): Promise<T> {
    if (disposed) return Promise.reject(new Error("Harper provider is disposed"));
    const result = tail.then(() => { assertOpen(); return run(); });
    tail = result.then(() => {}, () => {});
    return result;
  }

  /**
   * @param dialect - Required dialect of the next complete operation.
   * @returns The sole worker, configured while this operation owns the queue.
   */
  async function acquire(dialect: Dialect): Promise<WorkerLinter> {
    if (worker === undefined) {
      worker = new WorkerLinter({ binary: slimBinary, dialect });
      currentDialect = dialect;
    } else if (currentDialect !== dialect) {
      await worker.setDialect(dialect);
      currentDialect = dialect;
    }
    return worker;
  }

  return {
    /** @returns Completion of optional initialization on the same worker used by checks. */
    setup: () => enqueue(async () => (await acquire(Dialect.American)).setup()),
    /**
     * @param dialect - Segment's resolved English dialect.
     * @param text - Plain text to inspect.
     * @param signal - Cancellation checked before allocating or submitting work.
     * @returns Owned lint handles; the provider must release even obsolete answers.
     */
    lint: (dialect: Dialect, text: string, signal: AbortSignal) => enqueue(async () => {
      signal.throwIfAborted();
      const linter = await acquire(dialect);
      assertOpen();
      signal.throwIfAborted();
      return linter.lint(text, { language: "plaintext" });
    }),
    /** @returns Completion of active work and release of the worker, once only. */
    dispose: (): Promise<void> => {
      disposed = true;
      closing ??= tail.then(async () => {
        const retired = worker;
        worker = undefined;
        await retired?.dispose();
      });
      return closing;
    }
  };
}
