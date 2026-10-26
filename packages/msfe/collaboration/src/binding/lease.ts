import { Transaction } from "@quirekit/cm-state";
import type { Transaction as YTransaction, YTextEvent } from "yjs";
import type { MsfeSourceBinding, MsfeSourceLease } from "@quirekit/msfe-core/source-provider";
import { resolveSelection } from "../history/selection";
import { readChanges, writeChanges } from "./changes";
import type { BindingContext } from "./types";

/** Bridges accepted transactions without installing a second editor or synchronization plugin. */
export class SourceLease implements MsfeSourceLease {
  readonly documentId: string;
  readonly source;
  readonly history;
  private binding: MsfeSourceBinding | undefined;
  private disposed = false;
  private readonly initialVersion: number;

  /** @param context - Session identity, history and lifetime. */
  constructor(private readonly context: BindingContext) {
    this.documentId = context.manifest.documentId;
    this.source = { ...context.manifest.sourceFormat, text: context.text.toString() };
    this.history = context.history.driver;
    this.initialVersion = context.version();
    context.text.observe(this.receive);
  }

  /** @returns Current service/session permission, independent of host readOnly. */
  get writable(): boolean { return !this.disposed && this.context.writable(); }

  /** @param binding - Scoped editor transaction capability. */
  attach(binding: MsfeSourceBinding): void {
    if (this.disposed || this.binding) throw new Error("collaboration-binding-unavailable");
    if (this.initialVersion !== this.context.version()) throw new Error("collaboration-source-changed-during-mount");
    this.binding = binding; this.context.accepted(binding.state().doc);
  }

  /** Refreshes source-owner permission without changing content or local selection. */
  refresh(): void { this.binding?.refresh(); }

  /** @param transaction - Final accepted local changes. @param apply - Canonical editor commit. */
  commit(transaction: Transaction, apply: () => void): void {
    if (this.disposed || !this.binding) throw new Error("collaboration-binding-unavailable");
    if (transaction.docChanged && !this.writable) throw new Error("collaboration-readonly");
    this.context.history.capture(transaction, () => {
      if (!transaction.docChanged) { apply(); return; }
      const origin = transaction.annotation(Transaction.addToHistory) === false ? this.context.untrackedOrigin : this.context.origin;
      this.context.document.transact(() => {
        try { writeChanges(this.context.text, transaction.changes); apply(); this.context.accepted(transaction.newDoc); }
        catch (error) { this.fault(error); throw error; }
      }, origin);
    });
  }

  /** @param error - Consistency failure requiring explicit recovery. */
  fault(error: unknown): void { this.context.fault(error); }

  /** @param notify - Accepted observations; disposal invalidates delayed callbacks in core. */
  publish(notify: () => void): void { this.context.publish(notify); }

  /** Releases only editor observers, preserving the document and undo identity. */
  release(): void {
    if (this.disposed) return;
    this.disposed = true; this.binding = undefined;
    this.context.text.unobserve(this.receive); this.context.history.manager.stopCapturing(); this.context.released();
  }

  /** @param event - Shared text delta. @param transaction - CRDT origin and integration boundary. */
  private readonly receive = (event: YTextEvent, transaction: YTransaction): void => {
    if (this.disposed || transaction.origin === this.context.origin || transaction.origin === this.context.untrackedOrigin) return;
    if (!this.binding) return;
    try {
      const changes = readChanges(event);
      const selection = transaction.origin === this.context.history.manager ? resolveSelection(this.context.text, this.context.history.restoring) : undefined;
      this.binding.dispatch({ changes, ...(selection ? { selection } : {}), origin: transaction.origin === this.context.history.manager ? "history" : "remote" });
      this.context.accepted(this.binding.state().doc);
    } catch (error) { this.fault(error); throw error; }
  };
}
