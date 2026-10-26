import { Compartment, Prec, EditorState, Transaction, type Extension } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { changeOrigin } from "../state/fields";
import type { MsfeSourceLease } from "./types";

/** Enforces source provenance at the final dispatch boundary, including raw CM dispatch. */
export class SourceRuntime {
  private readonly permission = new Compartment();
  private readonly projections = new WeakSet<Transaction>();
  private disposed = false;
  private failed = false;
  private committing = 0;
  private readonly notifications: (() => void)[] = [];

  /** @param lease - Optional external source owner. */
  constructor(readonly lease: MsfeSourceLease | undefined) {}

  /** @returns Whether local writes must be blocked by the source owner. */
  get blocked(): boolean { return this.disposed || this.failed || this.lease?.writable === false; }

  /** @returns Provider state and effective readOnly configuration. */
  extensions(): Extension { return [this.lease?.extensions ?? [], this.permission.of(this.permissionExtensions())]; }

  /** @param view - Canonical CM owner. @param notify - Availability publisher. */
  attach(view: EditorView, notify: () => void): void {
    this.lease?.attach({ state: () => view.state, dispatch: update => {
      if (this.disposed || this.failed) throw new Error("source-binding-released");
      const transaction = view.state.update({ ...(update.changes ? { changes: update.changes } : {}),
        ...(update.selection ? { selection: update.selection } : {}), filter: false,
        annotations: [changeOrigin.of(update.origin), Transaction.addToHistory.of(false)] });
      this.projections.add(transaction);
      try { view.dispatch(transaction); } finally { this.projections.delete(transaction); }
    }, refresh: () => {
      if (this.disposed) return;
      view.dispatch({ effects: this.permission.reconfigure(this.permissionExtensions()) }); notify();
    } });
  }

  /** @param transaction - Candidate reduced state. @param apply - Accepted state commit. @returns Whether the transaction was accepted. */
  commit(transaction: Transaction, apply: () => void): boolean {
    if (this.disposed || (this.failed && transaction.docChanged)) return false;
    const projection = this.projections.has(transaction);
    if (transaction.docChanged && !projection && (transaction.startState.readOnly || this.blocked)) return false;
    // Force reducer validation before the provider changes its canonical representation.
    void transaction.state;
    this.committing++;
    try {
      if (this.lease && !projection && !this.failed) {
        let applied = false;
        this.lease.commit(transaction, () => { if (applied) throw new Error("source-commit-repeated"); applied = true; apply(); });
        if (!applied) throw new Error("source-commit-missing");
      } else apply();
      return true;
    } catch (error) {
      this.notifications.length = 0; this.failed = true; this.lease?.fault(error); throw error;
    } finally { this.committing--; }
  }

  /** @param notify - Business notifications, permitted to initiate another command. */
  publish(notify: () => void): void {
    if (this.disposed) return;
    this.notifications.push(notify);
    // A synchronous transport may deliver a peer's reply during this editor's local commit.
    // Root already queued each accepted event; release them only after the outer commit returns.
    if (this.committing) return;
    const pending = this.notifications.splice(0);
    const guarded = () => { for (const publish of pending) { if (this.disposed) break; publish(); } };
    if (this.lease?.publish) this.lease.publish(guarded); else guarded();
  }

  /** Releases the capability and editor lease once. */
  destroy(): void { if (this.disposed) return; this.disposed = true; this.notifications.length = 0; this.lease?.release(); }

  /** @returns High-priority restrictions only; an allowed provider cannot override host readOnly. */
  private permissionExtensions(): Extension {
    return this.blocked ? Prec.highest([EditorState.readOnly.of(true), EditorView.editable.of(false)]) : [];
  }
}
