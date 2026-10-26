import type { ResourceLease } from "./types";

/** Explicit lifetime for editor, document, view and request work. Disposal is synchronous and idempotent. */
export class TaskScope {
  private readonly abort = new AbortController();
  private readonly cleanups = new Set<() => void>();
  private detach: (() => void) | undefined;
  /** @param report - Owner's error boundary; core never starts application IO by itself. */
  constructor(private readonly report: (error: unknown) => void = error => { console.error(error); }) {}
  /** @returns Cancellation signal for this exact lifetime. */
  get signal(): AbortSignal { return this.abort.signal; }
  /** @returns Whether this lifetime has ended. */
  get disposed(): boolean { return this.signal.aborted; }
  /** @param cleanup - Owned finalizer. @returns Early release callback, also removing the registration. */
  own(cleanup: () => void): () => void {
    let active = true;
    /** Releases ownership before invoking user code, preventing reentrant duplicate finalization. */
    const release = (): void => {
      if (!active) return;
      active = false; this.cleanups.delete(release);
      try { cleanup(); } catch (error) { this.report(error); }
    };
    if (this.disposed) release(); else this.cleanups.add(release);
    return release;
  }
  /** @param report - Optional child error boundary. @returns Child scope detached when it ends; disposed parents cancel immediately. */
  fork(report = this.report): TaskScope {
    const child = new TaskScope(report);
    const release = this.own(() => child.dispose());
    child.detach = () => { this.cleanups.delete(release); };
    return child;
  }
  /** @param load - Abort-aware resource acquisition. @param accept - Receives only a still-current lease value.
   * @returns Request scope, disposable independently of its parent. */
  acquire<T>(load: (signal: AbortSignal) => ResourceLease<T> | Promise<ResourceLease<T>>, accept: (value: T) => void): TaskScope {
    const request = this.fork();
    Promise.resolve().then(() => request.disposed ? undefined : load(request.signal)).then(lease => {
      if (!lease) return;
      request.own(() => lease.release?.());
      if (!request.disposed) accept(lease.value);
    }).catch(error => { if (!request.disposed) { request.dispose(); this.report(error); } });
    return request;
  }
  /** Aborts first, then releases resources in reverse acquisition order. */
  dispose(): void {
    if (this.disposed) return;
    this.abort.abort();
    this.detach?.(); this.detach = undefined;
    for (const release of [...this.cleanups].reverse()) release();
    this.cleanups.clear();
  }
}
