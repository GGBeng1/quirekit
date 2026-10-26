import { v4 as uuidv4 } from "uuid";
import type { Text, Transaction } from "@quirekit/cm-state";
import type { PendingActivityEvent } from "@quirekit/edit-history";
import { classifyTransaction } from "./classify";
import { boundedSlice, lineRange } from "./content";
import type { MdActivityChange, MdActivityOptions } from "./types";

/** An event still collecting consecutive typing. */
interface OpenEvent {
  /** Recognized change. */
  readonly change: MdActivityChange;
  /** Fragment before the first change. */
  readonly before: { readonly text: string; readonly truncated: boolean };
  /** Covered lines in current coordinates, mapped through every later change. */
  from: number;
  /** End of the covered lines. */
  to: number;
  /** Characters inserted and deleted so far. */
  inserted: number;
  /** Characters deleted so far. */
  deleted: number;
  /** Client time of the first change. */
  readonly startedAt: number;
  /** Client time of the latest change. */
  lastAt: number;
}

/**
 * Turns accepted local transactions into pending activity events. Typing in one block merges until a pause,
 * another kind of change or a blur; everything else becomes one event per transaction.
 */
export class MdActivityRecorder {
  private open: OpenEvent | null = null;
  private doc: Text | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Highest sequence the store confirmed for this recorder's events; 0 before any receipt or in hint mode. */
  confirmedSequence = 0;

  /** @param options - Late-bound recording options. @param now - Clock, replaceable in tests. */
  constructor(private readonly options: () => MdActivityOptions, private readonly now: () => number = Date.now) {}

  /** @param transaction - Every accepted transaction, local or not. */
  record(transaction: Transaction): void {
    if (!transaction.docChanged) return;
    this.doc = transaction.state.doc;
    const open = this.open;
    if (open) { open.from = transaction.changes.mapPos(open.from, -1); open.to = transaction.changes.mapPos(open.to, 1); }
    const { store, actor, hints } = this.options();
    if (!hints && (!store || !actor)) return;
    const change = classifyTransaction(transaction);
    if (!change) return;
    let fromA = Infinity, toA = -Infinity, fromB = Infinity, toB = -Infinity, inserted = 0, deleted = 0;
    transaction.changes.iterChanges((a, b, c, d, text) => {
      fromA = Math.min(fromA, a); toA = Math.max(toA, b); fromB = Math.min(fromB, c); toB = Math.max(toB, d);
      inserted += text.length; deleted += b - a;
    });
    if (hints) {
      // The server confirms and writes; the length change lets it pair this hint with the matching update.
      if (!change.mergeable) hints({ operationId: uuidv4(), kind: change.kind, kindVersion: 1, facts: change.facts,
        delta: transaction.changes.newLength - transaction.changes.length, occurredAt: new Date(this.now()).toISOString() });
      return;
    }
    const after = lineRange(transaction.state.doc, fromB, toB), at = this.now();
    if (change.mergeable && open && open.change.kind === change.kind && after.from <= open.to && after.to >= open.from
      && at - open.lastAt <= this.options().mergeMs) {
      open.from = Math.min(open.from, after.from); open.to = Math.max(open.to, after.to);
      open.inserted += inserted; open.deleted += deleted; open.lastAt = at;
      this.schedule();
      return;
    }
    this.flush();
    const beforeRange = lineRange(transaction.startState.doc, fromA, toA);
    this.open = { change, before: boundedSlice(transaction.startState.doc, beforeRange.from, beforeRange.to, this.options().maxContentBytes),
      from: after.from, to: after.to, inserted, deleted, startedAt: at, lastAt: at };
    if (change.mergeable) this.schedule(); else this.flush();
  }

  /** Emits the collecting event, if any. */
  flush(): void {
    clearTimeout(this.timer); this.timer = undefined;
    const open = this.open, doc = this.doc, options = this.options();
    this.open = null;
    if (!open || !doc || !options.store || !options.actor) return;
    const after = boundedSlice(doc, open.from, Math.min(open.to, doc.length), options.maxContentBytes);
    const event: PendingActivityEvent = { documentId: options.documentId, epoch: options.epoch, operationId: uuidv4(),
      actor: options.actor, source: open.change.source, kind: open.change.kind, kindVersion: 1,
      facts: { ...open.change.facts, inserted: open.inserted, deleted: open.deleted }, occurredAt: new Date(open.startedAt).toISOString(),
      ...(options.sessionId ? { sessionId: options.sessionId } : {}),
      target: { scheme: "source-range", value: { from: open.from, to: Math.min(open.to, doc.length) }, quote: (after.text || open.before.text).slice(0, 80) },
      content: { format: "markdown", before: open.before.text, after: after.text, truncated: open.before.truncated || after.truncated } };
    options.store.append([event]).then(receipts => {
      for (const receipt of receipts) this.confirmedSequence = Math.max(this.confirmedSequence, receipt.sequence);
    }, options.onError);
  }

  /** Stops pending timers after a final flush. */
  destroy(): void { this.flush(); }

  /** Restarts the pause timer of the collecting event. */
  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), this.options().mergeMs);
  }
}
