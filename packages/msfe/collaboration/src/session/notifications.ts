import type { Doc } from "yjs";

/** Releases business callbacks only after CRDT observers and the calling history operation finish. */
export class SessionNotifications {
  private protocol = false;
  private holds = 0;
  private flushing = false;
  private readonly pending: (() => void)[] = [];

  /** @param document - Owned or borrowed source authority. */
  constructor(private readonly document: Doc) {
    document.on("beforeAllTransactions", this.begin); document.on("afterAllTransactions", this.end);
  }

  /** @param notify - Accepted source observation; may synchronously initiate another edit. */
  publish(notify: () => void): void { this.pending.push(notify); this.flush(); }

  /** @param operation - Capture/undo operation whose flags must settle before host callbacks. @returns Operation result. */
  hold<T>(operation: () => T): T {
    this.holds++;
    try { return operation(); } finally { this.holds--; this.flush(); }
  }

  /** Releases observers and pending notifications on explicit session close. */
  destroy(): void {
    this.document.off("beforeAllTransactions", this.begin); this.document.off("afterAllTransactions", this.end); this.pending.length = 0;
  }

  /** Marks protocol work, including nested observer transactions, as incomplete. */
  private readonly begin = (): void => { this.protocol = true; };
  /** Completes all CRDT observers before allowing reentrant local history. */
  private readonly end = (): void => { this.protocol = false; this.flush(); };

  /** Drains in acceptance order, with new callback-issued commands appended to the same queue. */
  private flush(): void {
    if (this.protocol || this.holds || this.flushing) return;
    this.flushing = true;
    try { while (this.pending.length && !this.protocol && !this.holds) this.pending.shift()!(); }
    finally { this.flushing = false; }
  }
}
