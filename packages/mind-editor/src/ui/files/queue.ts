import type { MindEditorPreviewQueue, MindEditorPreviewQueueJob } from "./types";

/** @returns One active job with selected-detail FIFO before ordinary-card FIFO. */
export function createMindEditorPreviewQueue(): MindEditorPreviewQueue {
  const selections: MindEditorPreviewQueueJob[] = [], cards: MindEditorPreviewQueueJob[] = [];
  let running = false, scheduled = false, closed = false;
  /** Starts the next pending owner only after the previous layout and disposal settle. */
  function drain(): void {
    if (running || closed) return;
    const job = selections.shift() ?? cards.shift();
    if (!job) return;
    running = true;
    void job.start().finally(() => { running = false; drain(); });
  }
  return {
    /** @param run - Asynchronous renderer job. @param signal - Pending lifetime. @param selected - Selection priority.
     * @returns The job's result or its cancellation. */
    enqueue<T>(run: () => Promise<T>, signal: AbortSignal, selected = false): Promise<T> {
      if (closed) return Promise.reject(new DOMException("Preview queue closed", "AbortError"));
      if (signal.aborted) return Promise.reject(signal.reason);
      const queue = selected ? selections : cards;
      const result = new Promise<T>((resolve, reject) => {
        const job: MindEditorPreviewQueueJob = {
          /** Removes pending cancellation before the renderer assumes active abort ownership.
           * @returns Completion after renderer cleanup and result delivery. */
          async start() {
            signal.removeEventListener("abort", job.cancel);
            try { signal.throwIfAborted(); resolve(await run()); } catch (reason) { reject(reason); }
          },
          /** Releases a canceled queued card without allocating a temporary editor. */
          cancel() {
            const index = queue.indexOf(job); if (index >= 0) queue.splice(index, 1);
            signal.removeEventListener("abort", job.cancel);
            reject(signal.aborted ? signal.reason : new DOMException("Preview queue closed", "AbortError"));
          },
        };
        queue.push(job); signal.addEventListener("abort", job.cancel, { once: true });
      });
      // Batch requests created in the same Vue update; selected detail is picked
      // first even when its sibling gallery registered its watcher earlier.
      if (!running && !scheduled) {
        scheduled = true; queueMicrotask(() => { scheduled = false; drain(); });
      }
      return result;
    },
    /** Invalidates only pending jobs; an active renderer keeps its own cleanup path. */
    dispose() { closed = true; [...selections, ...cards].forEach(job => job.cancel()); },
  };
}
