/** @param operation - Potentially slow host operation. @param signal - Explicit cancellation/deadline. @returns Cancellable completion without retaining abort listeners. */
export function cancellable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    /** Rejects only this request; resource cleanup remains owned by the caller. */
    const abort = () => { reject(signal.reason ?? new Error("collaboration-aborted")); };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

/** @param lifetime - Session lifetime. @param signal - Optional host cancellation. @returns Bounded request signal. */
export function requestSignal(lifetime: AbortSignal, signal?: AbortSignal): AbortSignal {
  return AbortSignal.any([lifetime, AbortSignal.timeout(30_000), ...(signal ? [signal] : [])]);
}
